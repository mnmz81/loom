#!/usr/bin/env bash
# Runs a command with the Node version from .nvmrc (via nvm).
# Usage: ./scripts/with-node.sh npm test
#        ./scripts/with-node.sh npx ng build
set -euo pipefail
cd "$(dirname "$0")/.."
# Already on the right major (e.g. CI after actions/setup-node): run directly, nvm not needed.
if [ "$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/')" = "$(tr -d '[:space:]v' < .nvmrc)" ]; then
  exec "$@"
fi
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
source "$NVM_DIR/nvm.sh" >/dev/null
nvm use --silent >/dev/null
exec "$@"
