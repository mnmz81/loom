---
title: "Modules in Python: import and your own files"
summary: "A module is a .py file you load with import. The four forms of import, writing your own module, where Python looks for it, and what if __name__ == '__main__' means."
date: 2026-10-19
tags: [python]
series: { key: python, order: 30 }
---

A program that grows past a few dozen lines is easier to read when it is split into files. In Python, each file is a **module**: a `.py` file whose names (functions, constants, classes) other files can load with `import`. The standard library is a large collection of ready-made modules, such as `math`, `random` and `datetime`.

Every example ran with Python 3.13, checked against the [modules chapter of the tutorial](https://docs.python.org/3/tutorial/modules.html) and the [`import` reference](https://docs.python.org/3/reference/import.html).

## Ways to import

`import math` loads the module and gives you one name, `math`. You reach inside it with a dot:

```python
import math

print(math.sqrt(16), math.floor(2.7), math.pi)
```

```text
4.0 2 3.141592653589793
```

`from math import sqrt` copies one name into your file, so you write `sqrt(16)` with no prefix. `import math as m` gives the module another name, which is common for long names. Both forms below are fine:

```python
from math import sqrt, ceil
import math as m

print(sqrt(9), ceil(2.1), m.pi)
```

```text
3.0 3 3.141592653589793
```

There is a fourth form, `from math import *`, which dumps every public name into your file. Avoid it: you can't tell where a name came from, and it may silently replace a name you defined ([shadowing](en/posts/python-scope-and-naming/)).

Use `import math` when you use many names from a module, and `from math import sqrt` when you use one or two.

## Writing your own module

Any `.py` file is a module. Put this in a file called `shapes.py`:

```python
import math

PI_APPROX = 3.14

def circle_area(radius):
    return math.pi * radius ** 2

def square_area(side):
    return side ** 2

print("shapes loaded")
```

In another file in the **same folder**, `main.py`, import it by its file name without `.py`:

```python
import shapes
from shapes import square_area
import shapes as sh

print(shapes.circle_area(1))
print(square_area(3))
print(sh.PI_APPROX)
```

Run it from that folder:

```bash
python main.py
```

```text
shapes loaded
3.141592653589793
9
3.14
```

`shapes loaded` appears once, although the file was imported three times. Python runs a module's code the first time it is imported and keeps the result, so the next `import shapes` reuses it. Everything at the top level of the module runs at import time: the `def` statements create the functions, and the `print` prints.

## Where Python looks for a module

When you write `import shapes`, Python searches, in order: the modules built into the interpreter, then the folders in `sys.path`. The first entry of `sys.path` is the folder of the script you ran, which is why `shapes.py` next to `main.py` is found. The rest are the folders of the standard library and installed packages ([pip post](en/posts/python-pip/)).

```python
import sys

print(type(sys.path), len(sys.path) > 1)
```

```text
<class 'list'> True
```

If the module can't be found, you get `ModuleNotFoundError`. If the module exists but lacks the name, you get `ImportError`:

```python
import nothing_here
```

```text
ModuleNotFoundError: No module named 'nothing_here'
```

```python
from math import cube
```

```text
ImportError: cannot import name 'cube' from 'math' (unknown location)
```

Because the script's folder comes first, a file named like a standard module hides the real one. A file called `random.py` or `math.py` next to your script breaks `import random` for that script. Pick names that don't clash.

## `if __name__ == "__main__"`

Every module has a `__name__`. When you run a file directly (`python tool.py`), Python sets its `__name__` to `"__main__"`. When another file imports it, `__name__` is the module's name. This lets one file work as both a script and a module:

```python
def double(n):
    return n * 2

if __name__ == "__main__":
    print("running directly:", double(4))
```

Save it as `tool.py` and run it:

```bash
python tool.py
python -c "import tool; print(tool.double(5), tool.__name__)"
```

```text
running directly: 8
10 tool
```

Run directly, the `if` block executes. Imported, it doesn't, so importing `tool` has no side effects. Put the code that should run only as a script, such as a `main()` call or quick demo, under this `if`. A module imported without it would run that code at every import, like the `print` in `shapes.py`.

## Common mistakes

- **Running from the wrong folder.** `python src/main.py` puts `src/` in `sys.path`, not your current folder, so a module outside `src/` isn't found.
- **A file named like a module.** `random.py`, `math.py` and `test.py` hide standard modules. Rename the file.
- **Expecting changes to be picked up.** An already imported module isn't reloaded while the program runs. Restart the program.
- **Importing a name that the module doesn't have.** `ImportError: cannot import name` usually means a typo, or that the file is not the one you think it is. Print `shapes.__file__` to see which file was loaded.

## What's next

Next: packages, folders of modules, and the `__init__.py` file that makes a folder importable.
