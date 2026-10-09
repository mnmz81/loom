# Loom

A personal, bilingual learning blog / knowledge base — long **posts** and short **notes** (TIL) about things I learn, written so I can find them again later.

- Hebrew by default (RTL, `/he/...`), English optional (`/en/...`). Untranslated entries show an "only in X" badge.
- Full-text search (Pagefind), tags, series, table of contents, related posts, code copy, dark mode, RSS per language.
- Angular 22, prerendered to static HTML (SSG, zoneless, signals).
- Live at <https://mnmz81.github.io/loom/>.

## Prerequisites

- **Node 24** via [nvm](https://github.com/nvm-sh/nvm) (`.nvmrc` pins it). The system Node may be older, so run every command through the wrapper:

  ```bash
  nvm install                       # once, installs the version in .nvmrc
  ./scripts/with-node.sh npm ci     # install dependencies
  ```

## Commands

Prefix each with `./scripts/with-node.sh`.

| Command | What it does |
|---|---|
| `npm start` | Build content **including drafts**, then run the dev server |
| `npm run build` | Content → OG images → `ng build` → postbuild (Pagefind, 404) into `dist/` |
| `npm test` | Angular unit tests (vitest) |
| `npm run test:scripts` | Node script tests (`scripts/**/*.test.ts`) |
| `npm run build:e2e` | Build with the sample entries from `e2e/content` added (test data, never published) |
| `npm run e2e` | Playwright + axe end-to-end tests — run `npm run build:e2e` first |
| `npm run sync:notion` | Pull pages from Notion into `content/` (see `docs/notion-setup.md`) |

## Writing guide

The full, authoritative rules (every key, validation, error cases) are in [`docs/contracts/content-format.md`](docs/contracts/content-format.md). The build fails on unknown frontmatter keys, so stick to the templates below.

### Layout at a glance

```
content/
  posts/<slug>/he.md   # post, Hebrew
  posts/<slug>/en.md   # optional English translation
  notes/<slug>/he.md   # short note (and/or en.md)
  series/<key>.yaml    # one file per series
  tags.yaml            # display labels for tags
public/images/<slug>/  # images for an entry
```

- `<slug>` is lowercase Latin kebab-case (`rust-borrowing`), even for Hebrew-only entries. It is the URL and links the translations together.
- An entry folder contains only `he.md` and/or `en.md`.
- Quote `title` / `summary` values — Hebrew titles often contain `: `, which is invalid in plain YAML.

### Add a post

Create `content/posts/<slug>/he.md`:

````markdown
---
title: "ראסט: השאלה (Borrowing)"
summary: "משפט אחד שמסביר על מה הפוסט (עד 200 תווים)."
date: 2026-10-05
tags: [rust]
---

פסקת פתיחה.

## כותרת משנה

```rust
let x = 1;
```
````

English (`content/posts/<slug>/en.md`):

```markdown
---
title: "Rust: borrowing"
summary: "One sentence about what the post covers (max 200 chars)."
date: 2026-10-05
tags: [rust]
---

Intro paragraph.

## A subheading
```

Optional post keys: `updated: 2026-10-10`, `draft: true`, `cover: /images/<slug>/cover.png`, `series: { key: learning-rust, order: 3 }`.

`##` and `###` headings build the table of contents. Always give fenced code blocks a language (`rust`, `ts`, `bash`, …) for highlighting.

### Add a note

Notes have no `summary`, `cover` or `series`. `content/notes/<slug>/he.md`:

```markdown
---
title: "ביטול הקומיט האחרון ב-git"
date: 2026-09-28
tags: [git]
---

הסבר קצר ודוגמה אחת.
```

`content/notes/<slug>/en.md`:

```markdown
---
title: "Undo the last git commit"
date: 2026-09-28
tags: [git]
---

A short explanation and one example.
```

### Add a translation

Add the other language file in the **same folder**. `date`, `tags`, `series` and `cover` must be identical in both files (the build fails otherwise). `title`, `summary`, `updated`, `draft` and the body are per language.

### Add a series

1. Create `content/series/<key>.yaml`:

   ```yaml
   title:
     he: לומדים ראסט
     en: Learning Rust
   description:          # optional
     he: הערות מהדרך ללמוד ראסט.
     en: Notes from learning Rust.
   ```

2. In each post of the series: `series: { key: <key>, order: <n> }` — `order` starts at 1 and is unique within the series.

### Add a tag label

Tags are kebab-case keys (`tags: [rust, angular]`). To show a nicer label, add it to `content/tags.yaml`; otherwise the key itself is shown.

```yaml
rust: { he: ראסט, en: Rust }
```

### Drafts

Add `draft: true`. Drafts show up in `npm start` but are excluded from `npm run build`. A draft translation counts as missing in production.

### Images

Put files in `public/images/<slug>/` and reference them from the site root (no `/loom/` prefix — it is added automatically):

```markdown
![Borrow checker error](/images/rust-borrowing/error.png)
```

## Deploy

A GitHub Actions workflow (`.github/workflows/`) builds the site and deploys it to **GitHub Pages** (Settings → Pages → Source: GitHub Actions). The site is served under the base path **`/loom/`** (`baseHref: /loom/`); `/` redirects to `/he/`.

## Authoring roadmap

1. **Markdown in the repo** — now. Write files in `content/` as described above.
2. **Notion sync** — write in a Notion database, run `npm run sync:notion` (or the scheduled workflow) to generate the same Markdown files. Setup: `docs/notion-setup.md`.
3. **Web CMS** — edit in the browser at `/loom/admin/` (Sveltia CMS, commits to the repo). Setup: `docs/cms-setup.md`.

All three produce the same `content/` format, so they can be mixed.
