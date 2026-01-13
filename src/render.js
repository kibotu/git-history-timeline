/**
 * HTML Rendering
 * 
 * Generates the contribution timeline HTML.
 */

import { generateYearCalendar } from './aggregate.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Generate the complete HTML page
 */
export function renderTimeline({ username, commits, totalCommits, repoCount }) {
  const years = commits.years;
  
  // Generate year sections
  const yearSections = years.map(year => renderYear(year, commits)).join('\n');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <title>Git History Timeline — @${username}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --text-primary: #f0f6fc;
      --text-secondary: #8b949e;
      --text-muted: #6e7681;
      --border-color: #30363d;
      --accent: #58a6ff;
      --accent-glow: rgba(88, 166, 255, 0.3);
      
      /* Contribution colors - high contrast for dark mode */
      --level-0: #2d333b;
      --level-1: #0e4429;
      --level-2: #006d32;
      --level-3: #26a641;
      --level-4: #39d353;
      
      --cell-size: 10px;
      --cell-gap: 3px;
      --border-radius: 2px;
    }

    [data-theme="light"] {
      --bg-primary: #ffffff;
      --bg-secondary: #f6f8fa;
      --bg-tertiary: #eaeef2;
      --text-primary: #1f2328;
      --text-secondary: #656d76;
      --text-muted: #57606a;
      --border-color: #d0d7de;
      --accent: #0969da;
      --accent-glow: rgba(9, 105, 218, 0.2);
      
      /* Contribution colors - matches GitHub exactly */
      --level-0: #ebedf0;
      --level-1: #9be9a8;
      --level-2: #40c463;
      --level-3: #30a14e;
      --level-4: #216e39;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }

    /* Background pattern */
    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 20% 20%, var(--accent-glow) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(46, 160, 67, 0.15) 0%, transparent 50%);
      pointer-events: none;
      z-index: -1;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Header */
    header {
      text-align: center;
      padding: 3rem 0 4rem;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 3rem;
      position: relative;
    }

    .logo {
      font-size: 3rem;
      margin-bottom: 0.5rem;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .username {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.25rem;
      color: var(--accent);
      margin-bottom: 1rem;
    }

    .stats {
      display: flex;
      justify-content: center;
      gap: 2rem;
      color: var(--text-secondary);
      font-size: 1rem;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stat-value {
      font-weight: 600;
      color: var(--text-primary);
      font-family: 'JetBrains Mono', monospace;
    }

    /* Theme toggle */
    .theme-toggle {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.5rem;
      cursor: pointer;
      color: var(--text-secondary);
      font-size: 1.25rem;
      transition: all 0.2s ease;
    }

    .theme-toggle:hover {
      color: var(--text-primary);
      border-color: var(--accent);
    }

    /* Timeline */
    .timeline {
      position: relative;
      padding-left: 2rem;
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(
        to bottom,
        var(--accent),
        var(--level-4),
        var(--level-3),
        var(--level-2),
        var(--border-color)
      );
      border-radius: 1px;
    }

    /* Year section */
    .year-section {
      margin-bottom: 4rem;
      position: relative;
    }

    .year-marker {
      position: absolute;
      left: -2rem;
      transform: translateX(-50%);
      width: 12px;
      height: 12px;
      background: var(--bg-primary);
      border: 2px solid var(--accent);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--accent-glow);
    }

    .year-header {
      display: flex;
      align-items: baseline;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .year-title {
      font-size: 2rem;
      font-weight: 600;
      color: var(--text-primary);
      font-family: 'JetBrains Mono', monospace;
    }

    .year-count {
      font-size: 1rem;
      color: var(--text-secondary);
    }

    /* Contribution graph */
    .graph-container {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      overflow-x: auto;
      display: inline-block;
      max-width: 100%;
    }

    .graph {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .months-row {
      display: flex;
      margin-left: 28px;
      gap: var(--cell-gap);
      margin-bottom: 4px;
    }

    .month-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }

    .graph-body {
      display: flex;
      gap: 0;
    }

    .day-labels {
      display: flex;
      flex-direction: column;
      gap: var(--cell-gap);
      margin-right: 4px;
      width: 24px;
      flex-shrink: 0;
    }

    .day-label {
      height: var(--cell-size);
      font-size: 0.65rem;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      align-items: center;
      visibility: hidden;
    }

    /* Only show Mon, Wed, Fri labels (indices 1, 3, 5) */
    .day-label:nth-child(2),
    .day-label:nth-child(4),
    .day-label:nth-child(6) {
      visibility: visible;
    }

    .weeks {
      display: flex;
      gap: var(--cell-gap);
    }

    .week {
      display: flex;
      flex-direction: column;
      gap: var(--cell-gap);
    }

    .day {
      width: var(--cell-size);
      height: var(--cell-size);
      border-radius: var(--border-radius);
      background: var(--level-0);
      cursor: pointer;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
      position: relative;
    }

    .day:hover {
      transform: scale(1.4);
      z-index: 10;
      box-shadow: 0 0 8px var(--accent-glow);
    }

    .day.outside {
      background: transparent;
      cursor: default;
    }

    .day.outside:hover {
      transform: none;
      box-shadow: none;
    }

    .day.level-1 { background: var(--level-1); }
    .day.level-2 { background: var(--level-2); }
    .day.level-3 { background: var(--level-3); }
    .day.level-4 { background: var(--level-4); }

    /* Tooltip */
    .day::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-tertiary);
      color: var(--text-primary);
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
      border: 1px solid var(--border-color);
      z-index: 100;
    }

    .day:hover::after {
      opacity: 1;
    }

    .day.outside::after {
      display: none;
    }

    /* Legend */
    .legend {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.35rem;
      margin-top: 0.75rem;
      padding-left: 28px;
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .legend-cells {
      display: flex;
      gap: 2px;
    }

    .legend-cell {
      width: var(--cell-size);
      height: var(--cell-size);
      border-radius: var(--border-radius);
    }

    /* Footer */
    footer {
      text-align: center;
      padding: 3rem 0;
      color: var(--text-muted);
      font-size: 0.875rem;
      border-top: 1px solid var(--border-color);
      margin-top: 2rem;
    }

    footer a {
      color: var(--accent);
      text-decoration: none;
    }

    footer a:hover {
      text-decoration: underline;
    }

    /* Responsive - Tablet */
    @media (max-width: 900px) {
      .container {
        padding: 1rem;
      }

      header {
        padding: 2rem 0;
      }

      h1 {
        font-size: 1.75rem;
      }

      .stats {
        gap: 1rem;
      }

      .timeline {
        padding-left: 1rem;
      }

      .year-title {
        font-size: 1.5rem;
      }
    }

    /* Responsive - Mobile */
    @media (max-width: 600px) {
      :root {
        --cell-size: 8px;
        --cell-gap: 2px;
      }

      .container {
        padding: 0.75rem;
      }

      header {
        padding: 1.5rem 0;
      }

      .logo {
        font-size: 2rem;
      }

      h1 {
        font-size: 1.5rem;
      }

      .username {
        font-size: 1rem;
      }

      .stats {
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.875rem;
      }

      .theme-toggle {
        top: 0.5rem;
        right: 0.5rem;
        padding: 0.35rem;
        font-size: 1rem;
      }

      .timeline {
        padding-left: 0.75rem;
      }

      .timeline::before {
        left: -0.25rem;
      }

      .year-marker {
        left: -0.75rem;
        width: 8px;
        height: 8px;
      }

      .year-section {
        margin-bottom: 2rem;
      }

      .year-header {
        flex-direction: column;
        gap: 0.25rem;
        margin-bottom: 1rem;
      }

      .year-title {
        font-size: 1.25rem;
      }

      .year-count {
        font-size: 0.875rem;
      }

      .graph-container {
        padding: 0.75rem;
        border-radius: 8px;
      }

      .day-labels {
        width: 18px;
        margin-right: 2px;
      }

      .day-label {
        font-size: 0.55rem;
      }

      .months-row {
        margin-left: 20px;
      }

      .month-label {
        font-size: 0.6rem;
      }

      .legend {
        font-size: 0.65rem;
        gap: 0.25rem;
      }

      footer {
        padding: 1.5rem 0;
        font-size: 0.75rem;
      }
    }

    /* Extra small screens */
    @media (max-width: 380px) {
      :root {
        --cell-size: 6px;
        --cell-gap: 1px;
      }

      .day-labels {
        display: none;
      }

      .months-row {
        margin-left: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme">
        🌙
      </button>
      <div class="logo">📊</div>
      <h1>Git History Timeline</h1>
      <div class="username">@${username}</div>
      <div class="stats">
        <div class="stat">
          <span class="stat-value">${totalCommits.toLocaleString()}</span>
          <span>commits</span>
        </div>
        <div class="stat">
          <span class="stat-value">${repoCount}</span>
          <span>repositories</span>
        </div>
        <div class="stat">
          <span class="stat-value">${years.length}</span>
          <span>years</span>
        </div>
      </div>
    </header>

    <div class="timeline">
      ${yearSections}
    </div>

    <footer>
      <p>Generated by <a href="https://github.com/kibotu/git-history-timeline">git-history-timeline</a></p>
      <p>Every commit counts. Keep shipping. 🚀</p>
    </footer>
  </div>

  <script>
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      document.querySelector('.theme-toggle').textContent = next === 'light' ? '☀️' : '🌙';
      localStorage.setItem('theme', next);
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      document.querySelector('.theme-toggle').textContent = savedTheme === 'light' ? '☀️' : '🌙';
    }
  </script>
</body>
</html>`;
}

/**
 * Render a single year section
 */
function renderYear(year, commits) {
  const calendar = generateYearCalendar(year, commits.byYear, commits.maxDaily);
  const yearTotal = commits.yearTotals[year] || 0;
  
  // Generate month labels
  const monthLabels = generateMonthLabels(calendar, year);
  
  // Generate weeks
  const weeksHtml = calendar.map(week => {
    const daysHtml = week.map(day => {
      if (!day.inYear) {
        return '<div class="day outside"></div>';
      }
      
      const tooltip = day.count === 0
        ? `No commits on ${formatDate(day.date)}`
        : `${day.count} commit${day.count === 1 ? '' : 's'} on ${formatDate(day.date)}`;
      
      return `<div class="day level-${day.level}" data-tooltip="${tooltip}" data-date="${day.date}"></div>`;
    }).join('');
    
    return `<div class="week">${daysHtml}</div>`;
  }).join('');
  
  // Day labels
  const dayLabelsHtml = DAYS.map(d => `<div class="day-label">${d}</div>`).join('');

  return `
    <div class="year-section">
      <div class="year-marker"></div>
      <div class="year-header">
        <span class="year-title">${year}</span>
        <span class="year-count">${yearTotal.toLocaleString()} commits</span>
      </div>
      <div class="graph-container">
        <div class="graph">
          <div class="months-row">${monthLabels}</div>
          <div class="graph-body">
            <div class="day-labels">${dayLabelsHtml}</div>
            <div class="weeks">${weeksHtml}</div>
          </div>
        </div>
        <div class="legend">
          <span>Less</span>
          <div class="legend-cells">
            <div class="legend-cell" style="background: var(--level-0)"></div>
            <div class="legend-cell" style="background: var(--level-1)"></div>
            <div class="legend-cell" style="background: var(--level-2)"></div>
            <div class="legend-cell" style="background: var(--level-3)"></div>
            <div class="legend-cell" style="background: var(--level-4)"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>`;
}

/**
 * Generate month labels positioned above the correct weeks
 */
function generateMonthLabels(calendar, year) {
  const labels = [];
  let lastMonth = -1;
  
  calendar.forEach((week, weekIndex) => {
    // Find the first day of the year in this week
    const yearDay = week.find(d => d.inYear);
    if (yearDay) {
      const month = parseInt(yearDay.date.split('-')[1]) - 1;
      if (month !== lastMonth) {
        // Calculate approximate width for positioning
        const width = `calc(${weekIndex} * (var(--cell-size) + var(--cell-gap)))`;
        labels.push(`<span class="month-label" style="position: absolute; left: ${width}">${MONTHS[month]}</span>`);
        lastMonth = month;
      }
    }
  });
  
  // Wrap in relative container
  return `<div style="position: relative; height: 1rem; width: calc(${calendar.length} * (var(--cell-size) + var(--cell-gap)))">${labels.join('')}</div>`;
}

/**
 * Format date for tooltip
 */
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00Z');
  const month = MONTHS[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}
