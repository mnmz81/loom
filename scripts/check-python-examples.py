#!/usr/bin/env python3
"""Runs every ```python block of a post and compares it with the ```text block right after it.

Usage: python3 scripts/check-python-examples.py content/posts/python-lists/en.md [more.md ...]
       python3 scripts/check-python-examples.py --fill draft.md   # write the real output into each ```text block
       PYTHON=python3.13 python3 scripts/check-python-examples.py content/posts/python-*/en.md

Blocks share state like one session: each block runs after the earlier blocks of the same file (their output
is not compared again; blocks that raised are left out). A block that ends in an exception passes
when the expected text contains the traceback's last line; a block that does not compile (a syntax error demo)
runs on its own. Blocks that call input() are skipped. Exit code 1 on any mismatch.
"""
import os
import re
import subprocess
import sys

PYTHON = os.environ.get("PYTHON", "python3.13")
BLOCK = re.compile(r"^```(\w*)\n(.*?)^```\n", re.S | re.M)


def pairs(markdown):
    blocks = [(m.group(1), m.group(2), m.end(), m.start()) for m in BLOCK.finditer(markdown)]
    for (lang, code, end, _), nxt in zip(blocks, blocks[1:] + [None]):
        if lang != "python":
            continue
        expected = None
        if nxt and nxt[0] == "text" and markdown[end:nxt[3]].strip() == "":
            expected = nxt[1]
        yield code, expected


def run(code):
    if not code:
        return "", ""
    proc = subprocess.run([PYTHON, "-c", code], capture_output=True, text=True, timeout=20)
    return proc.stdout, proc.stderr


def fill(path):
    """Replaces every ```text block that follows a ```python block with the block's real output."""
    text = open(path, encoding="utf-8").read()
    parts, last, prefix = [], 0, ""
    blocks = list(BLOCK.finditer(text))
    for cur, nxt in zip(blocks, blocks[1:] + [None]):
        if cur.group(1) != "python" or "input(" in cur.group(2):
            continue
        out, err, prefix = step(prefix, cur.group(2))
        if not nxt or nxt.group(1) != "text" or text[cur.end():nxt.start()].strip():
            continue
        shown = out + (err.strip().splitlines()[-1] + "\n" if err.strip() else "")
        parts.append(text[last:nxt.start()] + "```text\n" + shown + "```\n")
        last = nxt.end()
    parts.append(text[last:])
    open(path, "w", encoding="utf-8").write("".join(parts))
    print(f"filled {path}")


def step(prefix, code):
    """Runs `code` after `prefix`; returns its own output and the prefix for the next block."""
    try:
        compile(code, "<block>", "exec")
        base = prefix
    except SyntaxError:
        base = ""
    before, _ = run(base)
    out, err = run(base + code)
    out = out[len(before):] if out.startswith(before) else out
    return out, err, (prefix + code if not err else prefix)


def main(paths):
    if paths and paths[0] == "--fill":
        for path in paths[1:]:
            fill(path)
        return 0
    failed = 0
    for path in paths:
        text = open(path, encoding="utf-8").read()
        prefix = ""
        for i, (code, expected) in enumerate(pairs(text), 1):
            if "input(" in code:
                continue
            out, err, prefix = step(prefix, code)
            if expected is None:
                continue
            last_err = err.strip().splitlines()[-1] if err.strip() else ""
            # Output shown on one line "to save space" is compared without line breaks.
            squash = lambda s: " ".join(s.split())
            ok = out.rstrip() == expected.rstrip() or squash(out) == squash(expected)
            if err and last_err:
                ok = squash(last_err) in squash(expected) and squash(out) in squash(expected)
            if not ok:
                failed += 1
                print(f"✗ {path} block {i}\n--- code\n{code}--- expected\n{expected}--- got\n{out}{err}")
    print(f"{'FAIL' if failed else 'ok'}: {failed} mismatching block(s) in {len(paths)} file(s)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
