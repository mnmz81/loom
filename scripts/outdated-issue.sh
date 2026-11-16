#!/usr/bin/env bash
# Keeps one GitHub issue listing the npm packages that have a newer version.
# Replaces Dependabot version-update PRs: it reports, it never changes files.
# Usage: ./scripts/with-node.sh ./scripts/outdated-issue.sh            # create/update/close the issue (needs gh + GH_TOKEN)
#        DRY_RUN=1 ./scripts/with-node.sh ./scripts/outdated-issue.sh  # print the issue body only
set -euo pipefail
cd "$(dirname "$0")/.."

TITLE="Dependency updates available"
LABEL="dependencies"

# npm outdated exits 1 when something is outdated; that is not an error here.
json="$(npm outdated --json || true)"
rows="$(jq -r 'to_entries | sort_by(.key)[] | "| `\(.key)` | \(.value.current // "-") | \(.value.wanted) | \(.value.latest) |"' <<<"$json")"
count="$(jq 'length' <<<"$json")"

body="$(cat <<BODY
${count} npm package(s) have a newer version. Updated by \`scripts/outdated-issue.sh\` (workflow \`outdated.yml\`).

| Package | Current | Wanted (in range) | Latest |
|---|---|---|---|
${rows}

To update the in-range ones: \`./scripts/with-node.sh npm update\`, then run the tests.
GitHub Actions versions are not covered here. Security fixes still arrive as Dependabot PRs.
BODY
)"

if [ -n "${DRY_RUN:-}" ]; then
  [ "$count" -eq 0 ] && echo "Nothing outdated: an open issue would be closed." || echo "$body"
  exit 0
fi

number="$(gh issue list --state open --label "$LABEL" --search "\"$TITLE\" in:title" --json number,title \
  --jq "[.[] | select(.title == \"$TITLE\")][0].number // empty")"

if [ "$count" -eq 0 ]; then
  [ -n "$number" ] && gh issue close "$number" --comment "Everything is up to date."
elif [ -n "$number" ]; then
  gh issue edit "$number" --body "$body"
else
  gh issue create --title "$TITLE" --label "$LABEL" --body "$body"
fi
