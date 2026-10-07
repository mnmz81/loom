# Writing posts and notes in Notion

Markdown in `content/` is the source of truth (format: `docs/contracts/content-format.md`). Notion is optional: write there, sync, review the PR, merge.

## One-time setup

1. **Create an integration:** https://www.notion.so/profile/integrations → New integration (internal) → copy the secret (`ntn_...`).
2. **Create a database** (full page), e.g. "Notebook", with these properties (names are case-sensitive):

   | Property     | Type         | Required                    | Becomes                              | Notes                                                                                                                                                                                    |
   | ------------ | ------------ | --------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | Title        | Title        | yes                         | `title`                              | Per language. Hebrew is fine                                                                                                                                                             |
   | Slug         | Text         | when the title is not Latin | folder name `<slug>`                 | Lowercase Latin kebab-case, e.g. `rust-borrowing`. Empty → the Latin title in kebab-case. A Hebrew (or mixed) title **without** a Slug is rejected. Translations must have the same Slug |
   | Kind         | Select       | yes                         | `content/posts/` or `content/notes/` | Options: `Post`, `Note`                                                                                                                                                                  |
   | Lang         | Select       | yes                         | `he.md` / `en.md`                    | Options: `he`, `en`                                                                                                                                                                      |
   | Status       | Status       | yes                         | —                                    | Options include `Draft` and `Published`; **only `Published` syncs**                                                                                                                      |
   | Tags         | Multi-select | yes (≥ 1)                   | `tags`                               | Converted to kebab-case (`Web Dev` → `web-dev`). Use Latin names; display labels per language live in `content/tags.yaml`                                                                |
   | Date         | Date         | yes                         | `date`                               | Publish date (time is dropped)                                                                                                                                                           |
   | Updated      | Date         | no                          | `updated`                            | Per language; for posts must not be before Date                                                                                                                                          |
   | Summary      | Text         | posts: yes                  | `summary`                            | Posts: 1–200 characters. **Ignored for notes**                                                                                                                                           |
   | Series       | Select       | no                          | `series.key`                         | Posts only. Option name = series key, e.g. `learning-rust`; `content/series/<key>.yaml` must already exist in the repo                                                                   |
   | Series order | Number       | when Series is set          | `series.order`                       | Posts only. Whole number ≥ 1, unique within the series                                                                                                                                   |
   | Cover        | Text         | no                          | `cover`                              | Posts only. Path starting with `/images/`, e.g. `/images/rust-borrowing/cover.png` (the file must be in the repo)                                                                        |

   There is no `draft` property: anything not `Published` simply isn't synced.

3. **Connect the integration:** open the database → `•••` → Connections → add your integration.
4. **Copy the data source ID:** database `•••` → Manage data sources → copy the data source ID.
5. **Local:** `cp .env.example .env` and fill both values (`.env` is git-ignored).
6. **GitHub:** repo → Settings → Secrets and variables → Actions → add `NOTION_TOKEN` and `NOTION_DATA_SOURCE_ID`. Then Settings → Actions → General → enable "Allow GitHub Actions to create and approve pull requests".

## Publishing

- **From GitHub:** Actions → "Notion sync" → Run workflow. It pulls every `Published` page, runs `npm run content` to validate, and opens (or updates) the `notion-sync` PR. Review and merge to deploy.
- **Locally:** set Status = Published → `./scripts/with-node.sh npm run sync:notion` → `./scripts/with-node.sh npm start` to preview → commit and push.

Each page is written to `content/<kind>s/<slug>/<lang>.md`, e.g. a Hebrew post with Slug `rust-borrowing` → `content/posts/rust-borrowing/he.md`.

### Hebrew pages and translations

- Hebrew is the default language. A Hebrew page needs `Lang = he` and an explicit Latin **Slug** (the slug is the URL and the translation key).
- A translation is a **separate Notion page** with the **same Slug and Kind** and the other `Lang`. Both land in the same folder (`he.md` + `en.md`).
- Translations must share **Date, Tags, Series / Series order and Cover**; Title, Summary, Updated and the body are per language. The sync rejects pairs that differ.
- A page with no translation is fine: the site shows a "Hebrew only / English only" badge.

### What the sync checks

The sync validates every page before writing anything. If any page is invalid it writes **nothing** and prints all problems at once, each with the page title and Notion URL, e.g.

```
"שלום עולם" (https://www.notion.so/...):
  - Slug is required when the title is not Latin (e.g. Hebrew); set it to lowercase Latin kebab-case
Duplicate post "signals" in en: "Signals" (https://www.notion.so/a) and "Signals v2" (https://www.notion.so/b) (set a different Slug or Lang)
```

Checked: required properties, Kind/Lang options, slug and tag format, summary length, series rules, two pages with the same Slug + Kind + Lang, the same Slug used by a Post and a Note, translation shared facts, a series order used twice, and that the series file exists.

### What the sync never does

- It only writes/overwrites the files of the pages it pulled. It **never deletes** anything: other entries, hand-written translations, and images stay as they are.
- To unpublish: delete `content/<kind>s/<slug>/<lang>.md` (and its images) in the repo. Setting the page back to Draft only stops future syncs from updating it.

## Images

Images in the page body (`![caption](https://...)` as produced by notion-to-md) are downloaded to `public/images/<slug>/<lang>-<n>.<ext>` and the Markdown is rewritten to `/images/<slug>/<lang>-<n>.<ext>`. Limitations:

- Notion file URLs expire after about an hour, so images are always downloaded at sync time; external image URLs are downloaded too.
- Files are numbered by position. Reordering or removing images in Notion overwrites by number; old, now-unused files are left in place (the sync never deletes) — remove them in the PR if needed.
- Images are per language (`he-1.png`, `en-1.png`); a translation that reuses the same picture gets its own copy.
- Unknown extensions are saved as `.png`. Captions become the alt text — write a meaningful caption.
- `Cover` is not downloaded: it must point at a file already in `public/images/`.

## Authoring notes

- Use **Heading 2** and **Heading 3** in Notion. Heading 1 would create a second `<h1>` on the page and is left out of the table of contents.
- Code blocks: set the language on the Notion code block so Shiki can highlight it.
- PRs opened by the "Notion sync" workflow use `GITHUB_TOKEN`, and GitHub does not trigger other workflows for such PRs, so CI does not run on them automatically. The Deploy run on `main` after merge runs all tests; to get CI on the PR first, close and reopen it.
