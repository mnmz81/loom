---
title: "pre-commit: run checks before every commit"
summary: "Set up the pre-commit framework: a .pre-commit-config.yaml, pre-commit install, what happens when a hook fails or fixes files, running on all files, updating hook versions and skipping safely."
date: 2026-10-19
tags: [git, dev-tools, cli]
series: { key: mac-dev-setup, order: 6 }
---

A Git hook is a script Git runs at a certain moment, such as just before a commit. [pre-commit](https://pre-commit.com/) is a framework that manages those scripts for you: you list the checks in one file, share it with the team, and every commit runs them on the staged files. Every command ran with pre-commit 4.7.

## Install

```bash
uv tool install pre-commit
```

`brew install pre-commit` works too. The [previous post](en/posts/uv-tools/) explains `uv tool`.

## Configure

Create `.pre-commit-config.yaml` in the root of the repository. `pre-commit sample-config` prints a starting point. Each entry is a repository of hooks, pinned to a tag in `rev`:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v6.0.0
    hooks:
      - id: end-of-file-fixer
      - id: check-yaml
```

`end-of-file-fixer` makes every file end with one newline. `check-yaml` checks that YAML files parse. The catalog at [pre-commit.com/hooks.html](https://pre-commit.com/hooks.html) lists many more.

## Turn it on

The config does nothing until you install the Git hook, once per clone:

```bash
pre-commit install
```

```text
pre-commit installed at .git/hooks/pre-commit
```

Hooks are not part of the repository, so every teammate must run this after cloning. Say so in the README.

## What a commit looks like now

The first run installs each hook's environment, which takes a moment. When a hook changes a file, the commit is blocked so you can look at the change:

```text
fix end of files.........................................................Failed
- hook id: end-of-file-fixer
- exit code: 1
- files were modified by this hook

Fixing b.txt
```

Stage the fixed file with `git add` and commit again. The second run passes. Only the files in the commit are checked, and hooks that have no matching files are skipped.

## Run by hand and update

```bash
pre-commit run --all-files
pre-commit autoupdate
```

Run `--all-files` after adding a new hook, so existing files are checked too. `autoupdate` bumps every `rev` to the latest tag, so look at the diff before committing it.

## Skipping

`git commit --no-verify` skips every hook, and `SKIP=check-yaml git commit` skips one by id. Use them for an emergency, not as a habit. If the hooks are slow or noisy, people start skipping them.

Next: [gitleaks](en/posts/gitleaks/), a hook worth adding first.
