---
title: "uv: a fast Python package and project manager"
summary: "What uv is and how to use it: the project workflow with uv init, uv add and uv run, the .venv, pyproject.toml and uv.lock, plus uv venv and uv pip for pip-style work."
date: 2026-10-11
tags: [python]
series: { key: python, order: 7 }
---

uv is a tool from Astral, written in Rust, that does what pip does and more. The docs describe it as "an extremely fast Python package manager". It installs packages, creates virtual environments, and can even install Python versions. It also has a project workflow, where it manages the environment and the list of dependencies for you.

Every command here was run with uv 0.11 and Python 3.13. The behavior was checked against the [uv docs](https://docs.astral.sh/uv/).

## Two ways to use uv

uv has two modes:

1. **The project workflow:** `uv init`, `uv add`, `uv run`. uv keeps the dependencies and the environment in sync for you. This is the recommended way for new projects.
2. **The pip-style workflow:** `uv venv` and `uv pip install`. The docs call it "a drop-in replacement for common pip, pip-tools, and virtualenv commands" for projects that aren't ready to switch.

## The project workflow

Create a project:

```bash
uv init uv-demo --python 3.13
cd uv-demo
```

`uv init` creates a `pyproject.toml`, a `main.py`, a `README.md`, a `.python-version` file and a git repository. Then add a dependency:

```bash
uv add requests
```

```text
+ certifi==2026.7.22
+ charset-normalizer==3.5.2
+ idna==3.20
+ requests==2.34.2
+ urllib3==2.8.0
```

uv adds the dependency to `pyproject.toml`:

```toml
dependencies = [
    "requests>=2.34.2",
]
```

and it updates `uv.lock`, a lockfile that the docs describe as "exact information about your project's dependencies" across platforms. The packages are installed in `.venv`.

Run code in the project environment with `uv run`:

```bash
uv run python -c "import requests; print(requests.__version__)"
```

```text
2.34.2
```

You don't have to activate `.venv` yourself. Before each `uv run`, uv checks that the lockfile matches `pyproject.toml`, and that the environment matches the lockfile. Commit `pyproject.toml` and `uv.lock` to git, and skip `.venv`. The `.venv` can be rebuilt from the lockfile.

## The pip-style workflow

If you have a folder without a project, `uv venv` creates a virtual environment at `.venv` in the current directory:

```bash
uv venv --python 3.13
uv pip install six
uv pip list
```

```text
Using CPython 3.13.14
Creating virtual environment at: .venv
+ six==1.17.0
Package Version
------- -------
six     1.17.0
```

`uv pip install` finds the nearest `.venv` by itself, so you don't need to activate it. The docs say it checks `VIRTUAL_ENV`, then `CONDA_PREFIX`, then `.venv` in the current directory or its parents.

Keep in mind that `uv pip` is not pip. The docs say its commands "do not exactly implement the interfaces and behavior" of pip, and that "uv does not rely on or invoke pip". For most everyday commands the result is the same, and it's much faster.

## When to use which

- **New project:** use `uv init`, `uv add` and `uv run`. You get a lockfile for free.
- **Existing project with a `requirements.txt`:** `uv pip install -r requirements.txt` works, and you can switch to the project workflow later.
- **Quick experiment:** `uv venv` and `uv pip install` are enough.

## Common mistakes

- **Editing `uv.lock` by hand.** Change dependencies with `uv add` and `uv remove`, and let uv update the lockfile.
- **Committing `.venv`.** It's machine-specific. Add it to `.gitignore`. `uv init` already does this.
- **Mixing `uv pip` and `pip` in one environment.** Pick one for a project, so you don't end up with two sets of records for the same packages.

## What's next

Next in the series: the rest of the basic syntax, starting with conditions (`if`, `elif`, `else`).
