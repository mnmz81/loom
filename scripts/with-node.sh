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
exec "$@"
