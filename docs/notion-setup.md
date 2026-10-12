# Writing posts in Notion

Markdown in `content/` is the source of truth (format: `docs/contracts/content-format.md`). Notion is a
place to draft and a copy of what is published; nothing syncs automatically, and there is no integration,
token or workflow.

## Publish a draft from Notion

Write the page in Notion under **Loom — מרכז → בבלוג (פורסם)**, then tell Claude Code on your computer
"publish what's new in the blog". Claude reads **only** the pages under that one Notion page (through the
Notion connector attached to your Claude session), picks type, slug, tags and summary, confirms them with
you, writes `content/posts/<slug>/he.md` + `en.md` with the `new-post` skill, builds, and pushes. It then
adds a "published" line with the post link and date at the top of the Notion page, and does not republish
a page with that line unless you ask ("update X"). Nothing else in your workspace is read.

## Notion copy of a post written in the repo

After the site is deployed (image URLs must point to the live site), Claude creates or updates the page
under the same parent, keeps the "published" line, and bumps `updated` / "Last updated" when an existing
post is edited (step 8 of `.claude/skills/new-post/SKILL.md`).

## Authoring notes

- Use **Heading 2** and **Heading 3**. Heading 1 would create a second `<h1>` on the page and is left out of the table of contents.
- Set the language on every code block so Shiki can highlight it.
- Give images a meaningful caption; it becomes the alt text.
