/**
 * Git History Timeline
 * 
 * Fetches all commits from all repositories and branches for a GitHub user,
 * then generates a beautiful contribution timeline.
 */

import dotenv from 'dotenv';

// Load .env file, overriding any existing environment variables
dotenv.config({ override: true });
import { fetchAllCommits } from './fetch.js';
import { aggregateCommits } from './aggregate.js';
import { renderTimeline, renderTimelineEmbed } from './render.js';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = join(__dirname, '..', '.cache', 'commits.json');
const OUTPUT_FILE = join(__dirname, '..', 'dist', 'index.html');
const OUTPUT_EMBED_FILE = join(__dirname, '..', 'dist', 'index-embed.html');

// Parse command line arguments
const args = process.argv.slice(2);
const useCache = args.includes('--cached');
const forceRefresh = args.includes('--refresh');
const userIndex = args.indexOf('--user');
const targetUser = userIndex !== -1 ? args[userIndex + 1] : null;
const reposIndex = args.indexOf('--repos');
const repoFilter = reposIndex !== -1 ? args[reposIndex + 1] : 'all'; // all, owned, forks, contributions

async function main() {
  // Validate token
  const token = process.env.GITHUB_TOKEN;
  if (!token || token === 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    console.error('\x1b[31mError: GITHUB_TOKEN not configured\x1b[0m');
    console.error('\nAdd your GitHub token to .env:');
    console.error('  GITHUB_TOKEN=ghp_your_actual_token_here');
    console.error('\nGenerate a token at:');
    console.error('  https://github.com/settings/tokens/new');
    console.error('  (Select "repo" and "read:user" scopes)');
    process.exit(1);
  }

  let commits;
  let username;

  // Check cache
  if (useCache && existsSync(CACHE_FILE)) {
    console.log('📦 Loading from cache...');
    const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    commits = cached.commits;
    username = cached.username;
    console.log(`   Found ${commits.length} cached commits for @${username}`);
  } else {
    // Fetch fresh data
    console.log('🔍 Fetching commit history from GitHub...\n');
    
    const result = await fetchAllCommits(token, targetUser, repoFilter, forceRefresh);
    commits = result.commits;
    username = result.username;

    // Save to cache
    const cacheDir = dirname(CACHE_FILE);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
    writeFileSync(CACHE_FILE, JSON.stringify({ commits, username }, null, 2));
    console.log('\n💾 Cached commit data for faster reruns');
  }

  if (commits.length === 0) {
    console.log('\n⚠️  No commits found');
    console.log('   This could mean:');
    console.log('   - The account has no commits');
    console.log('   - The token lacks necessary permissions');
    console.log('   - Rate limits were exceeded');
  }

  // Aggregate by date
  console.log('\n📊 Aggregating commits by date...');
  const aggregated = aggregateCommits(commits);
  
  // Count total
  const totalCommits = commits.length;
  const totalYears = Object.keys(aggregated.byYear).length;
  console.log(`   ${totalCommits.toLocaleString()} commits across ${totalYears} years`);

  // Render HTML
  console.log('\n🎨 Generating timeline...');
  const renderData = {
    username,
    commits: aggregated,
    totalCommits,
    repoCount: aggregated.repoCount
  };
  
  const html = renderTimeline(renderData);
  const htmlEmbed = renderTimelineEmbed(renderData);

  // Write output
  const outputDir = dirname(OUTPUT_FILE);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  writeFileSync(OUTPUT_FILE, html);
  writeFileSync(OUTPUT_EMBED_FILE, htmlEmbed);
  
  console.log(`\n✅ Generated: dist/index.html`);
  console.log(`✅ Generated: dist/index-embed.html (embeddable version)`);
  
  // Note: Widget is built separately via run.sh or npm run widget
}

main().catch(err => {
  console.error('\x1b[31mError:\x1b[0m', err.message);
  if (err.message.includes('Bad credentials')) {
    console.error('\nYour token may have expired. Generate a new one at:');
    console.error('  https://github.com/settings/tokens/new');
  }
  process.exit(1);
});
