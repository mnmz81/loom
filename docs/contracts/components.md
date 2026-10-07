# Contract: shared components (`src/app/shared/`)

Built by the Wave 1 components agent; used by the Wave 2 pages agent. Selectors use the `nb-` prefix.
All are standalone, `ChangeDetectionStrategy.OnPush`, signal `input()`/`output()`, zoneless-safe.
UI text comes from `LocaleService.t()` (`src/app/core/i18n`); links from `PATHS` (`src/app/core/routes.const.ts`).
Components may inject `LocaleService` and `Router`, nothing else from `core/` (no ContentService/ThemeService/SeoService).
CSS: logical properties only, `:host` display set, works under `dir="rtl"` and `dir="ltr"`, dark via `[data-theme=dark]` tokens, `prefers-reduced-motion` respected, touch targets ≥ 44px.

| Component | Path | Inputs | Outputs | Behavior |
|---|---|---|---|---|
| `nb-site-header` | `shared/layout/site-header/` | `theme: 'light' \| 'dark'` (required) | `themeToggle: void` | Site title → home; main nav (home/posts/notes/series/search, `aria-current` on active); language switch link to `locale.alternateUrl() ?? swapLang(router.url, otherLang)` labelled with the other language's name, `hreflang`; theme toggle button with `aria-label` `theme.toLight`/`theme.toDark`. Collapses to a menu button below 640px. |
| `nb-site-footer` | `shared/layout/site-footer/` | — | — | RSS link for current lang (`PATHS.rss`, relative href), source link (`SITE.repo`), author. |
| `nb-skip-link` | `shared/layout/skip-link/` | `target: string` (default `'main'`) | — | Visually hidden until focused; focuses `#<target>`. |
| `nb-entry-card` | `shared/entry-card/` | `entry: EntryMeta` (required), `headingLevel: 2 \| 3` (default 2) | — | Type label, title link to `PATHS.entry(entry.lang, ...)`, localized date (`formatDate`), summary if any, tag list. If `entry.lang !== locale.lang()` shows badge `lang.onlyIn.<entry.lang>` and sets `hreflang`/`lang` on the link + title. |
| `nb-entry-list` | `shared/entry-list/` | `entries: EntryMeta[]` (required), `emptyText?: string` | — | `<ul>` of `nb-entry-card`; empty → `emptyText ?? t('list.empty')`. |
| `nb-tag-list` | `shared/tag-list/` | `tags: string[]` (required), `labels?: Record<string,string>` | — | Inline list of tag links to `PATHS.tag(lang, tag)`, label from `labels[tag] ?? tag`. `aria-label` `entry.tags`. |
| `nb-entry-meta` | `shared/entry-meta/` | `entry: EntryMeta` (required) | — | Date (`<time datetime>`), updated date, reading minutes (posts only). |
| `nb-toc` | `shared/toc/` | `items: TocItem[]` (required) | — | `<nav aria-labelledby>` titled `entry.toc`; h3 items indented; links `#id` (fragment only, router-safe). Hidden when < 2 items. |
| `nb-series-nav` | `shared/series-nav/` | `nav: SeriesNav` (required) | — | Series title link to `PATHS.series`, "Part i of n", prev/next links (use `ref.lang` for the URL; mark fallback-language refs with `lang` attr). |
| `nb-related-list` | `shared/related-list/` | `items: EntryRef[]` (required) | — | Titled `entry.related`; hidden when empty. |
| `nb-article-body` | `shared/article-body/` | `html: string` (required) | — | Renders pipeline HTML (trusted, built from repo Markdown) via `DomSanitizer.bypassSecurityTrustHtml` with a comment saying why. Browser only: adds a copy button (`code.copy` → `code.copied` for 2s, `aria-live=polite`) to each `<pre>`; uses Clipboard API, no-op on SSR. Has `data-pagefind-body`. Prose styles for headings, lists, tables, blockquote, inline code, images; `pre` stays LTR. |
| `nb-lang-badge` | `shared/lang-badge/` | `lang: Lang` (required) | — | Small pill "עברית בלבד / English only" text from `lang.onlyIn.<lang>`. |

Global styles (`src/styles.scss`, `src/styles/`) are owned by the same agent: design tokens (`--nb-*`), light/dark themes on `:root` / `[data-theme=dark]` with `prefers-color-scheme` fallback, base typography (Inter + JetBrains Mono; Hebrew falls back to system Hebrew fonts), Shiki dual-theme CSS (`.shiki span { color: var(--shiki-light) }` / dark), focus ring, `.visually-hidden`.
