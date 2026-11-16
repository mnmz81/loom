# Loom — UI/UX review and action plan

Reviewed 2026-11-15 on the live site (`https://mnmz81.github.io/loom/`): home, posts list, a post, series list, a series, search, certificates. Desktop 1280×800 and mobile 375×812, dark and light, Hebrew.

This document is the brief for the implementation session. Each item says what is wrong, what to do, and how to know it is done.

## Verdict

The foundations are good: clean tokens, logical CSS, RTL done right, no horizontal overflow on mobile, AA-minded colors, sticky TOC, series navigation. The site does not look bad because of bugs. It looks weak for three reasons:

1. **It reads as a template.** Default slate + indigo palette, a gradient hero box, a wall of identical cards with a colored top bar, and eleven series tiles each with a different saturated gradient. Nothing on the page is specific to this blog.
2. **It does not scale to the content.** The site has 233 posts and 11 series, and every list is a 3-column card grid with no paging or grouping.
3. **The reading page spends its first screen on chrome**, not on the article.

Fix those three and most of the "meh" goes away. Small polish items come after.

## What works — keep

- Token system in `src/styles/_tokens.scss`, Hebrew-specific leading and tracking.
- Header: clear active state, language switch, theme toggle, mobile menu.
- Post page structure: type label, title, lead, meta, series nav, TOC, prose at 44rem.
- Light theme. It is cleaner than the dark one; use it as the reference when tuning dark.

## Findings

### P0 — structure (biggest visible gain)

**1. Posts list is one page of 233 cards.**
`/he/posts` is 23,707px tall with no pagination, grouping or sort. `/he/series/angular` is 10,009px with 83 cards. Above the list sit 27 tag chips in two unordered rows.
- Replace the card grid on list pages with compact rows: title, one-line description, date, tag. Roughly 10–12 rows per screen instead of 6 cards.
- Posts list: group by month, or paginate at 20–30 per page (prerendered pages, so it stays static).
- Series page: a numbered list (1…83) with the title and reading time; split long series into sections if the content has natural chapters. Keep "part N" visible as the number, not as a label floating above a card.
- Tag filter: show the top 8–10 tags, put the rest behind "more".
- Done when: posts list first page is under ~3,000px and a series of 83 parts can be scanned without more than a few screens of scrolling.

**2. Home page says nothing about the blog and shows a noisy series block.**
- The hero repeats the logo: header shows "לום." and the `h1` right under it shows "לום" again. Replace with a real one-sentence statement of who writes this and what is here, plus two actions: "start with a series" and "search".
- "Latest posts" shows six posts with the same date (29 Oct 2026), five of them Python. Show fewer (4–5) as compact rows, and vary by series, or show "latest per series".
- Series tiles: eleven tiles, each with its own purple / teal / magenta gradient. Remove the gradients. Use one surface color, and let a small colored marker or icon carry the series identity.
- Series order is alphabetical by key, so "AI: Tools and Agents" (series 3 of 5) comes first and "AI: basics" (1 of 5) second. Add an explicit order, and group the five AI series as one track with steps 1–5.
- The "הכל" link next to each section heading is small underlined text. Make it a clear link: "כל הפוסטים ←".
- Done when: a first-time visitor can tell in one screen what the blog covers and where to start.

**3. Post page: the article starts below the fold.**
At 1280×800 the first paragraph starts at about y=560. Above it: header, type label, title, lead, meta, tag, and a large series box with previous/next.
- Shrink the series box at the top to one line ("Python step by step · part 21 of 35", with small prev/next arrows). Keep the full previous/next cards at the end of the article only.
- Lead paragraph is the same size as body text and muted. Make it larger (about 1.125–1.25rem) and less muted; it is the summary.
- Body text is 16px / 28px. For long-form Hebrew raise to 17–18px.
- Add a reading-progress bar under the header and a back-to-top control on long posts (posts run ~6,000px).
- Done when: the first paragraph is visible without scrolling at 1280×800 and at 375×812.

### P1 — visual identity

**4. Palette and surfaces.**
- One accent color, used for links, active states and focus. Drop the six-color tag system from cards (top bar, type label, tag chip all change color per card, so no color means anything). Keep color only where it encodes something, e.g. one color per series.
- Dark theme: `--nb-color-border` equals `--nb-color-surface-2` (`#1f2937`) and cards are `#111827` on `#0b0f19`, so cards, borders and the hero all blur together. Raise the surface step or drop the card borders and separate with space.
- Remove hover lift (`translateY(-2px)` + large shadow) from list items once they are rows; use a background change.

**5. Typography.**
- Headings and body are both Heebo at close weights. Give headings more contrast: heavier weight (800) and tighter size steps, or a second display face for `h1` only. Check any new font covers Hebrew.
- Card meta is 0.8125rem muted on dark. Do not go smaller; prefer fewer meta items.
- Mixed-direction titles wrap badly in narrow cards (e.g. the `*args, **kwargs, / ו-*` title ends with `-*` alone on a line). Wider rows fix most of it; keep `text-wrap: balance`.

**6. Page width is inconsistent.**
Search and certificates keep content in a narrow column at the inline start with the rest of the 72rem container empty. Either center narrow pages or give them a layout that uses the width.

### P1 — mobile

**7. TOC is fully expanded above the article.** Eight links push the text down a full screen. Collapse it into a closed `<details>` ("בעמוד הזה") on small screens.

**8. Copy button covers the code.** On 375px the "העתקה" button sits on top of the first code line. Move it to a header strip above the code block (which can also show the language), or show it only on focus/hover with a reserved top padding.

**9. Long inline code breaks across lines** as two separate grey chips (`{key: value for item in` / `iterable}`). Use `box-decoration-break: clone` and allow wrapping, or keep long snippets in a block.

**10. Code blocks scroll sideways with no hint.** Add a fade on the scroll edge.

**11. Touch targets.** 6 of 48 links/buttons on the mobile post page are under 40px tall (TOC links, meta links). Bring them to the existing `--nb-touch-target` (44px).

### P2 — polish

**12. Search page is empty until you type.** Add recent/popular tags or series as starting points, autofocus the input, and make search reachable from the header as a field or a `/` / `⌘K` shortcut, not only as a nav link.

**13. Certificates.** In this review the two certificate images never finished loading (`loading="lazy"`, `naturalWidth: 0`), although the PNG returns HTTP 200. This may be the review browser pane. Verify in a normal browser first; if it reproduces, set explicit `width`/`height` and drop lazy loading for the first row. Also let a click open the certificate large.

**14. Links that contain inline code** get both an underline and a code chip. Pick one treatment.

**15. Footer** has only copyright, accessibility statement, RSS and source. Add a one-line "about" and the main sections.

## Proposed direction

Editorial and quiet rather than "dashboard of cards":

- Lists are rows, not cards. Cards stay only where an item needs a picture (certificates) or is a real entry point (series).
- One accent, neutral surfaces, more whitespace, stronger headings.
- Color only carries meaning (series identity).
- The reading page is the product: first screen is title, lead, text.

## Implementation phases

Work in this order; each phase is shippable on its own.

| Phase | Scope | Main files |
|---|---|---|
| 1 | Tokens: single accent, dark surface steps, body size, heading weights | `src/styles/_tokens.scss`, `_typography.scss`, `_prose.scss` |
| 2 | Row list component; posts list paging/grouping; series page numbered list; tag filter | `src/app/shared/entry-list`, `entry-card`, `src/app/pages/entries`, `series`, `tag`, `prerender-params.ts` |
| 3 | Home: hero text, compact latest, series track with explicit order | `src/app/pages/home`, series frontmatter + `content.models.ts` if an `order` field is added |
| 4 | Post page: compact series bar, lead, progress, back-to-top, mobile TOC, code block header | `src/app/pages/entry`, `shared/series-nav`, `shared/toc`, `shared/article-body` |
| 5 | Search, certificates, footer polish | `src/app/pages/search`, `certificates`, `shared/layout/site-footer` |

Rules that apply to every phase (from `CLAUDE.md`):

- Changing shared component inputs or the content JSON shape means updating `docs/contracts/components.md`, `content.models.ts`, the fixtures and every consumer.
- Logical CSS only, code blocks `dir="ltr"`, URLs from `PATHS`.
- Run `npm test`, `npm run test:scripts`, `build:e2e` + `e2e` (includes axe checks).
- Re-run the `il-web-compliance` skill before the first commit that changes pages.
- Component style budget is 4kB warning / 8kB error per component (`angular.json`).

## Can Mushilu-San-UI replace the blog's components?

**Short answer: not all of them. About half of the UI can move to the library; the content-specific half has no equivalent and should stay local.**

### What was checked

Library at `../Mushilu-San-UI`, package `@mushilu-san/ui` 0.2.0, eight entry points (primitives, layout, navigation, data-display, feedback, forms, overlays, mobile).

| Check | Result |
|---|---|
| Angular version | Peer `^22.0.0`; blog is on 22.2.3. Compatible. |
| Zoneless / signals | Library is built that way. Compatible. |
| SSR / prerender | The library's own docs site is prerendered from the same source, and its rules require injecting `DOCUMENT`. 11 source files touch browser globals and 4 use platform guards, so this needs a real prerender test, not an assumption. |
| Theming | Same mechanism as the blog: `data-theme="dark"` / `"light"` plus `prefers-color-scheme`. Tokens are `--mui-*`; the blog uses `--nb-*`. |
| RTL | Library has an RTL direction token (`--mui-dir-sign`); 6 CSS files still contain physical `left`/`right` properties and need a look. |
| Distribution | Published to GitHub Packages (`npm.pkg.github.com`). Installing needs an auth token locally and in the GitHub Actions deploy workflow. |
| Extra deps | `@angular/cdk` and `chart.js` are optional peers; not needed for the components below. |

### Mapping

| Blog piece | Library component | Fit |
|---|---|---|
| Header buttons (theme, language, menu) | `button`, `icon` | Good |
| Header nav links | `nav-link` | Good |
| Mobile menu | `mobile-nav` or `sheet` | Good, check SSR and focus handling |
| `lang-badge`, entry type label | `badge` | Good |
| `tag-list` chips | `badge` | Only if it can render as a link |
| Series tiles, certificate cards | `card`, `aspect-ratio` | Good |
| Row/grid layout | `container`, `grid`, `stack` | Good, but the blog's CSS already does this in a few lines |
| Posts list paging (new) | `pagination` | Good, must render real `<a href>` for static pages |
| Tag filter / list tabs (new) | `tabs`, `toggle-group` | Good |
| Search form | `input`, `form-field`, `select` | Good; native `<select>` is acceptable too |
| Search empty / 404 | `empty` | Good |
| Search loading | `skeleton`, `spinner` | Good |
| Reading progress (new) | `progress` | Good |
| Copy-code feedback | `tooltip` or `toast` | Good |
| Certificate zoom (new) | `dialog` | Good |
| Mobile TOC collapse (new) | `accordion` | Possible; native `<details>` is lighter |
| `toc` with scroll position | none | Stays local |
| `series-nav` (prev/next in series) | none | Stays local (can use `card` + `button` inside) |
| `article-body` (rendered Markdown, Shiki code) | none | Stays local |
| `skip-link` | none | Stays local |
| `site-footer` | none | Stays local |
| `entry-meta` (date, reading time) | none | Stays local |

### Risks

- **Version 0.2.0.** The API can still change; the blog would track it.
- **Install in CI.** GitHub Packages needs a token and an `.npmrc` scope entry in the deploy workflow.
- **Two token sets.** Either map `--mui-*` semantic tokens to the blog palette in one file, or rename the blog's tokens. Mapping is the smaller change.
- **Global CSS.** The library ships `reset.css` and `tokens.css`; importing the reset can shift the prose styles.
- **Size.** A static blog ships very little JS today; each interactive library component adds some. Check the 500kB initial budget and the per-component style budget after the spike.
- **Accessibility tests.** The blog's e2e runs axe; the library components must pass in Hebrew RTL, both themes.
- **Dependency rule.** `CLAUDE.md` says no dependency changes without asking. Adopting the library is that kind of change.

### Recommendation

**Decision (2026-11-15): redesign first.** Phases 1–5 use the blog's own components. The spike below runs only after they ship.

Adopt the library for interactive primitives, not for content components, and do it after the redesign phases above, not instead of them. Swapping components does not fix the three problems in the verdict; layout and hierarchy do.

Spike first (half a day), on a branch:

1. Install `@mushilu-san/ui` from GitHub Packages; add the `.npmrc` scope and the workflow token.
2. Import `tokens.css` only (not the reset); add one file that maps `--mui-color-*` to the blog palette.
3. Replace three things: header buttons (`button` + `icon`), `lang-badge` (`badge`), mobile menu (`mobile-nav`).
4. Run `npm run build` (prerender must succeed), `build:e2e` + `e2e` (axe), and compare bundle size before/after.

Go if: prerender passes with no hydration errors, axe is clean in he/en and both themes, initial JS grows by less than ~30kB. Then migrate the rest of the "Good" rows, one component per commit. Gaps found on the way (link-rendering `badge`, `pagination` with real hrefs, a TOC component) are worth adding to the library rather than working around in the blog.

### Spike result (2026-11-15, branch `spike/mushilu-ui`)

Swapped: header menu/theme buttons and language link (`muiButton`), header nav links (`muiNavLink`), `nb-lang-badge` (`mui-badge`). Library `tokens.css` loaded globally, `--mui-color-*` mapped to `--nb-*` in `src/styles/_mui-map.scss`.

| Criterion | Result |
|---|---|
| Prerender build | Pass, no budget warnings |
| Unit tests | 241 pass |
| e2e incl. axe, he/en, desktop/mobile | 192 pass |
| Console / hydration errors | None |
| Size on disk | JS 464 → 476 kB (+12), CSS 20 → 28 kB (+8, all of `tokens.css`) |

Technical verdict: **go**. Open items before real adoption:

1. **Registry.** Done. `@mushilu-san/ui` 2026.46.1 comes from GitHub Packages (`.npmrc`). The package is private and owned by another account, so the workflows' `GITHUB_TOKEN` cannot read it: CI, deploy and Dependabot use the `PACKAGES_READ_TOKEN` secret (a token with only `read:packages`). Locally `scripts/with-node.sh` takes the token from `gh`. With the published build: JS 472 kB, CSS 28 kB.
2. **`muiNavLink` + `routerLinkActive`.** Fixed in the spike. `[active]="rla.isActive"` reads a plain property, so the OnPush header never re-rendered it. The header now builds one `isActive()` signal per link (`@angular/router`) and binds `[active]="link.active()"`; `routerLinkActive` is gone. The library needs no change. The mobile nav e2e test now asserts `aria-current="page"` after navigation.
3. **Template refs.** `#ref` on an element with `muiButton` returns the component, not the element; queries need `{ read: ElementRef }`.
4. **Name clash.** Library `NavLink` collides with the header's own `NavLink` type; import with an alias.
5. **Mobile menu.** `mui-mobile-nav` has `mui-mobile-nav-item` children and reads as a bottom tab bar, not a hamburger menu. Not verified in a browser; the header keeps its own menu for now.

### Migration status (2026-11-15, library 2026.46.3)

Every general UI piece of the blog now comes from `@mushilu-san/ui`:

| Blog piece | Library component |
|---|---|
| Site header with its mobile menu | `mui-site-header` |
| Header and footer links | `muiNavLink` |
| Language link, theme button, home hero actions, 404 home link | `muiButton` |
| Language badge, entry type on a row, result type in search | `mui-badge` |
| Tag chips, `nb-tag-list` | `muiChip` |
| List pagination | `mui-pagination` in link mode (`hrefFor`) |
| Certificate viewer | `mui-dialog` |
| Empty certificates list | `mui-empty` |
| Table of contents, "more tags" | `mui-accordion-item` |
| Skip link | `muiSkipLink` |
| Search field, type and tag filters, their labels | `muiInput`, `muiSelect`, `mui-label` |
| Back to top | `mui-fab` (extended) |
| All icons (menu, theme, RSS, GitHub, arrows) | `mui-icon` |
| Colors and fonts | `--mui-*` tokens mapped onto `--nb-*` in `src/styles/_mui-map.scss` |

The gaps found on the way (library issues #875 to #882, then #884 and #885) are all fixed; the blog is on 2026.46.3 and has no `::ng-deep` rule left.

Still blog code, on purpose: `nb-article-body`, `nb-entry-card` rows, `nb-series-tiles`, `nb-series-nav`, `nb-related-list`, `nb-entry-meta` and the reading progress bar. They are content layouts of this blog, not general UI. `mui-container`, `mui-stack` and `mui-typography` are not used: the blog's CSS classes do the same with no extra elements, and `mui-typography` renders `role="heading"` instead of native headings.

Behaviour that changed with the library header: the menu collapses below 48rem (was 640px), opens in the page flow instead of over it, and Escape closes it only while focus is inside the header.

Size: JS loaded by pages 496 → 522 kB, CSS 28 kB. The build also emits a 206 kB chart.js chunk that no page requests (it loads only if `mui-chart` renders). 240 unit and 192 e2e tests pass.

## Second review (2026-11-16, live site after the library migration)

Checked home, posts, post, series, search, certificates, accessibility and 404, at 1280px and 375px, light and dark. Fixed in one change:

| Finding | Fix |
|---|---|
| Search field not focused on load, with a console `TypeError` (the template ref on `muiInput` returned the library component) | Query reads `ElementRef`; e2e asserts focus |
| Back-to-top button covered the footer links | Hidden over the last 700px of the page |
| Series bar arrows far apart and pale | 32px discs with a 44px hit area, 8px apart |
| End of post left the TOC side empty | Series nav and related posts span the full width; related posts in columns |
| Series descriptions cut mid-word | No line clamp |
| Hero left 40% of the row empty on desktop | Totals (posts, series, notes) on the far side; a row under the actions on mobile |
| Tag chips competed with post titles | Tags in `nb-tag-list` have no outline and muted text |
| "More tags" was a full-width ruled row | As wide as its label, no rules |
| Search silently showed 50 of N results | A line says how many are shown and how to narrow down |

Not checked in this pass: English inner pages and tablet widths by eye, a screen reader pass, loading speed.

