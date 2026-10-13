---
title: "Variables and types in Python"
summary: "How variables work in Python: assignment, names, the basic types int, float, str, bool and None, type() and isinstance(), converting between types, and the NameError."
date: 2026-10-11
tags: [python]
series: { key: python, order: 3 }
---

A variable in Python is a name that points to a value. You don't declare it or give it a type. You assign it, and the type comes with the value. This post covers the basic types, how to check them, and how to convert between them.

Every code example here was run with Python 3.13, and the claims were checked against the [official tutorial](https://docs.python.org/3/tutorial/introduction.html) and the [`type()` docs](https://docs.python.org/3/library/functions.html#type).

## Assignment

The equal sign assigns a value to a name:

```python
count = 0
count += 1
print(count)
```

```text
1
```

`count += 1` is shorthand for `count = count + 1`.

You can assign several names in one line, and swap two values without a temporary variable:

```python
x, y = 1, 2
print(x, y)
x, y = y, x
print(x, y)
```

```text
1 2
2 1
```

## The basic types

`type()` shows the type of a value:

```python
x = 5
print(x, type(x))
pi = 3.14
print(pi, type(pi))
name = "Python"
print(name, type(name))
flag = True
print(flag, type(flag))
```

```text
5 <class 'int'>
3.14 <class 'float'>
Python <class 'str'>
True <class 'bool'>
```

- `int`: whole numbers, with no fixed size. `1_000_000` is valid. The underscores are only for readability.
- `float`: numbers with a fractional part.
- `str`: text, covered in the next post.
- `bool`: `True` or `False`.
- `None`: the value for "nothing". Its type is `NoneType`.

`print(type(None))` shows `<class 'NoneType'>`.

## Division returns a float

`/` always returns a float, even when the result is whole. `//` returns an int:

```python
print(10 / 2, type(10 / 2))
print(10 // 2, type(10 // 2))
print(7 % 3)
```

```text
5.0 <class 'float'>
5 <class 'int'>
1
```

`%` is the remainder: 7 divided by 3 leaves 1.

## Checking types

`type(x) == int` works, but the docs recommend `isinstance()` because it also accepts subclasses:

```python
print(isinstance(3, int))
print(isinstance(True, int))
```

```text
True
True
```

`bool` is a subclass of `int`, so `True` is an int too. That's why the second check returns `True`.

## Converting between types

Python doesn't convert types on its own in most cases, so you do it explicitly with the type name:

```python
print(int("42") + 1)
print(float("3.5") * 2)
print(str(7) + "7")
print(bool(""), bool("0"))
```

```text
43
7.0
77
False True
```

`bool("0")` is `True`, because it's a non-empty string. Only empty values such as `""`, `0` and `None` count as `False`.

Conversion fails when the text doesn't match the type:

```python
int("3.5")
```

```text
ValueError: invalid literal for int() with base 10: '3.5'
```

## Common mistakes

**Using a name before assigning it.** This gives a `NameError`:

```python
print(n)
```

```text
NameError: name 'n' is not defined
```

The fix is to assign the name first, or check that you spelled it the same way everywhere.

**Mixing `=` and `==`.** `=` assigns. `==` compares. `if x = 5:` is a syntax error, and `if x == 5:` is the check you want.

**Adding a string and a number.** `"5" + 1` raises `TypeError`. Convert one side first: `int("5") + 1` gives `6`.

## What's next

Next in the series: strings, including the common methods for changing and searching text.
