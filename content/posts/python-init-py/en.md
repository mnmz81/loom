---
title: "Packages and __init__.py in Python"
summary: "A package is a folder of modules. What __init__.py does, whether you still need it, how to use it to expose a clean import, relative imports, and __all__."
date: 2026-10-19
tags: [python]
series: { key: python, order: 31 }
---

A [module](en/posts/python-modules/) is one file. When a project has many related modules, you put them in a folder. A folder of modules that you can import is a **package**.

Every example ran with Python 3.13, checked against the [packages section of the tutorial](https://docs.python.org/3/tutorial/modules.html#packages) and the [import system reference](https://docs.python.org/3/reference/import.html#packages).

## A package is a folder

Take a folder `geometry/` next to `main.py`:

```text
main.py
geometry/
    __init__.py
    shapes.py
    units.py
```

`shapes.py` and `units.py` are ordinary modules:

```python
# geometry/shapes.py
import math


def circle_area(radius):
    return math.pi * radius ** 2


def square_area(side):
    return side ** 2
```

You import a module from a package with dots, `package.module`:

```python
# main.py
import geometry.shapes
from geometry import shapes
from geometry.shapes import circle_area

print(geometry.shapes.square_area(3), shapes.square_area(3))
```

All three forms work. `from geometry import shapes` is the most readable when you use several names from the module.

## What `__init__.py` does

`__init__.py` is a file that Python runs **once, when the package is first imported**. Its names become the names of the package itself. It can be empty, and often is. The file also tells tools that the folder is a regular package.

You don't strictly need it: since Python 3.3 a folder without `__init__.py` still imports, as a *namespace package*. But such a package can't run code on import, and tools, test runners and packaging commonly expect the file. Add an empty `__init__.py` to every package you write.

## Exposing a clean import

Here `__init__.py` earns its place. By importing names inside it, you let users write `from geometry import circle_area` without knowing which file holds the function:

```python
# geometry/__init__.py
print("geometry package loaded")

from .shapes import circle_area, square_area

__all__ = ["circle_area", "square_area"]
__version__ = "1.0"
```

```python
# main.py
import geometry
from geometry import circle_area

print(geometry.square_area(3), geometry.__version__)
print(round(circle_area(1), 2))
```

```bash
python main.py
```

```text
geometry package loaded
9 1.0
3.14
```

`geometry package loaded` printed once, on the first import. The leading dot in `from .shapes import ...` is a **relative import**: "from the module `shapes` in this same package". A single dot means the current package, two dots (`..`) the parent. Relative imports keep working if you rename the package.

## Relative imports inside the package

The same dot syntax works in any module of the package. `units.py` can reuse `shapes.py`:

```python
# geometry/units.py
from .shapes import square_area


def square_in_cm2(side_m):
    return square_area(side_m * 100)
```

```bash
python -c "from geometry.units import square_in_cm2; print(square_in_cm2(2))"
```

```text
geometry package loaded
40000
```

Importing `geometry.units` first imports `geometry`, which is why the package line prints again. A relative import only works when the file is imported as part of a package. Run the file directly and it fails:

```bash
python geometry/units.py
```

```text
ImportError: attempted relative import with no known parent package
```

Run code that lives inside a package from outside it, either with `import` or with `python -m geometry.units` from the folder that contains `geometry/`.

## `__all__`

`__all__` is a list of the names that `from geometry import *` imports. Without it, `*` takes every public name (those not starting with `_`). Defining it makes the public interface explicit. The tutorial calls `import *` generally frowned upon, so `__all__` mostly documents what the package offers.

## Common mistakes

- **No dot in an import inside the package.** `from shapes import square_area` in `units.py` works only if `geometry/` itself is on the search path. Write `from .shapes import ...`.
- **Heavy code in `__init__.py`.** It runs on every import of the package, even when the user needs one small module. Keep it to imports and constants.
- **A package and a module with the same name.** A folder `geometry/` and a file `geometry.py` in the same place clash. Rename one.
- **A typo in the folder name.** A package name must be a valid identifier: `my-package/` can't be imported, `my_package/` can.

## What's next

Next: pip, the tool that installs packages other people wrote.
