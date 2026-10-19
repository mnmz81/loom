#!/usr/bin/env python3
"""Print the Notion index page (Markdown) for a series, in the format used under
"Loom — מרכז → בבלוג (פורסם)".

Usage: python3 scripts/notion-series-index.py <series-key> [published-date] [--updated DATE] [--prefix SLUG]
  e.g. python3 scripts/notion-series-index.py ai-rag 2026-10-13 --updated 2026-10-19
  --prefix SLUG  only SLUG and SLUG-* (one guide that was split into several posts of a bigger series)
"""
import argparse
import re
import sys
from pathlib import Path

SITE = "https://mnmz81.github.io/loom"
ROOT = Path(__file__).resolve().parent.parent


def frontmatter(path):
    text = path.read_text(encoding="utf-8").split("---", 2)[1]
    data = {}
    for line in text.splitlines():
        m = re.match(r"^(\w+):\s*(.*)$", line)
        if m:
            data[m.group(1)] = m.group(2).strip().strip('"')
    series = re.search(r"key:\s*([\w-]+).*?order:\s*(\d+)", text, re.S)
    if "series:" in text and series:
        data["series_key"], data["order"] = series.group(1), int(series.group(2))
    return data


def series_meta(key):
    text = (ROOT / "content/series" / f"{key}.yaml").read_text(encoding="utf-8")
    meta = {}
    for block in ("title", "description"):
        part = text.split(f"{block}:", 1)[1]
        for lang in ("he", "en"):
            meta[f"{block}_{lang}"] = re.search(rf"^\s+{lang}:\s*(.*)$", part, re.M).group(1).strip().strip('"')
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("key")
    ap.add_argument("published", nargs="?")
    ap.add_argument("--updated")
    ap.add_argument("--prefix")
    args = ap.parse_args()
    key = args.key
    meta = series_meta(key)
    posts = []
    for folder in sorted((ROOT / "content/posts").iterdir()):
        en, he = folder / "en.md", folder / "he.md"
        if not en.exists() or not he.exists():
            continue
        if args.prefix and folder.name != args.prefix and not folder.name.startswith(args.prefix + "-"):
            continue
        fe, fh = frontmatter(en), frontmatter(he)
        if fe.get("series_key") == key:
            posts.append((fe["order"], folder.name, fe["title"], fh["title"], fe["date"]))
    posts.sort()
    date = args.published or posts[0][4]
    updated = args.updated or date
    if args.prefix:
        first = posts[0]
        print(f"TITLE: {first[2]}")
        print(
            f"פורסם בבלוג, {date}. Last updated: {updated}. "
            f"חלק מהסדרה [{meta['title_en']}]({SITE}/en/series/{key}/) "
            f"(גרסה עברית: [{meta['title_he']}]({SITE}/he/series/{key}/))."
        )
        print(f"המדריך מחולק ל-{len(posts)} פוסטים קצרים. הדף הזה הוא אינדקס בלבד: הפוסטים המלאים באתר.")
    else:
        print(f"TITLE: {meta['title_en']}")
        print(
            f"פורסם בבלוג, {date}. Series page: [{SITE}/en/series/{key}/]({SITE}/en/series/{key}/) "
            f"(גרסה עברית: [{SITE}/he/series/{key}/]({SITE}/he/series/{key}/)). Last updated: {updated}."
        )
        print(f"{meta['description_he']} הדף הזה הוא אינדקס בלבד: הפוסטים המלאים באתר.")
    print("## פוסטים")
    for i, (order, slug, t_en, t_he, d) in enumerate(posts, 1):
        print(
            f"{i if args.prefix else order}. {t_en} / {t_he} ({d}): [English]({SITE}/en/posts/{slug}/) \\| [עברית]({SITE}/he/posts/{slug}/)"
        )

if __name__ == "__main__":
    main()
