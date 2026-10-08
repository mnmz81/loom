#!/usr/bin/env bash
# Serves the production build under the GitHub Pages prefix so local URLs match production:
#   http://localhost:${PORT:-4321}/loom/  ->  dist/loom/browser
# Unknown URLs get 404.html (like GitHub Pages). Run `npm run build` first.
# Usage: ./scripts/serve-dist.sh            (or PORT=8080 ./scripts/serve-dist.sh)
#        ./scripts/with-node.sh ./scripts/serve-dist.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DIST="dist/loom/browser"
ROOT="dist/serve"
PORT="${PORT:-4321}"

if [[ ! -f "$DIST/index.html" ]]; then
  echo "serve-dist: $DIST/index.html not found — run 'npm run build' first" >&2
  exit 1
fi

mkdir -p "$ROOT"
ln -sfn "../loom/browser" "$ROOT/loom"
# http-server serves <root>/404.html for misses; point it at the site's own 404 page.
ln -sfn "loom/404.html" "$ROOT/404.html"

echo "serve-dist: http://localhost:$PORT/loom/"
exec npx --no-install http-server "$ROOT" -p "$PORT" -c-1 --silent
