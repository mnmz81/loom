---
name: new-post
description: Write a new Loom blog post (or note) in Hebrew and English, or substantially edit one, end to end — scaffold, research against official docs, write both languages, images, tags, cross-links, verify, commit. Use when asked to write, add or publish a post, continue a series (e.g. "the next Python post"), or when a GitHub issue labeled post-request asks for one.
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
- Prices, plans and UI paths change: hedge or link instead of stating them.
- Read the previous post in the series and match its structure, length and tone.
- Repo docs: `docs/contracts/content-format.md` (layout, frontmatter, tags) and `docs/notion-setup.md` (publishing flow, Notion copy).

## 3. Write both languages

- Hebrew first (default language), then English with the **same facts and same structure**.
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

## 7. Commit

- One commit per post (or per batch of series posts): `content: <series> post <n> - <topic> (en + he)`.
- Locally: commit and push to `main` (deploys the site).
- In GitHub Actions (a `post-request` issue): never push to `main`. Commit to the branch the action created; the action replies on the issue with a link to open the PR. In that reply, give the slug, both titles, and "Closes #<issue>" for the PR description.

## 8. Notion copy (manual, local only)

After the site is deployed (image URLs must point to the live site), create or update the page under **Loom — מרכז → בבלוג (פורסם)**: keep the "published" line, bump `updated` / "Last updated" when editing an existing post.
In GitHub Actions there is no Notion access: skip this step and list it under "Still to do" in the PR description.
