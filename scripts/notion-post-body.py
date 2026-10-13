#!/usr/bin/env python3
"""Print a post as Notion Markdown, in the format used for full-content pages under
"Loom — מרכז → בבלוג (פורסם)" (the English body, with live-site links and images).

Usage: python3 scripts/notion-post-body.py <slug> [published-date] [updated-date]
  e.g. python3 scripts/notion-post-body.py kubernetes-zero-to-hero 2026-10-13
"""
import re
import sys
from pathlib import Path

SITE = "https://mnmz81.github.io/loom"
ROOT = Path(__file__).resolve().parent.parent
LANGS = {"text": "plain text", "js": "javascript", "dockerfile": "docker", "sh": "bash"}


def body_of(path):
    text = path.read_text(encoding="utf-8")
    front, body = text.split("---", 2)[1:]
    date = re.search(r"^date:\s*(\S+)", front, re.M).group(1)
    return date, body.strip("\n")


def inline(line):
    """Absolute links/images and escaped $ outside inline code."""
    line = re.sub(r"\]\((?:en|he)/posts/", f"]({SITE}/en/posts/", line)
    line = line.replace("](/images/", f"]({SITE}/images/")
    parts = re.split(r"(`[^`]*`)", line)
    return "".join(p if p.startswith("`") else p.replace("$", r"\$") for p in parts)


def table(rows):
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    cells = [r for r in cells if not all(re.fullmatch(r":?-+:?", c) for c in r)]
    out = ['<table header-row="true">']
    for r in cells:
        out.append("<tr>")
        out += [f"<td>{inline(c)}</td>" for c in r]
        out.append("</tr>")
    out.append("</table>")
    return out


def convert(body):
    out, rows, in_code = [], [], False
    for line in body.splitlines():
        if line.startswith("```"):
            if not in_code:
                lang = line[3:].strip()
                line = "```" + LANGS.get(lang, lang)
            in_code = not in_code
            out.append(line)
            continue
        if in_code:
            out.append(line)
            continue
        if line.startswith("|"):
            rows.append(line)
            continue
        if rows:
            out += table(rows)
            rows = []
        if line.strip():
            out.append(inline(line))
    if rows:
        out += table(rows)
    return "\n".join(out)


def main():
    slug = sys.argv[1]
    date, body = body_of(ROOT / "content/posts" / slug / "en.md")
    published = sys.argv[2] if len(sys.argv) > 2 else date
    updated = sys.argv[3] if len(sys.argv) > 3 else None
    head = f"פורסם בבלוג, {published}" + (f", עודכן לאחרונה {updated}" if updated else "")
    en, he = f"{SITE}/en/posts/{slug}/", f"{SITE}/he/posts/{slug}/"
    print(f"{head}. Also on the blog: [{en}]({en}) (Hebrew version: [{he}]({he}))")
    print(convert(body))


if __name__ == "__main__":
    main()
