# Git History Timeline

Visualize your complete GitHub contribution history across all repositories and branches.

[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

## What It Does

GitHub's profile shows contributions from default branches only. This tool shows **everything**—every commit from every repository and every branch you've ever touched.

- All branches, not just main/master
- Private repositories you own or collaborate on
- Contributions to open source projects
- Historical data going back years
- Self-contained HTML you can share or embed

## Quick Start

```bash
git clone https://github.com/kibotu/git-history-timeline.git
cd git-history-timeline
npm install
echo "GITHUB_TOKEN=ghp_your_token_here" > .env
./run.sh
```

Your timeline opens automatically.

## Installation

**Requirements:**
- Node.js 18 or later
- GitHub Personal Access Token

**1. Get a GitHub Token**

Visit [github.com/settings/tokens/new](https://github.com/settings/tokens/new) and create a token with:
- `repo` — Access to private repositories
- `read:user` — Read user profile data

**2. Configure**

```bash
echo "GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" > .env
```

**3. Run**

```bash
./run.sh
```

The tool fetches your commit history and generates `dist/index.html`.

## Usage

### Basic

```bash
./run.sh
```

Generates two files:
- `dist/index.html` — Full page with theme toggle
- `dist/index-embed.html` — Embeddable version

### Options

```bash
./run.sh --user octocat              # Different user
./run.sh --repos owned               # Only repos you own
./run.sh --repos forks               # Only forked repos
./run.sh --repos contributions       # Only external contributions
./run.sh --cached                    # Use cached data, skip API calls
./run.sh --refresh                   # Force full refresh
./run.sh --no-open                   # Don't open browser
```

### Repository Filters

| Filter | Description |
|--------|-------------|
| `all` | Everything (default) |
| `owned` | Repos you own, excluding forks |
| `forks` | Only forked repositories |
| `contributions` | Only commits to repos you don't own |

### Caching

First run fetches everything. Subsequent runs only fetch updated repositories.

```bash
./run.sh          # First run: ~5 min for large accounts
./run.sh          # Second run: ~30 sec (incremental)
./run.sh --refresh # Force full refresh
./run.sh --cached  # Use cached data, skip all API calls
```

Cache stored in `.cache/commits.json`.

## Embedding

The embed version (`index-embed.html`) is designed for portfolios, documentation, and websites.

**Basic iframe:**

```html
<iframe 
  src="https://yourusername.github.io/git-history-timeline/index-embed.html" 
  width="100%" 
  height="800" 
  frameborder="0"
  style="border: 1px solid #30363d; border-radius: 6px;">
</iframe>
```

**With auto-height:**

```html
<iframe 
  id="timeline"
  src="https://yourusername.github.io/git-history-timeline/index-embed.html" 
  width="100%" 
  frameborder="0">
</iframe>

<script>
  window.addEventListener('message', function(event) {
    if (event.data.type === 'resize') {
      document.getElementById('timeline').style.height = event.data.height + 'px';
    }
  });
</script>
```

**Theme control:**

```html
<!-- Light theme -->
<iframe src="...?theme=light"></iframe>

<!-- Dark theme -->
<iframe src="...?theme=dark"></iframe>

<!-- Auto (system preference) -->
<iframe src="..."></iframe>
```

### Embed vs Full Version

| Feature | Full | Embed |
|---------|------|-------|
| Contribution timeline | ✓ | ✓ |
| Statistics | ✓ | ✓ |
| Interactive tooltips | ✓ | ✓ |
| Dark/light themes | ✓ | ✓ |
| Theme toggle button | ✓ | — |
| Header text | ✓ | — |
| Footer | ✓ | — |
| Auto-height via postMessage | — | ✓ |
| Theme via URL parameter | — | ✓ |

## How It Works

1. Authenticate with GitHub API
2. Fetch all accessible repositories
3. For each repository, list all branches
4. For each branch, fetch commits authored by you
5. Search for external contributions (merged PRs)
6. Deduplicate commits by SHA
7. Aggregate by date
8. Render contribution matrices by year
9. Output self-contained HTML

**API Usage:**
- GitHub REST API v3
- Respects rate limits with exponential backoff
- Processes repositories in parallel (5 concurrent)
- Caches responses for subsequent runs

**Performance:**

| Account Size | Time Estimate |
|--------------|---------------|
| < 50 repos | ~30 seconds |
| 50-200 repos | 1-3 minutes |
| 200+ repos | 3-10 minutes |

Subsequent runs are faster due to incremental caching.

## Deployment

### GitHub Pages

**1. Enable GitHub Pages**

Go to Settings → Pages → Build and deployment → Source: **GitHub Actions**

**2. Add Token Secret**

Go to Settings → Secrets and variables → Actions → New repository secret:
- Name: `GH_TIMELINE_TOKEN`
- Value: Your GitHub Personal Access Token

**3. Create Workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    tags:
      - '[0-9]+.[0-9]+.[0-9]+'
      - '[0-9]+.[0-9]+.[0-9]+-*'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - run: npm ci
      
      - name: Generate timeline
        env:
          GITHUB_TOKEN: ${{ secrets.GH_TIMELINE_TOKEN }}
        run: node src/index.js
        
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**4. Deploy**

```bash
git tag 1.0.0
git push origin 1.0.0
```

Your timeline will be live at `https://username.github.io/repository-name/`

**Note:** Use semantic versioning **without** `v` prefix: `1.0.0`, not `v1.0.0`.

## Troubleshooting

**"Error: GITHUB_TOKEN not found"**

Create `.env` file:
```bash
echo "GITHUB_TOKEN=ghp_your_token_here" > .env
```

**"Error: Bad credentials"**

Token expired or invalid. [Generate a new one](https://github.com/settings/tokens/new).

**"Rate limit exceeded"**

The tool handles rate limits automatically. For very large accounts, use `--cached` to skip API calls.

**"Missing commits"**

Ensure your token has `repo` scope for private repositories. Organization repositories may require additional permissions.

**Empty or incomplete results**

- Verify token scopes are correct
- Check that repositories are accessible with your token
- Try `--refresh` to bypass cache

## License

MIT © [kibotu](https://github.com/kibotu)

---

Built with the GitHub REST API. Every commit counts.
