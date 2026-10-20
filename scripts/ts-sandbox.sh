#!/usr/bin/env bash
# Runs a command inside a scratch folder with the repo's Node version and its tsc / tsx on PATH,
# for trying the shell examples of a TypeScript post outside the repo (no repo tsconfig.json is picked up).
# Usage: ./scripts/ts-sandbox.sh <dir> <command...>
#        ./scripts/ts-sandbox.sh "$TMPDIR/ts3" tsc --noEmit
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
dir="$1"
shift
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
cd "$repo"
# shellcheck disable=SC1091
source "$NVM_DIR/nvm.sh" >/dev/null
nvm use --silent >/dev/null
export PATH="$repo/node_modules/.bin:$PATH"
mkdir -p "$dir"
cd "$dir"
exec "$@"
