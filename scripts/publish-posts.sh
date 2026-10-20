#!/usr/bin/env bash
# Verifies, commits and deploys a batch of finished posts, then waits for the Deploy run.
# Usage: ./scripts/publish-posts.sh "<commit message>" <slug> [<slug> ...] [-- <extra path> ...]
#   e.g. ./scripts/publish-posts.sh "content: typescript posts 3-6 (en + he)" typescript-tsconfig typescript-functions
# Runs test:scripts and the full build first; stops on any failure. Extra paths after `--` are committed too.
set -euo pipefail
cd "$(dirname "$0")/.."
msg="$1"
shift
paths=()
while [ $# -gt 0 ] && [ "$1" != "--" ]; do
  paths+=("content/posts/$1")
  python3 scripts/reading-time.py "$1"
  shift
done
[ "${1:-}" = "--" ] && shift && paths+=("$@")
./scripts/with-node.sh npm run test:scripts >/dev/null
./scripts/with-node.sh npm run build >/dev/null
git add -- "${paths[@]}"
git commit -q -m "$msg"
git push -q origin main
git log --oneline -1
sleep 5
run=$(gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$run" --exit-status >/dev/null
gh run list --limit 1 --json conclusion,headSha,workflowName
