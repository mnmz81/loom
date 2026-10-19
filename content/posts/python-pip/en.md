---
title: "pip: installing packages in Python"
summary: "How pip installs third-party packages from PyPI: install, pin versions, list, show, freeze into requirements.txt, uninstall, and why to use a virtual environment with python -m pip."
date: 2026-10-11
tags: [python]
series: { key: python, order: 27 }
---

Python comes with a large standard library, but most real projects use third-party packages too: an HTTP client, a test framework, a data library. pip is the tool that installs them. It downloads packages from the Python Package Index (pypi.org) and puts them where your Python can import them.

Every command here was run with Python 3.13 and pip 26.1, and the usage was checked against the [pip user guide](https://pip.pypa.io/en/stable/user_guide/).

## Use python -m pip

pip is also a command on its own, but the docs recommend running it through the interpreter:

```bash
python3 -m pip --version
```

`python3 -m pip` uses the pip that belongs to that exact Python, which matters when a machine has more than one. On my machine, the plain `pip` command isn't on the PATH at all, while `python3 -m pip` works.

## Use a virtual environment first

A virtual environment is a folder with its own Python packages, so installing into it doesn't touch other projects. The packaging guide says it is "recommended to use a virtual environment when working with third party packages":

```bash
python3 -m venv .venv
source .venv/bin/activate
```

On Windows, activate with `.venv\Scripts\activate`. After activation, `python` and `pip` point to the environment.

## Install a package

```bash
python -m pip install requests
python -c "import requests; print(requests.__version__)"
```

```text
2.34.2
```

The import name and the package name can differ. Your version may be newer.

You can pin a version or set a minimum:

```bash
python -m pip install "requests==2.34.2"
python -m pip install "requests>=2.30"
```

## See what's installed

```bash
python -m pip list
python -m pip show requests
```

`list` prints every package in the environment; `show` details one package, including what it requires and where it's installed:

```text
Name: requests
Version: 2.34.2
License: Apache-2.0
Location: .../.venv/lib/python3.13/site-packages
Requires: certifi, charset_normalizer, idna, urllib3
Required-by:
```

`pip list --outdated` shows which packages have newer versions.

## Save the list: requirements.txt

`freeze` prints every installed package with its exact version; saved to a file, it lets you rebuild the same environment:

```bash
python -m pip freeze > requirements.txt
```

```text
certifi==2026.7.22
charset-normalizer==3.5.2
idna==3.20
requests==2.34.2
urllib3==2.8.0
```

To install from the file in a new environment, use `-r`:

```bash
python -m pip install -r requirements.txt
```

The docs describe a requirements file as "just a list of pip install arguments placed in a file". `freeze` lists the dependencies of your dependencies too, which is why `certifi` and `urllib3` appear even though you installed only `requests`.

## Upgrade and uninstall

```bash
python -m pip install --upgrade requests
python -m pip uninstall requests
```

`uninstall` asks for confirmation; `-y` skips it.

## Common mistakes

- **Installing into the wrong Python.** If `pip install` succeeds but `import` fails, the `pip` you ran belongs to a different Python.
- **Installing into the system Python.** On macOS and Linux, the operating system uses it itself.

## What's next

Next in the series: uv, a faster tool that also manages the project and the virtual environment for you.
