#!/usr/bin/env python3
"""Type-checks and runs every ```typescript block of a post and compares it with the ```text block right after it.

Usage: ./scripts/with-node.sh python3 scripts/check-ts-examples.py content/posts/typescript-basics/en.md [more.md ...]
       ./scripts/with-node.sh python3 scripts/check-ts-examples.py --fill draft.md   # write the real output in
       TSC7="npx -y -p typescript@7.0.2 tsc" ./scripts/with-node.sh python3 scripts/check-ts-examples.py post.md

Each block is its own file (named by a first-line comment such as `// user.ts`, else `example.ts`), checked with
the repo's tsc (`--noEmit --ignoreConfig`, so the compiler defaults apply) and then run with `node` (type
stripping, runs even when tsc reports errors). The real output is the tsc diagnostics, then node's stdout, then
the last line of node's stderr. A block passes when every line of its ```text block appears in that output.
With TSC7 set, the diagnostics of that compiler must match the repo tsc's. Exit code 1 on any mismatch.
"""
import os
import re
import shlex
import subprocess
import sys
import tempfile

TSC = os.environ.get("TSC", "node_modules/.bin/tsc")
TSC7 = os.environ.get("TSC7")
BLOCK = re.compile(r"^```(\w*)\n(.*?)^```\n", re.S | re.M)
NAME = re.compile(r"^// ([\w.-]+\.ts)\n")


def check(tsc, path):
    cmd = [os.path.abspath(tsc)] if os.path.exists(tsc) else shlex.split(tsc)
    proc = subprocess.run(cmd + ["--noEmit", "--ignoreConfig", "--pretty", "false", os.path.basename(path)],
                          capture_output=True, text=True, timeout=120, cwd=os.path.dirname(path))
    return proc.stdout.strip()


def run(code):
    """Returns (real output, diagnostics from TSC7 or None)."""
    with tempfile.TemporaryDirectory() as tmp:
        m = NAME.match(code)
        path = os.path.join(tmp, m.group(1) if m else "example.ts")
        open(path, "w", encoding="utf-8").write(code)
        diagnostics = check(TSC, path)
        node = subprocess.run(["node", path], capture_output=True, text=True, timeout=20, cwd=tmp)
        err = node.stderr.strip().splitlines()
        errors = [l for l in err if re.match(r"^\w*Error\b", l)]
        out = "\n".join(filter(None, [diagnostics, node.stdout.rstrip("\n"), (errors or err or [""])[-1]]))
        return out + "\n" if out else "", check(TSC7, path) if TSC7 else None


def blocks(text):
    found = list(BLOCK.finditer(text))
    for cur, nxt in zip(found, found[1:] + [None]):
        if cur.group(1) != "typescript":
            continue
        follows = nxt and nxt.group(1) == "text" and not text[cur.end():nxt.start()].strip()
        yield cur, nxt if follows else None


def main(argv):
    fill = "--fill" in argv
    failed = False
    for path in [a for a in argv if a != "--fill"]:
        text = open(path, encoding="utf-8").read()
        parts, last = [], 0
        for i, (cur, expected) in enumerate(blocks(text), 1):
            actual, seven = run(cur.group(2))
            six = "\n".join(l for l in actual.splitlines() if ": error TS" in l)
            if seven is not None and seven != six:
                failed = True
                print(f"{path} block {i}: TSC7 diagnostics differ\n--- repo tsc\n{six}\n--- TSC7\n{seven}")
            if not expected:
                continue
            if fill:
                parts.append(text[last:expected.start()] + "```text\n" + actual + "```\n")
                last = expected.end()
                continue
            missing = [l for l in expected.group(2).splitlines() if l.strip() and l not in actual.splitlines()]
            if missing:
                failed = True
                print(f"{path} block {i}: expected lines not in output: {missing}\n--- real output\n{actual}")
        if fill:
            open(path, "w", encoding="utf-8").write("".join(parts) + text[last:])
            print(f"filled {path}")
        elif not failed:
            print(f"ok {path}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
