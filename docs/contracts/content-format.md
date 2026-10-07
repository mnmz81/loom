# Contract: content format (source Markdown)

Consumed by: pipeline (`scripts/content`), seed content (`content/`), Notion sync (`scripts/notion`), CMS (`public/admin`).
Output JSON shape lives in `src/app/core/content.models.ts`; sample output in `src/testing/fixtures/content/`.

## Layout

```
content/
  posts/<slug>/he.md        # a post in Hebrew
  posts/<slug>/en.md        # optional translation (same folder = same entry)
  notes/<slug>/he.md|en.md  # short notes / TIL
  series/<key>.yaml         # one file per series
  tags.yaml                 # optional display labels per tag
public/images/<slug>/...    # images, referenced as /images/<slug>/file.png
```

- `<slug>` and `<key>`: lowercase Latin kebab-case `^[a-z0-9]+(-[a-z0-9]+)*$`. The slug is the URL and the translation key (Hebrew titles still get a Latin slug).
- An entry folder holds 1–2 files named exactly `he.md` / `en.md`. Anything else in the folder is an error.
- Same slug under both `posts/` and `notes/` is an error.

## Frontmatter (YAML, strict — unknown keys fail the build)

Quote `title` and `summary` values (they often contain `: `). Unquoted `YYYY-MM-DD` dates are fine (the pipeline normalizes YAML dates).

### Post (`content/posts/<slug>/<lang>.md`)
| Key | Type | Rules |
|---|---|---|
| `title` | string | required, non-empty |
| `summary` | string | required, 1–200 chars |
| `date` | `YYYY-MM-DD` | required |
| `updated` | `YYYY-MM-DD` | optional, ≥ `date` |
| `tags` | string[] | required, ≥ 1, each kebab-case Latin |
| `draft` | boolean | optional, default `false` |
| `cover` | string | optional, starts with `/images/` |
| `series` | `{ key: string, order: int ≥ 1 }` | optional; `key` must exist in `content/series/`; `order` unique within the series |

### Note (`content/notes/<slug>/<lang>.md`)
| Key | Type | Rules |
|---|---|---|
| `title` | string | required |
| `date` | `YYYY-MM-DD` | required |
| `updated` | `YYYY-MM-DD` | optional |
| `tags` | string[] | required, ≥ 1, kebab-case |
| `draft` | boolean | optional |

### Translations
`date`, `tags`, `series` and `cover` are shared facts: when both `he.md` and `en.md` exist they must be equal, otherwise the build fails naming both files. `title`, `summary`, `updated`, `draft` and the body are per language. A draft translation is treated as missing in production.

## `content/series/<key>.yaml`
```yaml
title:
  he: לומדים ראסט      # required
  en: Learning Rust    # required
description:            # optional, per language
  he: הערות מהדרך ללמוד ראסט.
  en: Notes from learning Rust.
```
A series with no published posts is still listed (empty).

## `content/tags.yaml` (optional)
```yaml
rust: { he: ראסט, en: Rust }
angular: { he: אנגולר, en: Angular }
```
Keys must be kebab-case. Missing tag or language → label = the key.

## Body
CommonMark + GFM tables/linkify; raw HTML disabled. Fenced code with a language gets Shiki highlighting (light + dark). `##` and `###` headings form the TOC. Images: `![alt](/images/<slug>/x.png)`. Code blocks always render left-to-right.

## Example
```markdown
---
title: "ראסט: השאלה (Borrowing)"
summary: "איך & ו-&mut עובדים ולמה הקומפיילר מתלונן."
date: 2026-10-05
tags: [rust]
series: { key: learning-rust, order: 2 }
---

טקסט בעברית...

## דוגמה

​```rust
let x = 1;
​```
```
