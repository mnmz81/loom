#!/usr/bin/env bash
# Runs a command inside a scratch Angular workspace (outside the repo), creating it on first use,
# for checking the code of an Angular post with `ng test` / `ng build` without touching the repo.
# Usage: ./scripts/ng-sandbox.sh <dir> <command...>
#        NG_TEMPLATE=/path/to/ready-workspace ./scripts/ng-sandbox.sh "$TMPDIR/ng-a" npx ng test --watch=false
# With NG_TEMPLATE set, a new <dir> is a copy of that workspace (fast, no npm install); otherwise it runs
# `ng new` with the CLI version the repo uses.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
dir="$1"
shift
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
cd "$repo"
# shellcheck disable=SC1091
source "$NVM_DIR/nvm.sh" >/dev/null
nvm use --silent >/dev/null
if [ ! -f "$dir/angular.json" ]; then
  if [ -n "${NG_TEMPLATE:-}" ]; then
    mkdir -p "$(dirname "$dir")"
    cp -Rc "$NG_TEMPLATE" "$dir" 2>/dev/null || cp -R "$NG_TEMPLATE" "$dir"
  else
    cli=$(node -p "require('./node_modules/@angular/cli/package.json').version")
    mkdir -p "$(dirname "$dir")"
    (cd "$(dirname "$dir")" && npx -y "@angular/cli@$cli" new "$(basename "$dir")" --defaults --skip-git --ssr=false --style=css >/dev/null)
  fi
fi
cd "$dir"
exec "$@"
