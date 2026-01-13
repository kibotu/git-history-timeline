# Git History Timeline

> Visualize your complete GitHub contribution history across all repositories and branches.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

<p align="center">
  <img src="docs/preview.png" alt="Git History Timeline Preview" width="800">
</p>

---

## What It Does

Generates a beautiful, GitHub-style contribution timeline showing **every commit** from **every repository** and **every branch** for a GitHub user. Unlike GitHub's profile, this includes:

- ✅ All branches (not just default branch)
- ✅ Private repositories
- ✅ Historical data going back years
- ✅ Self-contained HTML file you can share

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/kibotu/git-history-timeline.git
cd git-history-timeline

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env and add your GitHub token

# 4. Run
./run.sh
```

Your timeline opens automatically in the browser.

---

## Requirements

- **Node.js 18+** (uses native fetch)
- **GitHub Personal Access Token** with `repo` and `read:user` scopes

---

## Configuration

### Creating a GitHub Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens/new)
2. Create a new token with these scopes:
   - `repo` — Full control of private repositories
   - `read:user` — Read user profile data
3. Copy the token

### Setting Up `.env`

```bash
cp .env.example .env
```

Edit `.env`:

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Usage

### Basic Usage

```bash
./run.sh
```

This will:
1. Fetch all repositories you have access to
2. Retrieve commits from all branches
3. Generate `dist/index.html`
4. Open it in your browser

### Options

```bash
# Specify a different user (requires appropriate access)
./run.sh --user octocat

# Filter by repository type
./run.sh --repos owned          # Only repos you own (no forks)
./run.sh --repos forks          # Only forked repositories
./run.sh --repos contributions  # Only external contributions (PRs to other repos)
./run.sh --repos all            # Everything (default)

# Skip opening browser
./run.sh --no-open

# Use full cache (skip all API calls, use last run's data)
./run.sh --cached

# Force full refresh (ignore incremental cache)
./run.sh --refresh

# Combine options
./run.sh --repos owned --no-open
```

### Incremental Caching

The tool caches repository data to speed up subsequent runs:

- First run fetches all repositories and commits
- Subsequent runs only fetch repos that have new pushes
- Cache stored in `.cache/repos.json`

```bash
# First run: fetches everything (~5 min for large accounts)
./run.sh

# Second run: only fetches updated repos (~30 sec)
./run.sh

# Force complete refresh
./run.sh --refresh
```

### Repository Filters

| Filter | Description |
|--------|-------------|
| `all` | All repos + external contributions (default) |
| `owned` | Repositories you own, excluding forks |
| `forks` | Only repositories you forked from others |
| `contributions` | Only commits to repos you don't own (merged PRs) |

---

## Output

A single, self-contained `dist/index.html` file containing:

- Year-by-year contribution matrices
- Total commit counts
- Interactive tooltips
- Dark/light theme toggle
- Zero external dependencies

Share it, host it, or keep it local — it's just one file.

---

## How It Works

```
1. Authenticate with GitHub API
2. Fetch all accessible repositories
3. For each repo, list all branches
4. For each branch, fetch commits authored by you
5. Deduplicate commits (same commit appears on multiple branches)
6. Aggregate by date
7. Render contribution matrices by year
8. Output static HTML
```

### API Usage

- Uses GitHub REST API v3
- Respects rate limits with exponential backoff
- Caches responses to speed up subsequent runs
- Processes repositories in parallel (5 concurrent)

---

## Project Structure

```
git-history-timeline/
├── src/
│   ├── fetch.js          # GitHub API client
│   ├── aggregate.js      # Commit processing
│   └── render.js         # HTML generation
├── templates/
│   └── index.html        # HTML template
├── dist/
│   └── index.html        # Generated output
├── spec/
│   └── SPEC.md           # Technical specification
├── .env.example          # Example configuration
├── package.json
├── run.sh                # Easy run script
└── README.md
```

---

## Troubleshooting

### "Error: GITHUB_TOKEN not found"

Make sure you've created a `.env` file with your token:

```bash
cp .env.example .env
# Then edit .env and add your token
```

### "Error: Bad credentials"

Your token may have expired or been revoked. [Generate a new one](https://github.com/settings/tokens/new).

### "Rate limit exceeded"

The tool automatically handles rate limits, but for very large accounts, you may need to wait. Run with `--cached` to use previously fetched data.

### "Missing commits"

Ensure your token has the `repo` scope for private repositories. Commits from organizations may require additional permissions.

---

## Performance

| Account Size | Time Estimate |
|--------------|---------------|
| < 50 repos | ~30 seconds |
| 50-200 repos | 1-3 minutes |
| 200+ repos | 3-10 minutes |

Subsequent runs are faster due to caching.

---

## Related Projects

- [GitHub Contributions Chart Generator](https://github.com/sallar/github-contributions-chart) — Similar concept, different approach
- [git-stats](https://github.com/IonicaBizau/git-stats) — Local git statistics

---

## License

MIT © [kibotu](https://github.com/kibotu)

---

## Acknowledgments

Built with the GitHub REST API. Inspired by GitHub's contribution graph and the desire to see the complete picture.

---

<p align="center">
  <i>Keep shipping. Every commit counts.</i>
</p>
