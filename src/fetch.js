/**
 * GitHub API Fetching
 * 
 * Handles all communication with the GitHub REST API.
 * Implements rate limiting, pagination, and error handling.
 * 
 * Uses two strategies to find ALL commits:
 * 1. /user/repos - Repos you own or have access to (all branches)
 * 2. /search/commits - All public repos you've contributed to
 * 
 * Includes incremental caching to avoid refetching unchanged repos.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '..', '.cache');
const REPO_CACHE_FILE = join(CACHE_DIR, 'repos.json');

const API_BASE = 'https://api.github.com';
const MAX_CONCURRENT = 5;
const COMMITS_PER_PAGE = 100;
const SEARCH_DELAY_MS = 2500; // Search API has stricter rate limits (30/min)

/**
 * Load cached repository data
 */
function loadRepoCache() {
  if (existsSync(REPO_CACHE_FILE)) {
    try {
      return JSON.parse(readFileSync(REPO_CACHE_FILE, 'utf-8'));
    } catch {
      return { repos: {}, commits: [], lastSearchDate: null };
    }
  }
  return { repos: {}, commits: [], lastSearchDate: null };
}

/**
 * Save repository cache
 */
function saveRepoCache(cache) {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  writeFileSync(REPO_CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Make an authenticated request to the GitHub API
 */
async function githubFetch(endpoint, token, retries = 3) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'git-history-timeline'
      }
    });

    // Handle rate limiting
    if (response.status === 403 || response.status === 429) {
      const resetTime = response.headers.get('x-ratelimit-reset');
      const remaining = response.headers.get('x-ratelimit-remaining');
      
      if (remaining === '0' && resetTime) {
        const waitMs = (parseInt(resetTime) * 1000) - Date.now() + 1000;
        const waitMins = Math.ceil(waitMs / 60000);
        console.log(`\n⏳ Rate limited. Waiting ${waitMins} minutes...`);
        await sleep(waitMs);
        continue;
      }
      
      // Secondary rate limit - exponential backoff
      const backoff = Math.pow(2, attempt) * 1000;
      console.log(`   Rate limited, retrying in ${backoff/1000}s...`);
      await sleep(backoff);
      continue;
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error (${response.status}): ${error}`);
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}

/**
 * Fetch all pages of a paginated endpoint
 */
async function fetchAllPages(endpoint, token) {
  const items = [];
  let url = `${API_BASE}${endpoint}`;
  
  while (url) {
    const response = await githubFetch(url, token);
    const data = await response.json();
    items.push(...data);
    
    // Check for next page
    const link = response.headers.get('link');
    url = null;
    if (link) {
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      if (match) {
        url = match[1];
      }
    }
  }
  
  return items;
}

/**
 * Process items in parallel with concurrency limit
 */
async function processInParallel(items, fn, concurrency = MAX_CONCURRENT) {
  const results = [];
  const executing = new Set();
  
  for (const item of items) {
    const promise = fn(item).then(result => {
      executing.delete(promise);
      return result;
    });
    
    executing.add(promise);
    results.push(promise);
    
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search for commits by author across all public repositories
 * This catches contributions to repos you don't own/have access to
 */
async function searchCommitsByAuthor(username, token, commitMap, repoSet) {
  console.log('\n🔍 Searching for contributions to other repositories...');
  
  let page = 1;
  let totalFound = 0;
  let newCommits = 0;
  
  // Search API returns max 1000 results, paginated at 100/page
  while (page <= 10) {
    try {
      // Rate limit: 30 requests/minute for search API
      if (page > 1) {
        await sleep(SEARCH_DELAY_MS);
      }
      
      const response = await githubFetch(
        `/search/commits?q=author:${username}&sort=author-date&order=desc&per_page=100&page=${page}`,
        token
      );
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        break;
      }
      
      totalFound = data.total_count;
      
      for (const item of data.items) {
        if (!commitMap.has(item.sha)) {
          commitMap.set(item.sha, {
            sha: item.sha,
            message: item.commit.message.split('\n')[0],
            date: item.commit.author.date,
            repo: item.repository.full_name,
            branch: 'unknown', // Search API doesn't include branch
            url: item.html_url
          });
          repoSet.add(item.repository.full_name);
          newCommits++;
        }
      }
      
      process.stdout.write(`\r   Searched ${page * 100} of ${Math.min(totalFound, 1000)} commits...`);
      
      // Check if we've got all results
      if (data.items.length < 100 || page * 100 >= totalFound) {
        break;
      }
      
      page++;
    } catch (err) {
      if (err.message.includes('422')) {
        // Search results exceeded - this is fine, we got what we could
        break;
      }
      console.log(`\n   ⚠️  Search error: ${err.message}`);
      break;
    }
  }
  
  process.stdout.write('\r' + ' '.repeat(60) + '\r');
  console.log(`✓ Found ${newCommits} additional commits from ${totalFound} total public contributions`);
  
  return newCommits;
}

/**
 * Fetch all commits for a user across all repos and branches
 * 
 * Strategy:
 * 1. Fetch repos you have access to (owned, member, collaborator)
 * 2. For each repo, fetch commits from ALL branches
 * 3. Use Search API to find contributions to repos you don't have access to
 * 
 * Uses incremental caching - only fetches repos that have been updated since last run.
 * 
 * @param {string} token - GitHub API token
 * @param {string|null} targetUser - Username to fetch for (null = authenticated user)
 * @param {string} repoFilter - Filter: 'all', 'owned', 'forks', 'contributions'
 * @param {boolean} forceRefresh - If true, ignore cache and fetch everything
 */
export async function fetchAllCommits(token, targetUser = null, repoFilter = 'all', forceRefresh = false) {
  // Get authenticated user info
  const userResponse = await githubFetch('/user', token);
  const user = await userResponse.json();
  const username = targetUser || user.login;
  
  const filterLabels = {
    all: 'all repositories',
    owned: 'owned repositories (no forks)',
    forks: 'forked repositories only',
    contributions: 'external contributions only'
  };
  
  console.log(`👤 Fetching commits for @${username}`);
  console.log(`📋 Filter: ${filterLabels[repoFilter]}`);
  
  // Load existing cache
  const cache = forceRefresh ? { repos: {}, commits: [], lastSearchDate: null } : loadRepoCache();
  
  // Collect all commits (deduplicated by SHA)
  const commitMap = new Map();
  const repoSet = new Set();
  
  // Pre-populate with cached commits
  if (!forceRefresh && cache.commits.length > 0) {
    console.log(`📦 Loaded ${cache.commits.length} cached commits`);
    for (const commit of cache.commits) {
      commitMap.set(commit.sha, commit);
      repoSet.add(commit.repo);
    }
  }
  
  // === PHASE 1: Repos you have access to (skip if contributions-only) ===
  if (repoFilter !== 'contributions') {
    console.log('\n📚 Phase 1: Loading your repositories...');
    const allRepos = await fetchAllPages('/user/repos?per_page=100&type=all&sort=updated', token);
    
    // Filter repos based on user preference
    let repos = allRepos;
    if (repoFilter === 'owned') {
      repos = allRepos.filter(repo => !repo.fork && repo.owner.login === username);
    } else if (repoFilter === 'forks') {
      repos = allRepos.filter(repo => repo.fork);
    }
    
    // Determine which repos need updating (based on pushed_at timestamp)
    const reposToUpdate = [];
    const cachedRepoCount = Object.keys(cache.repos).length;
    
    for (const repo of repos) {
      const cachedRepo = cache.repos[repo.full_name];
      const needsUpdate = !cachedRepo || 
                          cachedRepo.pushed_at !== repo.pushed_at ||
                          forceRefresh;
      
      if (needsUpdate) {
        reposToUpdate.push(repo);
      }
    }
    
    const skippedCount = repos.length - reposToUpdate.length;
    console.log(`   Found ${repos.length} repositories (${skippedCount} cached, ${reposToUpdate.length} to update)`);
  
    let processedRepos = 0;
    let newCommitsInPhase1 = 0;
    
    // Process only repos that need updating
    if (reposToUpdate.length > 0) {
      await processInParallel(reposToUpdate, async (repo) => {
        processedRepos++;
        const progress = `[${processedRepos}/${reposToUpdate.length}]`;
        
        try {
          // Get all branches
          const branches = await fetchAllPages(`/repos/${repo.full_name}/branches?per_page=100`, token);
          
          // Fetch commits from each branch
          for (const branch of branches) {
            try {
              const commits = await fetchAllPages(
                `/repos/${repo.full_name}/commits?sha=${encodeURIComponent(branch.name)}&per_page=${COMMITS_PER_PAGE}&author=${username}`,
                token
              );
              
              for (const commit of commits) {
                if (!commitMap.has(commit.sha)) {
                  commitMap.set(commit.sha, {
                    sha: commit.sha,
                    message: commit.commit.message.split('\n')[0], // First line only
                    date: commit.commit.author.date,
                    repo: repo.full_name,
                    branch: branch.name,
                    url: commit.html_url
                  });
                  repoSet.add(repo.full_name);
                  newCommitsInPhase1++;
                }
              }
            } catch (err) {
              // Skip branches we can't access
              if (!err.message.includes('409') && !err.message.includes('404')) {
                console.log(`   ⚠️  Skipping ${repo.name}/${branch.name}: ${err.message}`);
              }
            }
          }
          
          // Mark repo as cached with current pushed_at
          cache.repos[repo.full_name] = {
            pushed_at: repo.pushed_at,
            updated_at: new Date().toISOString()
          };
          
          process.stdout.write(`\r${progress} Processing: ${repo.name.padEnd(40)}`);
        } catch (err) {
          // Skip repos we can't access
          if (!err.message.includes('403') && !err.message.includes('404')) {
            console.log(`\n   ⚠️  Skipping ${repo.name}: ${err.message}`);
          }
        }
      });
      
      // Clear progress line
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
      console.log(`✓ Processed ${reposToUpdate.length} updated repositories`);
      console.log(`✓ Found ${newCommitsInPhase1} new commits`);
    }
    
    console.log(`✓ Total: ${commitMap.size} unique commits across ${repoSet.size} repos`);
  }
  
  // === PHASE 2: Search for external contributions (skip if owned or forks only) ===
  if (repoFilter === 'all' || repoFilter === 'contributions') {
    console.log('\n📚 Phase 2: Finding external contributions...');
    await searchCommitsByAuthor(username, token, commitMap, repoSet);
  }
  
  // Save updated cache
  const allCommits = Array.from(commitMap.values());
  cache.commits = allCommits;
  cache.lastUpdated = new Date().toISOString();
  saveRepoCache(cache);
  console.log(`\n💾 Saved cache (${Object.keys(cache.repos).length} repos, ${allCommits.length} commits)`);
  
  console.log(`\n✅ Total: ${commitMap.size} unique commits across ${repoSet.size} repositories`);
  
  return {
    username,
    commits: allCommits
  };
}
