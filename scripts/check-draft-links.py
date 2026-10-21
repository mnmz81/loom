#!/usr/bin/env python3
"""Lists links in published (non-draft) posts that point to a post that is missing or still a draft
in that language, i.e. links that would 404 on the live site. Exit 1 if any.
Usage: python3 scripts/check-draft-links.py [slug ...]   (no slugs: every published post)
       Slugs given are treated as published even if they still say draft: true (a batch about to go out).
"""
import pathlib
import re
import sys

POSTS = pathlib.Path(__file__).resolve().parent.parent / "content" / "posts"
LINK = re.compile(r"\]\((?:\.\./)*(he|en)/posts/([a-z0-9-]+)/?[^)]*\)")


def is_draft(path: pathlib.Path) -> bool:
    head = path.read_text(encoding="utf-8").split("---", 2)[1]
    return re.search(r"^draft:\s*true\s*$", head, re.M) is not None


batch = set(sys.argv[1:])


def published(slug: str, lang: str) -> bool:
    f = POSTS / slug / f"{lang}.md"
    return f.exists() and (slug in batch or not is_draft(f))


bad = []
for f in sorted(POSTS.glob("*/*.md")):
    slug, lang = f.parent.name, f.stem
    if not published(slug, lang) or (batch and slug not in batch):
        continue
    for m in LINK.finditer(f.read_text(encoding="utf-8")):
        if not published(m.group(2), m.group(1)):
            bad.append(f"{slug}/{lang}.md -> {m.group(1)}/posts/{m.group(2)}/")
print("\n".join(bad) or "no links to drafts or missing posts")
sys.exit(1 if bad else 0)
