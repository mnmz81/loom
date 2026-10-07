# Notebook — bilingual learning blog (design + parallel-agent build plan)

## Context
Personal learning blog / knowledge base: long posts + short notes (TIL), public, searchable so I can find things again later. Build is split so **several subagents work in parallel with no dependencies on each other** — they depend only on a contracts commit made first.

| Decision | Choice |
|---|---|
| Audience | Public + me |
| Location | New separate repo `~/Desktop/code project/notebook` |
| Stack | Angular 22 SSG, reusing tested pipeline from `my cv web` |
| Authoring | Markdown in repo → Notion sync → web CMS (Sveltia) |
| MVP | Full-text search, posts + notes, series, he/en |
| i18n | Fully bilingual `/he/...` + `/en/...`, default he (`/` → `/he/`) |
| Translations | Optional per entry; missing lang → "עברית בלבד / English only" badge |
| Hosting | GitHub Pages → `https://mnmz81.github.io/notebook/` (name is a placeholder) |
| Extras | tags, TOC, code copy, related posts, dark mode, per-lang RSS, updated date |

## Mushilu-San-UI RTL check — result: NOT supported
Evidence (`Mushilu-San-UI/projects/ui`): zero `dir`/`rtl`/`Directionality` handling; 98 physical CSS props (`left/right`, `margin-left`, `translateX`) vs 6 logical — worst: `overlays/src/popover/popover.css` (23), `hover-card-content.css` (14), `feedback/src/sheet/sheet.css` (7), `mobile/src/swipe-action`, `feedback/src/toast`, `navigation/src/tabs`; arrow keys not mirrored in `src/core/a11y/roving-focus.ts`, `forms/src/slider/slider.ts`, `layout/src/resizable/resizable-handle.ts`, calendar, input-otp.

→ **Step 0 (after approval):** open issue on `mushilu-san/Mushilu-San-UI`: "RTL support (dir=rtl)" with the evidence above + acceptance criteria: logical CSS props everywhere, `:host-context([dir=rtl])` / `Directionality` for positioned overlays, mirrored ArrowLeft/Right in roving-focus/slider/resizable/calendar/tabs, an RTL Storybook toolbar toggle, an e2e RTL pass.
→ **MVP does not use Mushilu**; local components with logical CSS. Swap to Mushilu later once the issue ships (separate task).

## Reuse from `my cv web` (copy + adapt)
`scripts/content/{schema,markdown,collect,feeds}.ts` + tests · `scripts/notion/{client,mapping,sync}.ts` + tests + `.github/workflows/notion-sync.yml` · `src/app/core/{content.service,content.resolvers,content-loader*,seo.service,theme.service}.ts` · `app.routes.server.ts` prerender pattern · `scripts/build-og.ts`, `scripts/postbuild.ts` · `.github/workflows/{ci,deploy}.yml` · `playwright.config.ts` + axe.

## Design (summary)
- **Content:** `content/{posts,notes}/<slug>/{he,en}.md`, `content/series/<key>.yaml`, `content/tags.yaml`. Folder name = slug = translation key (Latin kebab).
- **Frontmatter (strict zod):** post `title, summary≤200, date, updated?, tags[≥1], draft?, cover?, series?{key,order}`; note `title, date, updated?, tags[≥1], draft?`.
- **Output** `public/content/`: `<lang>/index.json` (metas incl. `availableLangs`, `fallbackLang`), `<lang>/{posts,notes}/<slug>.json` (html, toc, related[3]), `series.json`; `rss-<lang>.xml`, `sitemap.xml` with hreflang.
- **Routes (prerendered):** `/:lang`, `/:lang/{posts,notes}[/:slug]`, `/:lang/series[/:key]`, `/:lang/tags/:tag`, `/:lang/search`, `404`; `/` static redirect to `/he/`.
- **i18n:** runtime typed dictionaries + `LocaleService` (route `:lang` → signal, sets `<html lang dir>` in SSR); logical CSS only; code always `dir=ltr`; memoized `Intl.DateTimeFormat`.
- **Search:** Pagefind in postbuild, `data-pagefind-body`, filters `type`/`tag`, per-lang index by `<html lang>`.
- **Base href** `/notebook/`; `SITE.url` single source for canonical/RSS/OG.

## Build plan — waves

Every agent runs with `isolation: "worktree"` on its own branch and **owns a disjoint set of files** (listed), so merges are conflict-free. Each agent: TDD, its own tests green, no edits outside its ownership.

### Wave 0 — Contracts (me, sequential, ~small) — the only shared dependency
1. Open the Mushilu RTL issue (Step 0 above).
2. `git init` notebook, Angular 22 SSG scaffold, Node 24, vitest configs, base href, `SITE` config. Copy this design to `docs/superpowers/specs/2026-10-07-notebook-design.md`.
3. Contracts, committed before any agent starts:
   - `src/app/core/content.models.ts` — all JSON types (EntryMeta, Entry, Series, Lang, ContentIndex…)
   - `docs/contracts/content-format.md` — folder layout + frontmatter spec (consumed by pipeline, Notion, CMS, seed)
   - `src/app/core/i18n/{i18n.types,he,en}.ts` + `locale.service.ts` (small, complete)
   - `docs/contracts/components.md` — selector + inputs/outputs of every shared component
   - `src/testing/fixtures/content/**` — hand-written sample JSON matching the models (lets UI/services work without the pipeline)
   - route path constants `src/app/core/routes.const.ts`

### Wave 1 — parallel, independent (launch all in one message)
| Agent | Owns | Delivers |
|---|---|---|
| **A Pipeline** | `scripts/content/**`, `scripts/build-content.ts` | schema/collect/markdown/feeds per contract; output matches fixtures shape; tests |
| **B Services** | `src/app/core/{content.service,content.resolvers,seo.service,theme.service}*` | per-lang loading from fixtures, resolvers, hreflang/canonical SEO, theme; specs |
| **C Components** | `src/app/shared/**` | layout, header+lang switch+theme toggle, entry card (fallback badge), TOC, series nav, related list, code-copy; pure input-driven per `components.md`; follows global 9-step component task workflow; specs ≥80% |
| **D Tooling** | `scripts/postbuild.ts`, `scripts/build-og.ts`, `public/index.html` redirect, `.github/workflows/**`, `playwright.config.ts` | Pagefind run, 404, OG images, root redirect, CI + deploy |
| **E Seed + docs** | `content/**`, `README.md` | 2 posts (one he+en, one he-only, one in a series), 2 notes, 1 series, tags.yaml; writing guide |
| **F Notion** | `scripts/notion/**`, `scripts/sync-notion.ts`, `.github/workflows/notion-sync.yml`, `docs/notion-setup.md` | port + new props `Lang`, `Kind`, `Series`, `Series order` → writes `content/<kind>/<slug>/<lang>.md`; tests with mocked client |
| **G CMS** | `public/admin/**`, `docs/cms-setup.md` | Sveltia CMS config mirroring `content-format.md` (i18n multiple_files), PAT login; verify current docs via context7 |

F and G depend only on `content-format.md`, so they can run now in parallel or be deferred to keep the "Markdown → Notion → CMS" order; default: run with Wave 1.

### Wave 2 — Pages + integration (one agent, after Wave 1 merged)
Owns `src/app/pages/**`, `app.routes.ts`, `app.routes.server.ts`, `src/app/pages/search/**`. Wires B services + C components, prerender params from real pipeline output, search page loading `pagefind/pagefind.js`.

### Wave 3 — Verification (one agent / me)
Full build, Playwright e2e + axe (below), fix-ups, then confirm with user before creating GH repo + enabling Pages.

## Verification
- `npm run test:scripts` (A, F) and `npm test` (B, C, pages) green; ≥80% coverage on services/components.
- Contract check: pipeline output for seed content validates against `content.models.ts` types and fixture shape (test in A).
- `npm run build`, serve under `/notebook/`, Playwright:
  - `/` → `/he/`; `<html dir=rtl lang=he>` on he, `ltr` on en; code blocks LTR
  - lang switch on translated post → translation; he-only post → en list with "Hebrew only" badge
  - series order + prev/next; tag page; related posts
  - search finds seed note text in he and en indexes
  - axe clean on home/post/search both langs; dark mode toggle
- Built-in browser check at mobile width: RTL layout, no horizontal scroll.
