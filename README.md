# Git History Timeline

Visualize your complete GitHub contribution history. Every commit, every branch, every repository.

[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

**[View Demo](https://kibotu.github.io/git-history-timeline/)** • **[Try Widget](dist/widget-demo.html)**

## Why

GitHub's profile shows contributions from default branches only. This shows **everything**.

## Quick Start

```bash
git clone https://github.com/kibotu/git-history-timeline.git
cd git-history-timeline
npm install
echo "GITHUB_TOKEN=ghp_your_token_here" > .env
./run.sh
```

Get your token at [github.com/settings/tokens/new](https://github.com/settings/tokens/new) (needs `repo` and `read:user` scopes).

## What You Get

### Static Timeline (`dist/index.html`)
Full contribution history with theme toggle and stats.

### Animated Widget (`dist/widget.html`)
High-velocity animation through 16 years in 30 seconds.

```html
<iframe 
  src="widget.html?duration=30&theme=dark"
  width="100%"
  height="300"
  frameborder="0">
</iframe>
```

**Widget parameters:**
- `duration=30` — Animation duration in seconds
- `theme=dark` — Color theme (`dark` or `light`)
- `autoplay=true` — Start automatically
- `speed=1.0` — Playback speed (0.1-10x)

Generate with: `npm run widget`

## Features

- All branches, not just main/master
- Private repositories you own or collaborate on
- Contributions to open source projects
- Historical data going back years
- Self-contained HTML (share or embed anywhere)
- Animated widget with rolling 365-day window
- Dark and light themes
- Fully responsive (mobile to desktop)

## Options

```bash
./run.sh --user octocat              # Different user
./run.sh --repos owned               # Only repos you own
./run.sh --repos forks               # Only forked repos
./run.sh --repos contributions       # Only external contributions
./run.sh --cached                    # Use cached data
./run.sh --refresh                   # Force full refresh
./run.sh --no-open                   # Don't open browser
```

## Embedding

### Static Timeline

```html
<iframe 
  src="https://yoursite.com/index-embed.html?theme=dark"
  width="100%" 
  height="800" 
  frameborder="0">
</iframe>
```

### Animated Widget

```html
<iframe 
  src="https://yoursite.com/widget.html?duration=30&theme=dark"
  width="100%"
  height="300"
  frameborder="0">
</iframe>
```

Both support `?theme=dark` or `?theme=light`.

## How It Works

1. Fetches all your repositories via GitHub API
2. Iterates through every branch in every repository
3. Collects commit history with author matching
4. Aggregates by date and calculates contribution levels
5. Generates self-contained HTML with embedded data
6. Caches results for faster subsequent runs

First run takes ~5 minutes for large accounts. Subsequent runs take ~30 seconds (incremental updates only).

## Technical Details

- **Node.js 18+** required
- **GitHub API** for data fetching
- **Zero dependencies** for generated HTML
- **Incremental caching** for performance
- **Rate limit handling** with automatic retries
- **Parallel processing** for multiple repositories
- **60fps animation** using requestAnimationFrame
- **Responsive design** with 6 breakpoints

## Widget Specs

- **16 years** of history in one animation
- **5,844 days** of commit data
- **257KB** self-contained file
- **60 FPS** smooth animation
- **52×7 grid** showing 365-day rolling window
- **GitHub-style** contribution colors

## Files Generated

```
dist/
├── index.html              # Full page with theme toggle
├── index-embed.html        # Embeddable version
├── widget.html             # Animated widget (257KB)
└── widget-demo.html        # Widget demo page
```

## Caching

Cache stored in `.cache/commits.json`. Delete to force full refresh or use `--refresh` flag.

```bash
./run.sh          # First run: ~5 min
./run.sh          # Second run: ~30 sec (incremental)
./run.sh --cached # Use cache, skip API calls
./run.sh --refresh # Force full refresh
```

## Repository Filters

| Filter | Description |
|--------|-------------|
| `all` | Everything (default) |
| `owned` | Repos you own, excluding forks |
| `forks` | Only forked repositories |
| `contributions` | Only commits to repos you don't own |

## Troubleshooting

**No commits found:**
- Check token has `repo` and `read:user` scopes
- Verify token isn't expired
- Check rate limits: [github.com/settings/tokens](https://github.com/settings/tokens)

**Rate limit exceeded:**
- Wait an hour or use `--cached` to work with existing data
- Authenticated requests get 5,000/hour vs 60/hour unauthenticated

**Widget not animating:**
- Check browser console for errors
- Verify browser supports ES6+ (Chrome 90+, Firefox 88+, Safari 14+)
- Try `?autoplay=false` to debug

## License

MIT

## Credits

Built by [@kibotu](https://github.com/kibotu)

Inspired by GitHub's contribution graph but showing the complete picture.
