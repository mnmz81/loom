---
title: "uv for tools, scripts and Python versions"
summary: "Use uv outside a project: run a tool once with uvx, install CLI tools with uv tool install, manage Python versions with uv python, and run single-file scripts with inline dependencies."
date: 2026-10-19
tags: [python, dev-tools, cli]
series: { key: mac-dev-setup, order: 4 }
---

[Python step by step: uv](en/posts/python-uv/) covers projects: `uv init`, `uv add`, `uv run`. This post covers the rest of uv, the parts you use with no project at all. Every command ran with uv 0.11 and is checked against the [uv docs](https://docs.astral.sh/uv/).

```bash
brew install uv
```

## Run a tool once: uvx

`uvx` is short for `uv tool run`. It runs a Python tool in a temporary, cached environment and installs nothing permanently:

```bash
uvx ruff --version
```

```text
ruff 0.17.1
```

Use it for tools you reach for now and then. The first run downloads the tool, the next ones use the cache.

## Install a tool: uv tool install

For tools you use every day, install them so the command is always on your `PATH`. Each tool gets its own isolated environment, so tools never break each other or your projects:

```bash
uv tool install pre-commit
uv tool list
uv tool upgrade --all
uv tool uninstall pre-commit
```

```text
pre-commit v4.7.0
- pre-commit
```

This is the replacement for `pip install` of a command-line tool, and for `pipx`. The environments live under `uv tool dir`.

## Python versions: uv python

```bash
uv python install 3.12
uv python list --only-installed
uv run --python 3.12 python -V
```

```text
Python 3.12.13
```

uv downloads Python builds itself, so you do not need Homebrew or a separate version manager for Python. `--python` picks the version for one run.

## Single-file scripts

A script can declare its dependencies in a comment at the top, in the standard inline format. uv reads it and builds the environment on the fly:

```python
# /// script
# requires-python = ">=3.12"
# dependencies = ["requests"]
# ///
import requests
print(requests.__version__)
```

```bash
uv run script.py
```

```text
2.34.2
```

`uv init --script script.py` creates the header, and `uv add --script script.py rich` adds a dependency to it. One file, no `requirements.txt`, no virtual environment to remember.

Next: [OrbStack](en/posts/orbstack/).
