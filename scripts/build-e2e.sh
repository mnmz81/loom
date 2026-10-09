#!/usr/bin/env bash
# Builds the site for end-to-end tests: the real blog content plus the sample entries in e2e/content
# (translated and untranslated entries, a series, an English-only note), so every UI path is testable.
# Usage: ./scripts/build-e2e.sh        then: npm run e2e
# Run the normal `npm run build` again afterwards before publishing; this one is for tests only.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf .e2e-content
cp -R content .e2e-content
for dir in posts notes series; do
  [ -d "e2e/content/$dir" ] && cp -R "e2e/content/$dir/." ".e2e-content/$dir/"
done
[ -f e2e/content/tags.yaml ] && { echo >> .e2e-content/tags.yaml; cat e2e/content/tags.yaml >> .e2e-content/tags.yaml; }

CONTENT_DIR=.e2e-content npm run build
