# Git History Timeline — Technical Specification

> A pragmatic approach to visualizing your GitHub contribution story across all repositories and branches.

## Overview

This tool fetches all commits from every repository and branch for a given GitHub user, then renders a beautiful, GitHub-style contribution timeline organized by year.

---

## Goals

1. **Complete History** — Capture commits from all repos and all branches, not just main/master
2. **Beautiful Visualization** — GitHub-style contribution matrix that feels familiar yet delightful
3. **Simple to Run** — Single command execution with minimal setup
4. **Respectful of API Limits** — Smart caching and rate limit handling

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         git-history-timeline                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐ │
│  │   .env       │───▶│  Fetcher     │───▶│  Static HTML/CSS/JS   │ │
│  │  (API Token) │    │  (Node.js)   │    │  (index.html)         │ │
│  └──────────────┘    └──────────────┘    └───────────────────────┘ │
│                             │                                       │
│                             ▼                                       │
│                      ┌──────────────┐                              │
│                      │  GitHub API  │                              │
│                      │  (REST v3)   │                              │
│                      └──────────────┘                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Authentication

```
.env file → GITHUB_TOKEN → Authorization: Bearer <token>
```

The token requires these scopes:
- `repo` — Access private repositories
- `read:user` — Read user profile data

### 2. API Sequence (Two-Phase Approach)

**Phase 1: Repositories You Have Access To**
```
Step 1: GET /user
        └─▶ Retrieve authenticated user info

Step 2: GET /user/repos?per_page=100&type=all
        └─▶ Paginate through ALL repositories (owned, member, collaborator)

Step 3: For each repository:
        GET /repos/{owner}/{repo}/branches?per_page=100
        └─▶ List ALL branches

Step 4: For each branch:
        GET /repos/{owner}/{repo}/commits?sha={branch}&per_page=100&author={username}
        └─▶ Fetch commits authored by the user
        └─▶ Deduplicate by commit SHA (branches share commits)
```

**Phase 2: External Contributions (PRs to other repos)**
```
Step 5: GET /search/commits?q=author:{username}&sort=author-date
        └─▶ Find commits in repos you don't have direct access to
        └─▶ Catches merged PRs to open source projects
        └─▶ Limited to 1000 results, public repos only
        └─▶ Deduplicate with Phase 1 results
```

This two-phase approach ensures we capture:
- ✅ All branches in your repos (not just default branch)
- ✅ Private repositories you own or collaborate on
- ✅ Contributions to open source projects via PRs

### 3. Data Aggregation

```javascript
{
  "2025": {
    "2025-01-13": 5,   // 5 commits on this day
    "2025-01-12": 2,
    // ... every day with commits
  },
  "2024": {
    // ...
  }
}
```

### 4. Output Generation

A single `index.html` file containing:
- Embedded CSS (no external dependencies)
- Embedded JavaScript for interactivity
- Pre-computed contribution data as JSON
- Year-by-year contribution matrices

---

## GitHub API Details

### Endpoints Used

| Endpoint | Purpose | Pagination | Rate Limit |
|----------|---------|------------|------------|
| `GET /user` | Get authenticated user | N/A | 5000/hr |
| `GET /user/repos` | List all accessible repos | 100/page, Link header | 5000/hr |
| `GET /repos/{owner}/{repo}/branches` | List all branches | 100/page, Link header | 5000/hr |
| `GET /repos/{owner}/{repo}/commits` | List commits on branch | 100/page, Link header | 5000/hr |
| `GET /search/commits` | Find external contributions | 100/page, max 1000 | 30/min |

### Rate Limiting Strategy

- **Authenticated requests**: 5,000/hour
- **Implement exponential backoff** on 403/429 responses
- **Cache responses** to avoid redundant fetches
- **Show progress** so users know it's working

### Handling Large Histories

For users with extensive histories:
1. Process repositories in parallel (max 5 concurrent)
2. Deduplicate commits by SHA immediately
3. Stream results to reduce memory pressure
4. Consider date-range filtering for initial load

---

## UI/UX Specification

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Git History Timeline                       │ │
│  │                      @username                                │ │
│  │               Total: 2,847 commits across 45 repos            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ────────────────────────── 2025 ──────────────────────────────── │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec   │ │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │  Mon ░▓░░▓▓░░░▓░░░░░░░░▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │  Wed ░░▓░░░▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │  Fri ░░░░▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                           247 commits                              │
│                                                                     │
│  ────────────────────────── 2024 ──────────────────────────────── │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  (contribution matrix for 2024)                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                           892 commits                              │
│                                                                     │
│  ... (continues for each year with activity)                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Contribution Matrix

GitHub-style grid with:
- **Columns**: 52-53 weeks per year
- **Rows**: 7 days (Sunday → Saturday)
- **Colors**: 5-level intensity scale (empty → light → medium → dark → darkest)
- **Tooltips**: "X commits on Month Day, Year"

### Color Palette

```css
/* Dark theme (default) */
--contribution-0: #161b22;  /* No contributions */
--contribution-1: #0e4429;  /* 1-2 commits */
--contribution-2: #006d32;  /* 3-5 commits */
--contribution-3: #26a641;  /* 6-9 commits */
--contribution-4: #39d353;  /* 10+ commits */

/* Light theme option */
--contribution-0: #ebedf0;
--contribution-1: #9be9a8;
--contribution-2: #40c463;
--contribution-3: #30a14e;
--contribution-4: #216e39;
```

### Interactivity

1. **Hover tooltips** — Show exact count and date
2. **Click to filter** — Optional: filter by repository
3. **Smooth scroll** — Navigate between years
4. **Theme toggle** — Dark/light mode

---

## File Structure

```
git-history-timeline/
├── spec/
│   └── SPEC.md              # This document
├── src/
│   ├── fetch.js             # GitHub API fetching logic
│   ├── aggregate.js         # Commit aggregation
│   └── render.js            # HTML generation
├── templates/
│   └── index.html           # HTML template
├── dist/
│   └── index.html           # Generated output
├── .env                     # GitHub token (git-ignored)
├── .env.example             # Example env file
├── .gitignore
├── package.json
├── run.sh                   # Easy execution script
└── README.md
```

---

## Implementation Notes

### Technology Choice: Node.js

Why Node.js:
- Native JSON handling
- Excellent async/await for API calls
- Simple templating with template literals
- No build step needed
- Works everywhere

### Key Libraries

```json
{
  "dependencies": {
    "dotenv": "^16.0.0"
  }
}
```

That's it. Native `fetch` (Node 18+) handles HTTP. Template literals handle HTML generation. Keep it simple.

### Commit Deduplication

Commits appear on multiple branches. Deduplicate by SHA:

```javascript
const commitMap = new Map(); // SHA → commit

for (const commit of commits) {
  if (!commitMap.has(commit.sha)) {
    commitMap.set(commit.sha, commit);
  }
}
```

### Date Handling

All dates in UTC to match GitHub's contribution graph behavior:

```javascript
const date = new Date(commit.commit.author.date);
const dateKey = date.toISOString().split('T')[0]; // "2025-01-13"
```

---

## Error Handling

| Scenario | Response |
|----------|----------|
| Missing token | Clear error message with setup instructions |
| Invalid token | "Token expired or invalid. Generate a new one at..." |
| Rate limited | Wait and retry with exponential backoff |
| Network error | Retry 3 times, then fail gracefully |
| Private repo access denied | Skip and continue (log warning) |
| Empty result | Generate page showing "No commits found" |

---

## Performance Considerations

### For Large Accounts (1000+ repos)

1. **Parallel fetching** — 5 concurrent requests
2. **Early termination** — Stop if no commits in date range
3. **Progress indicator** — Show "Processing repo X of Y"
4. **Caching** — Store fetched data in `.cache/` for reruns

### Expected Timing

| Account Size | Approximate Time |
|--------------|------------------|
| < 50 repos | ~30 seconds |
| 50-200 repos | 1-3 minutes |
| 200+ repos | 3-10 minutes |

---

## Security

1. **Never commit `.env`** — Already in `.gitignore`
2. **Token scope** — Request minimum necessary permissions
3. **No external requests** — Generated HTML is fully self-contained
4. **No tracking** — Zero analytics or external scripts

---

## Future Enhancements (Out of Scope for v1)

- [ ] Filter by repository
- [ ] Filter by date range
- [ ] Show commit messages on hover
- [ ] Export as image/PDF
- [ ] Compare multiple users
- [ ] Organization-level view

---

## Success Criteria

1. ✅ Fetches commits from ALL repos and ALL branches
2. ✅ Generates beautiful, responsive HTML
3. ✅ Runs with single `./run.sh` command
4. ✅ Handles rate limits gracefully
5. ✅ Works for accounts with 1000+ repos
6. ✅ Self-contained output (no external dependencies)

---

*Built with pragmatism and care. Keep it simple, make it work, make it beautiful.*
