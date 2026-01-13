#!/bin/bash

#
# Git History Timeline — Run Script
# 
# Usage: ./run.sh [options]
#
# Options:
#   --user <username>  Specify GitHub username (default: authenticated user)
#   --no-open          Don't open browser after generation
#   --cached           Use cached data, skip all API calls
#   --refresh          Force refresh, ignore incremental cache
#   --repos <type>     Filter repositories: all, owned, forks, contributions (default: all)
#   --help             Show this help message
#
# Repository Types:
#   all           - All repositories and external contributions (default)
#   owned         - Only repositories you own (not forks)
#   forks         - Only forked repositories
#   contributions - Only external contributions (PRs to other repos)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Default options
OPEN_BROWSER=true
USE_CACHE=false
FORCE_REFRESH=false
TARGET_USER=""
REPO_FILTER="all"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --user)
            TARGET_USER="$2"
            shift 2
            ;;
        --no-open)
            OPEN_BROWSER=false
            shift
            ;;
        --cached)
            USE_CACHE=true
            shift
            ;;
        --refresh)
            FORCE_REFRESH=true
            shift
            ;;
        --repos)
            REPO_FILTER="$2"
            if [[ ! "$REPO_FILTER" =~ ^(all|owned|forks|contributions)$ ]]; then
                echo -e "${RED}Invalid --repos value: $REPO_FILTER${NC}"
                echo "Valid options: all, owned, forks, contributions"
                exit 1
            fi
            shift 2
            ;;
        --help|-h)
            head -20 "$0" | tail -n +2 | sed 's/^# //' | sed 's/^#//'
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║       Git History Timeline            ║"
echo "║   Your complete contribution story    ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo ""
    echo "Create one with:"
    echo "  echo \"GITHUB_TOKEN=ghp_your_token_here\" > .env"
    echo ""
    echo "Generate a token at:"
    echo "  https://github.com/settings/tokens/new"
    echo "  (Select 'repo' and 'read:user' scopes)"
    exit 1
fi

# Check for GITHUB_TOKEN in .env
if ! grep -q "GITHUB_TOKEN=" .env || grep -q "GITHUB_TOKEN=$" .env; then
    echo -e "${RED}Error: GITHUB_TOKEN not set in .env${NC}"
    echo ""
    echo "Add your token to .env:"
    echo "  GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx"
    echo ""
    echo "Generate a token at:"
    echo "  https://github.com/settings/tokens/new"
    echo "  (Select 'repo' and 'read:user' scopes)"
    exit 1
fi

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js not found${NC}"
    echo "Please install Node.js 18 or later"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ required (found v$NODE_VERSION)${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Build arguments for node script
NODE_ARGS=""
if [ -n "$TARGET_USER" ]; then
    NODE_ARGS="$NODE_ARGS --user $TARGET_USER"
fi
if [ "$USE_CACHE" = true ]; then
    NODE_ARGS="$NODE_ARGS --cached"
fi
if [ "$FORCE_REFRESH" = true ]; then
    NODE_ARGS="$NODE_ARGS --refresh"
fi
if [ "$REPO_FILTER" != "all" ]; then
    NODE_ARGS="$NODE_ARGS --repos $REPO_FILTER"
fi

# Run the generator
echo -e "${GREEN}Fetching commit history...${NC}"
echo ""

# Unset any existing GITHUB_TOKEN to ensure .env is used
unset GITHUB_TOKEN

node src/index.js $NODE_ARGS

# Check if output was generated
OUTPUT_FILE="dist/index.html"
if [ ! -f "$OUTPUT_FILE" ]; then
    echo -e "${RED}Error: Failed to generate output${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Generated: $OUTPUT_FILE${NC}"

# Open in browser
if [ "$OPEN_BROWSER" = true ]; then
    echo -e "${BLUE}Opening in browser...${NC}"
    
    # Cross-platform open command
    case "$(uname -s)" in
        Darwin)  open "$OUTPUT_FILE" ;;
        Linux)   xdg-open "$OUTPUT_FILE" 2>/dev/null || sensible-browser "$OUTPUT_FILE" ;;
        MINGW*|CYGWIN*|MSYS*) start "$OUTPUT_FILE" ;;
        *)       echo "Please open $OUTPUT_FILE in your browser" ;;
    esac
fi

echo ""
echo -e "${GREEN}Done! ✨${NC}"
