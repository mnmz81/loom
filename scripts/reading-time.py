#!/usr/bin/env python3
# Usage: python3 scripts/reading-time.py [slug ...]   (no args = every post)
# Prints words and reading minutes (same rule as scripts/content/markdown.ts: 200 wpm, rounded)
# per language, plus how many words to cut to drop one minute.
import glob, os, re, sys

RX = re.compile(r"[^\W_][\w'’-]*", re.U)
root = os.path.join(os.path.dirname(__file__), '..', 'content', 'posts')
slugs = sys.argv[1:] or sorted(os.listdir(root))
for slug in slugs:
    cells = []
    for lang in ('en', 'he'):
        text = open(os.path.join(root, slug, f'{lang}.md')).read().split('---', 2)[2]
        w = len(RX.findall(text))
        m = max(1, round(w / 200))
        cut = max(0, int(w - (m - 0.5) * 200) + 1) if m > 1 else 0
        cells.append(f'{lang} {w:5}w {m:2}m (-1m: {cut:3}w)')
    print(f'{slug:30} ' + ' | '.join(cells))
