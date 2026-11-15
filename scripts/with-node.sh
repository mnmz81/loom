#!/usr/bin/env bash
# Runs a command with the Node version from .nvmrc (via nvm).
# Usage: ./scripts/with-node.sh npm test
#        ./scripts/with-node.sh npx ng build
set -euo pipefail
cd "$(dirname "$0")/.."
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
source "$NVM_DIR/nvm.sh" >/dev/null
nvm use --silent >/dev/null
# .npmrc reads NODE_AUTH_TOKEN for the private @mushilu-san packages: fall back to the gh login.
if [ -z "${NODE_AUTH_TOKEN:-}" ] && command -v gh >/dev/null; then
  NODE_AUTH_TOKEN="$(gh auth token 2>/dev/null || true)"
fi
: "${NODE_AUTH_TOKEN:=}"
export NODE_AUTH_TOKEN
exec "$@"
