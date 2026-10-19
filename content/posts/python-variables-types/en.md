---
title: "Variables and types in Python"
summary: "How variables work in Python: assignment, names, the basic types int, float, str, bool and None, type(), and the NameError."
date: 2026-10-11
tags: [python]
series: { key: python, order: 3 }
---

A variable in Python is a name that points to a value. You don't declare it or give it a type: you assign it, and the type comes with the value.

Every example here was run with Python 3.13 and checked against the [official tutorial](https://docs.python.org/3/tutorial/introduction.html) and the [`type()` docs](https://docs.python.org/3/library/functions.html#type).

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

- `int`: whole numbers, with no fixed size. `1_000_000` is valid; underscores are only for readability.
- `float`: numbers with a fractional part.
- `str`: text, covered in the next post.
- `bool`: `True` or `False`.
- `None`: the value for "nothing". Its type is `NoneType`.

Converting between these types has its own [post](en/posts/python-type-conversion/), and checking a type with `isinstance()` is in the [TypeError post](en/posts/python-type-errors-and-checking/).

## Common mistakes

**Using a name before assigning it.** This gives a `NameError`:

```python
print(n)
```

```text
NameError: name 'n' is not defined
```

Assign the name first, and check you spelled it the same way everywhere.

## What's next

Next: strings and the common methods for changing and searching text.
