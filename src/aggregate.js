/**
 * Commit Aggregation
 * 
 * Processes raw commit data into structured format for visualization.
 */

/**
 * Aggregate commits by date and year
 */
export function aggregateCommits(commits) {
  const byDate = {};      // "2025-01-13" -> count
  const byYear = {};      // "2025" -> { "2025-01-13" -> count, ... }
  const repoSet = new Set();
  
  for (const commit of commits) {
    // Parse date in UTC
    const date = new Date(commit.date);
    const dateKey = date.toISOString().split('T')[0]; // "2025-01-13"
    const year = dateKey.substring(0, 4);
    
    // Count by date
    byDate[dateKey] = (byDate[dateKey] || 0) + 1;
    
    // Organize by year
    if (!byYear[year]) {
      byYear[year] = {};
    }
    byYear[year][dateKey] = (byYear[year][dateKey] || 0) + 1;
    
    // Track repos
    repoSet.add(commit.repo);
  }
  
  // Calculate year totals
  const yearTotals = {};
  for (const year of Object.keys(byYear)) {
    yearTotals[year] = Object.values(byYear[year]).reduce((a, b) => a + b, 0);
  }
  
  // Find max commits in a single day (for color scaling)
  const maxDaily = Math.max(...Object.values(byDate), 0);
  
  return {
    byDate,
    byYear,
    yearTotals,
    maxDaily,
    repoCount: repoSet.size,
    years: Object.keys(byYear).sort((a, b) => b - a) // Descending
  };
}

/**
 * Generate contribution level (0-4) based on commit count
 * Uses quartile-based scaling similar to GitHub
 */
export function getContributionLevel(count, maxDaily) {
  if (count === 0) return 0;
  if (maxDaily <= 4) {
    // For low-activity users, use absolute thresholds
    if (count >= 4) return 4;
    if (count >= 3) return 3;
    if (count >= 2) return 2;
    return 1;
  }
  
  // For active users, use relative thresholds
  const ratio = count / maxDaily;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

/**
 * Generate calendar data for a year
 * Returns an array of weeks, each containing 7 days
 */
export function generateYearCalendar(year, byYear, maxDaily) {
  const yearData = byYear[year] || {};
  const weeks = [];
  
  // Start from the first day of the year
  const startDate = new Date(Date.UTC(parseInt(year), 0, 1));
  const endDate = new Date(Date.UTC(parseInt(year), 11, 31));
  
  // Adjust to start from Sunday
  const firstDayOfWeek = startDate.getUTCDay();
  startDate.setUTCDate(startDate.getUTCDate() - firstDayOfWeek);
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate || currentDate.getUTCDay() !== 0) {
    const week = [];
    
    for (let day = 0; day < 7; day++) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const currentYear = currentDate.getUTCFullYear().toString();
      const count = (currentYear === year) ? (yearData[dateKey] || 0) : 0;
      const inYear = currentYear === year;
      
      week.push({
        date: dateKey,
        count,
        level: inYear ? getContributionLevel(count, maxDaily) : -1,
        inYear
      });
      
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    
    weeks.push(week);
    
    // Stop after we've passed the end of the year
    if (currentDate.getUTCFullYear() > parseInt(year)) {
      break;
    }
  }
  
  return weeks;
}
