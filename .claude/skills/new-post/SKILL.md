---
name: new-post
description: Write a new Loom blog post (or note) in Hebrew and English, or substantially edit one, end to end — scaffold, research against official docs, write both languages, images, tags, cross-links, verify, commit. Use when asked to write, add or publish a post, continue a series (e.g. "the next Python post").
---

# New post

The checklist that every post goes through. Do the steps in order; do not skip one because the post is short.
Run every command with `./scripts/with-node.sh` (system Node is 20).

## 1. Scaffold

```bash
./scripts/with-node.sh npm run new-post -- <slug> --tags <tag1,tag2> [--series <key>] [--note]
```

- Creates `content/posts/<slug>/he.md` + `en.md` as **drafts** with identical `date`, `tags`, `series` (next free order is computed).
- Slug: lowercase Latin kebab-case; for a series, follow its existing prefix (`python-…`).
- Tags: reuse existing ones from `content/tags.yaml`. A new tag needs a label line there (`<tag>: { he: …, en: … }`); the script lists unlabeled tags.
- New series: create `content/series/<key>.yaml` first (`title.he/en`, `description.he/en`).

## 2. Research before writing

- Fetch the **official docs** of the topic (docs.python.org, git-scm.com, docs.github.com, the tool's `--help`). Verify every command, flag, setting path and claim. Do not rely on memory.
- Run every code example locally and paste real output. State the version used ("every example ran with Python 3.13").
- Python posts: `PYTHON=python3.13 python3 scripts/check-python-examples.py content/posts/<slug>/en.md` runs every block and compares it with the output block after it (`--fill` writes the real output in).
- TypeScript posts: `TSC7="npx -y -p typescript@7.0.2 tsc" ./scripts/with-node.sh python3 scripts/check-ts-examples.py content/posts/<slug>/en.md` type-checks every ```typescript block with the repo's tsc 6.0 (and TS 7), runs it with Node, and compares with the ```text block after it (`--fill` writes the real output in). Name the file with a first-line comment (`// user.ts`).
- Reordering or retagging: `npx tsx scripts/set-shared.ts` changes `tags` / `series` in both files at once (`--series-order <key> <slug>...` renumbers a series); then fix the "What's next" paragraphs that point at the old order.
- Prices, plans and UI paths change: hedge or link instead of stating them.
- Read the previous post in the series and match its structure and tone.
- Plan the length before writing: **6 minutes max per language** (about 1,200 words, code included). If the outline won't fit, split it into several posts (a series) now, not after writing.
- Repo docs: `docs/contracts/content-format.md` (layout, frontmatter, tags) and `docs/notion-setup.md` (publishing flow, Notion copy).

## 3. Write both languages

- Hebrew first (default language), then English with the **same facts and same structure**.
- **No padding.** Each idea once: no intro that restates the title, no "as mentioned", no recap at the end, no prose that repeats what a code block or table already shows. One example per point. Cut every sentence that adds no fact.
- The build enforces parity: same number of `##` / `###` headings, same number of code blocks, same images (`scripts/content/parity.ts`). Code blocks may differ only in comments.
- Fill `title` and `summary` (1–200 characters, check the length) in each language; remove `draft: true` from both when done.
- Hebrew: natural Israeli Hebrew, gender-neutral address (plural "אתם" or impersonal). Run the `hebrew-localization:hebrew-ai-tells` skill on the Hebrew draft when it is available.
- Link to the official docs inline, in both languages.
- Code blocks always have a language (` ```python `); they render LTR automatically.

## 4. Images

- Diagrams are generated, never hand-edited: add or extend `scripts/diagrams/<topic>-diagrams.ts` (helpers in `scripts/diagrams/lib.ts`), run it with `./scripts/with-node.sh npx tsx scripts/diagrams/<file>.ts`, output goes to `public/images/<slug>/`.
- Reference images as `/images/<slug>/<file>.svg`, the same files in both languages.
- `cover` (optional) must be identical in both files.

## 5. Cross-links

- Series posts get prev/next automatically; add inline links only where a concept is explained in an earlier post.
- Update related posts and cheat sheets (e.g. `git-commands`, `linux-commands`) that should point to the new post, in both languages.
- Update `README.md` / `docs/` only if the change affects them.

## 6. Verify

```bash
./scripts/with-node.sh npm run test:scripts
./scripts/with-node.sh npm run build
```

Both must pass. Fix the content, never the validation, unless the user asks.

Check the length: `python3 scripts/reading-time.py <slug>` — both languages ≤ 6 min. Then re-read each language once only for repetition and cut it, even when under the limit.

## 7. Commit

- One commit per post (or per batch of series posts): `content: <series> post <n> - <topic> (en + he)`.
- Commit and push to `main` (deploys the site).

## 8. Notion copy (do it, don't hand it to the user)

After the site is deployed (`gh run list` shows the Deploy run green; image URLs must point to the live site), create or update the page under **Loom — מרכז → בבלוג (פורסם)** yourself through the Notion connector: keep the "published" line, bump `updated` / "Last updated" when editing an existing post.

- Series post: add its line to the series index page (`python3 scripts/notion-series-index.py <series-key>` prints the lines).
- Standalone post or guide: a full-content page (`python3 scripts/notion-post-body.py <slug>` prints it with live-site links and images).
- Existing posts you changed (cross-links): update their Notion pages the same way.
