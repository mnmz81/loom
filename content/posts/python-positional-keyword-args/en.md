---
title: "Positional vs. keyword arguments in Python: *args, **kwargs, / and *"
summary: "Collecting extra arguments with *args and **kwargs, forcing names with *, forbidding them with /, unpacking a list or dict into a call, and the full order of parameters."
date: 2026-10-29
tags: [python]
series: { key: python, order: 24 }
---

The [functions post](en/posts/python-functions/) passed arguments by position (`greet("Dana")`) and by name (`greet(name="Dana")`). By default every parameter accepts both. This post covers how a function can take any number of each, and how it can require one way or the other.

Every example ran with Python 3.13, checked against the tutorial's sections on [special parameters](https://docs.python.org/3/tutorial/controlflow.html#special-parameters) and [unpacking argument lists](https://docs.python.org/3/tutorial/controlflow.html#unpacking-argument-lists).

## *args: any number of positional arguments

A parameter written `*name` collects all the extra positional arguments into a tuple. `args` is only a convention:

```python
def total(*prices):
    print(type(prices), prices)
    return sum(prices)

print(total())
print(total(5, 2.5, 10))
```

```text
<class 'tuple'> ()
0
<class 'tuple'> (5, 2.5, 10)
17.5
```

With no arguments, `prices` is an empty tuple, not an error.

## **kwargs: any number of keyword arguments

`**name` collects the extra keyword arguments into a dictionary, from name to value:

```python
def tag(name, **attrs):
    parts = " ".join(f'{key}="{value}"' for key, value in attrs.items())
    return f"<{name} {parts}>"

print(tag("a", href="/loom/", title="Home"))
```

```text
<a href="/loom/" title="Home">
```

The keys are the names as written in the call, in the same order. A function with `**kwargs` accepts any name, so a typo like `titel="Home"` passes silently into `attrs`. That's the cost of the flexibility.

## Keyword-only: parameters after *

Parameters after `*args`, or after a bare `*`, can only be passed by name:

```python
def resize(image, *, width, height, keep_ratio=True):
    return f"{image}: {width}x{height}, keep_ratio={keep_ratio}"

print(resize("cat.png", width=800, height=600))
resize("cat.png", 800, 600)
```

```text
cat.png: 800x600, keep_ratio=True
TypeError: resize() takes 1 positional argument but 3 were given
```

The bare `*` collects nothing. It only marks where the keyword-only part starts. Use it when a call with bare values would be unreadable: `resize("cat.png", 800, 600, False)` makes the reader look up what `False` means. Python's own `sorted()` works this way, which is why it's always `sorted(nums, reverse=True)`.

## Positional-only: parameters before /

Parameters before a `/` (Python 3.8) can only be passed by position:

```python
def area(width, height, /):
    return width * height

print(area(2, 3))
area(width=2, height=3)
```

```text
6
TypeError: area() got some positional-only arguments passed as keyword arguments: 'width, height'
```

The tutorial gives the reason: positional-only lets you rename parameters later without breaking any caller, because no caller could have used the names. Many built-ins are like this: `len(obj=[1])` is a `TypeError`. It also frees the name for `**kwargs`:

```python
def describe(name, /, **fields):
    return f"{name}: {fields}"

print(describe("Dana", name="nickname"))
```

```text
Dana: {'name': 'nickname'}
```

Without the `/`, the call would fail with `got multiple values for argument 'name'`.

## Unpacking into a call: * and **

In a call, `*` spreads a list or tuple into positional arguments, and `**` spreads a dictionary into keyword arguments:

```python
pair = (17, 5)
options = {"sep": " | ", "end": "!\n"}

print(divmod(*pair))
print(*["a", "b", "c"], **options)
```

```text
(3, 2)
a | b | c!
```

`divmod(*pair)` is `divmod(17, 5)`, and the `print` line is `print("a", "b", "c", sep=" | ", end="!\n")`. This is how a configuration read from a file becomes the arguments of a function.

## The full order

All the kinds together, in the only order Python accepts:

```python
def full(pos_only, /, normal, *args, kw_only, **kwargs):
    return pos_only, normal, args, kw_only, kwargs

print(full(1, 2, 3, 4, kw_only=5, extra=6))
```

```text
(1, 2, (3, 4), 5, {'extra': 6})
```

Positional-only, then normal, then `*args` (or a bare `*`), then keyword-only, then `**kwargs`. Most functions need none of the markers. Add `/` or `*` when you have a reason: a name you may change, or values that need a label.

## Common mistakes

- **Passing a list where `*args` expects items.** `total([1, 2])` gives `args == ([1, 2],)`, and `sum` fails. Call `total(*[1, 2])`.
- **Hiding typos with `**kwargs`.** If a function only passes some known options along, name them as keyword-only parameters instead.
- **Forgetting that `*args` makes the rest keyword-only.** In `def log(*messages, level)`, `level` can only be passed as `level="warn"`.

## What's next

Next in the series: code blocks and scope: why a variable created inside an `if` is still there after it, and which blocks do create a scope.
