# Loom — bilingual (he/en) learning blog

Angular 22 SSG (prerendered static HTML, zoneless, signals) deployed to GitHub Pages at `https://mnmz81.github.io/loom/` (`baseHref: /loom/`).
Design + build plan: `docs/superpowers/specs/2026-10-07-loom-design.md`.

## Run anything with Node 24
Always prefix commands with `./scripts/with-node.sh` (system Node is 20):
```bash
./scripts/with-node.sh npm test              # Angular unit tests (vitest)
./scripts/with-node.sh npm run test:scripts  # Node script tests (scripts/**/*.test.ts)
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

## Writing a new post
Before writing any new post (or substantially editing one), check the docs:
- **Official docs of the topic** (e.g. docs.github.com, git-scm.com, the tool's own `--help`): verify every command, flag, setting path and claim; run commands locally when possible. Fetch the docs, don't rely on memory. Prices, plans and UI paths change, so hedge or link instead of stating them.
- **This repo's docs:** `docs/contracts/content-format.md` (folder layout, frontmatter, tags) and `docs/notion-setup.md` (publishing flow, including the Notion copy).

Then update **every place** the post lives, in the same change, and never leave one behind:
- Both languages: `content/posts/<slug>/en.md` and `he.md` (same facts, same structure, same images; `date`, `tags`, `series`, `cover` must match).
- Images and their generator script: `public/images/<slug>/` and `scripts/diagrams/` (re-run the script, don't hand-edit SVGs).
- `content/tags.yaml` for any new tag; `README.md` / `docs/` if the change affects them.
- Cross-links in related posts (e.g. "see also" links, cheat sheets that should point to the new post).
- The Notion copy under **Loom — מרכז → בבלוג (פורסם)**: create or update the page after the site is deployed (image URLs point to the live site), keep the "published" line, and bump `updated` / "Last updated" when editing an existing post.
- Verify before finishing: `npm run build` and `npm run test:scripts` pass, then commit and push.

## Conventions
- Logical CSS only (`margin-inline-start`, `inset-inline-end`, `text-align: start`) — the site is RTL by default.
- Code blocks always `dir="ltr"`.
- All in-app URLs from `PATHS`; static files via relative paths (`assetPath`) so `<base href>` applies.
- No dependency changes in `package.json` without asking (all needed deps are already installed).
- Reference implementation for most pieces: `../my cv web` (same author, same stack) — copy and adapt, keep its tests.
