/**
 * Extract commit data from index.html for the animated widget
 * Parses the HTML and creates a time-ordered array of all commits
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = join(__dirname, '..', 'dist', 'index.html');
const OUTPUT_FILE = join(__dirname, '..', 'dist', 'widget-data.json');

function extractCommitData() {
  console.log('📊 Extracting commit data from index.html...');
  
  const html = readFileSync(INPUT_FILE, 'utf-8');
  
  // Extract username
  const usernameMatch = html.match(/<title>Git History Timeline — @([^<]+)<\/title>/);
  const username = usernameMatch ? usernameMatch[1] : 'unknown';
  
  // Extract repository count (handles numbers with commas)
  const repoMatch = html.match(/<span class="stat-value">([0-9,]+)<\/span>\s*<span>repositories<\/span>/);
  const repoCount = repoMatch ? parseInt(repoMatch[1].replace(/,/g, '')) : 0;
  
  // Extract all day elements with data-date and data-tooltip attributes
  const dayPattern = /<div class="day level-(\d+)" data-tooltip="([^"]+)" data-date="([^"]+)"><\/div>/g;
  const commits = [];
  const dateMap = new Map();
  
  let match;
  while ((match = dayPattern.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const tooltip = match[2];
    const date = match[3];
    
    // Parse commit count from tooltip
    // Examples: "No commits on Jan 1, 2026", "1 commit on Jan 3, 2026", "25 commits on Jan 7, 2026"
    let count = 0;
    if (tooltip.startsWith('No commits')) {
      count = 0;
    } else {
      const countMatch = tooltip.match(/^(\d+) commit/);
      if (countMatch) {
        count = parseInt(countMatch[1]);
      }
    }
    
    // Store only if we haven't seen this date yet (avoid duplicates)
    if (!dateMap.has(date)) {
      dateMap.set(date, { date, count, level });
    }
  }
  
  // Convert map to sorted array
  const sortedCommits = Array.from(dateMap.values()).sort((a, b) => {
    return a.date.localeCompare(b.date);
  });
  
  console.log(`   Found ${sortedCommits.length} days with commit data`);
  console.log(`   Date range: ${sortedCommits[0]?.date} to ${sortedCommits[sortedCommits.length - 1]?.date}`);
  
  // Calculate statistics
  const totalCommits = sortedCommits.reduce((sum, day) => sum + day.count, 0);
  const daysWithCommits = sortedCommits.filter(day => day.count > 0).length;
  
  console.log(`   Total commits: ${totalCommits.toLocaleString()}`);
  console.log(`   Days with commits: ${daysWithCommits.toLocaleString()}`);
  
  // Fill in missing dates to create a complete timeline
  const startDate = new Date(sortedCommits[0].date + 'T00:00:00Z');
  const endDate = new Date(sortedCommits[sortedCommits.length - 1].date + 'T00:00:00Z');
  const completeTimeline = [];
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const existing = dateMap.get(dateStr);
    
    if (existing) {
      completeTimeline.push(existing);
    } else {
      // Fill in missing dates with zero commits
      completeTimeline.push({ date: dateStr, count: 0, level: 0 });
    }
    
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
  
  console.log(`   Complete timeline: ${completeTimeline.length} days`);
  
  // Prepare output data
  const output = {
    username,
    totalCommits,
    repoCount,
    daysWithCommits,
    startDate: completeTimeline[0].date,
    endDate: completeTimeline[completeTimeline.length - 1].date,
    totalDays: completeTimeline.length,
    commits: completeTimeline
  };
  
  // Write to file
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved widget data to: ${OUTPUT_FILE}`);
  
  return output;
}

// Run extraction
try {
  extractCommitData();
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
