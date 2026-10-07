# Notebook — bilingual (he/en) learning blog

Angular 22 SSG (prerendered static HTML, zoneless, signals) deployed to GitHub Pages at `https://mnmz81.github.io/notebook/` (`baseHref: /notebook/`).
Design + build plan: `docs/superpowers/specs/2026-10-07-notebook-design.md`.

## Run anything with Node 24
Always prefix commands with `./scripts/with-node.sh` (system Node is 20):
```bash
./scripts/with-node.sh npm test              # Angular unit tests (vitest)
./scripts/with-node.sh npm run test:scripts  # Node script tests (scripts/**/*.test.ts)
./scripts/with-node.sh npm run build         # content → OG → ng build → postbuild
```

## Contracts (do not change without updating every consumer)
- `src/app/core/content.models.ts` — JSON shape between pipeline and app
- `docs/contracts/content-format.md` — Markdown folder layout + frontmatter
- `docs/contracts/components.md` — shared component selectors/inputs
- `src/app/core/routes.const.ts` (`PATHS`, `swapLang`), `src/app/core/site.config.ts` (`SITE`, `pageUrl`, `fileUrl`, `assetPath`)
- `src/app/core/i18n/` — `Dict` keys, `LocaleService`, `langGuard`
- `src/testing/fixtures/content/` — sample pipeline output matching the models

## Conventions
- Logical CSS only (`margin-inline-start`, `inset-inline-end`, `text-align: start`) — the site is RTL by default.
- Code blocks always `dir="ltr"`.
- All in-app URLs from `PATHS`; static files via relative paths (`assetPath`) so `<base href>` applies.
- No dependency changes in `package.json` without asking (all needed deps are already installed).
- Reference implementation for most pieces: `../my cv web` (same author, same stack) — copy and adapt, keep its tests.
