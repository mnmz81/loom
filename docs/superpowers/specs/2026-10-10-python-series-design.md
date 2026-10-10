# Python series — design

Date: 2026-10-10

## Goal
A series of short Python posts on the blog, one post per topic, written while the author works through a Udemy Python course. The course only sets the order of topics. It is not a source, and nothing from it is copied. Posts are an independent explanation of the topic in Python.

Not a "100 days" series: no day numbers, no fixed length. Topics are added as they come up.

## Workflow (per post)
1. Author sends a topic (e.g. "for loops", "dictionaries").
2. Claude checks the official docs (docs.python.org) and runs every code example with a real Python, so shown output is real.
3. Claude writes `content/posts/python-<topic>/en.md` and `he.md`: same facts, same structure, same code, matching `date`, `tags`, `series`.
4. Claude updates the series Notion page (see below).
5. `npm run build` and `npm run test:scripts` pass, then commit and push.

## Post shape
- About 400–700 words. Short and focused.
- 2–4 code examples that were actually run, with their output.
- One "common mistake" per post where it fits.
- A link to the previous / next post in the series where they exist.
- No diagrams unless the topic really needs one (then `scripts/diagrams/` + `public/images/<slug>/`, as in existing posts).
- Hebrew follows the project's Hebrew rules: neutral address, code blocks `dir="ltr"`.

## Content structure
- `content/series/python.yaml` — title he "פייתון מהיסוד" / en "Python step by step" (final wording at first post), short description in both languages.
- Each post: `series: { key: python, order: N }`, tags `[python, tutorial]`.
- `content/tags.yaml`: add `python: { he: Python, en: Python }`.
- Slugs: `python-<topic>` in kebab-case Latin, e.g. `python-for-loops`.
- No contract changes: only existing frontmatter fields are used.

## Notion
One page for the whole series under **Loom — מרכז → בבלוג (פורסם)**, not one page per post.
- Created after the first post is deployed.
- Holds an index of posts (title, link to the live post, date) and is updated each time a post is added.
- Carries the "published" line and a "Last updated" date, as the repo rules require.
- Post bodies are not duplicated in Notion; the page links to the live posts.

## Out of scope
- Day numbering, a fixed topic list, or generating the whole series at once.
- Course material: no transcripts, screenshots, exercise text or project code from the course.
- New components, routes or dependencies.

## Success criteria
- Each topic the author names becomes a verified en+he post in the same session.
- The series page on the site lists posts in order; the Notion series page lists them all.
- Build and script tests are green before every push.
