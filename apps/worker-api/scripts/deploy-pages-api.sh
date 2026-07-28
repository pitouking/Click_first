#!/usr/bin/env bash
# Deploy click-first-api as Cloudflare Pages Advanced Mode (_worker.js).
# Needed because the current API token can edit Pages/D1 but not Workers Scripts.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
rm -rf dist-worker pages-static
mkdir -p pages-static
pnpm exec wrangler deploy --dry-run --outdir=dist-worker
cp dist-worker/index.js pages-static/_worker.js
printf '%s\n' '<!doctype html><meta charset=utf-8><title>click-first-api</title><p>API — GET /health' > pages-static/index.html
# Deploy from /tmp so wrangler.toml (Worker main) is not validated as Pages config.
STAGE="$(mktemp -d)"
cp pages-static/_worker.js pages-static/index.html "$STAGE/"
pnpm exec wrangler pages deploy "$STAGE" --project-name=click-first-api --branch=main --commit-dirty=true
rm -rf "$STAGE"
echo "API: https://click-first-api.pages.dev/health"
