# Loom — bilingual (he/en) learning blog

Angular 22 SSG (prerendered static HTML, zoneless, signals) deployed to GitHub Pages at `https://mnmz81.github.io/loom/` (`baseHref: /loom/`).
Design + build plan: `docs/superpowers/specs/2026-10-07-loom-design.md`.

## Run anything with Node 24
Always prefix commands with `./scripts/with-node.sh` (system Node is 20):
```bash
./scripts/with-node.sh npm test              # Angular unit tests (vitest)
./scripts/with-node.sh npm run test:scripts  # Node script tests (scripts/**/*.test.ts)
./scripts/with-node.sh npx tsx scripts/check-content.ts  # validate content/** only (no public/ or dist/ writes)
./scripts/with-node.sh npm run build         # content → OG → ng build → postbuild
./scripts/with-node.sh npm run build:e2e     # same, plus the sample entries in e2e/content (needed before npm run e2e)
./scripts/with-node.sh npm run e2e           # Playwright against dist/ (run build:e2e first)
```

`content/` holds only real blog posts. Test-only sample entries (a series, an English-only note, a Hebrew-only post) live in `e2e/content/` and are merged in by `build:e2e`; never publish them.

## Contracts (do not change without updating every consumer)
- `src/app/core/content.models.ts` — JSON shape between pipeline and app
- `docs/contracts/content-format.md` — Markdown folder layout + frontmatter
- `docs/contracts/components.md` — shared component selectors/inputs
- `src/app/core/routes.const.ts` (`PATHS`, `swapLang`), `src/app/core/site.config.ts` (`SITE`, `pageUrl`, `fileUrl`, `assetPath`)
- `src/app/core/i18n/` — `Dict` keys, `LocaleService`, `langGuard`
- `src/testing/fixtures/content/` — sample pipeline output matching the models

## Adding a certificate
`./scripts/with-node.sh npm run add-certificate -- <file.pdf|png> --title "..." --issuer "..." --date YYYY-MM-DD --url <verify link> --tags <existing tags>`, then `check-content`. Read the title, issuer, date and verify link off the certificate itself. Format: `docs/contracts/content-format.md`.

## Writing a new post
Use the project skill **`new-post`** (`.claude/skills/new-post/SKILL.md`) for every new post or substantial edit: scaffold (`npm run new-post`), check the official docs, both languages, images, tags, cross-links, verify, commit, Notion copy. The build rejects he/en pairs whose shared facts or body structure differ.

### Length and style (every post, new or edited)
- **Max 6 minutes reading time per language** (`python3 scripts/reading-time.py <slug>`). Longer → split into a series of posts, each standing on its own. The build fails above 6 min (`MAX_READING_MINUTES` in `scripts/content/collect.ts`). Only exception: the cheat sheets `git-commands` and `linux-commands` (`REFERENCE_PAGES`), which stay one page to search in. They still get no padding or repetition.
- **No padding, no repetition.** Say each thing once, in the place it belongs. No intro that restates the title, no "as we saw above", no closing recap of the sections, no paragraph that explains what the next code block shows and then a line under it that explains it again. Prefer one example over two that teach the same thing. If a sentence can go without losing a fact, it goes.

The site has no write path (no CMS, no request form): posts are written only on the author's computer, by asking Claude Code here.

## Conventions
- Logical CSS only (`margin-inline-start`, `inset-inline-end`, `text-align: start`) — the site is RTL by default.
- Code blocks always `dir="ltr"`.
- All in-app URLs from `PATHS`; static files via relative paths (`assetPath`) so `<base href>` applies.
- No dependency changes in `package.json` without asking (all needed deps are already installed).
- Reference implementation for most pieces: `../my cv web` (same author, same stack) — copy and adapt, keep its tests.
