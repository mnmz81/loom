---
title: "Type conversion in Python"
summary: "How to convert between Python types with int(), float(), str(), bool(), list(), tuple() and set(): what each conversion does, truncation, bases, truthiness, and the errors when a conversion fails."
date: 2026-10-11
tags: [python]
series: { key: python, order: 12 }
---

Python rarely converts types for you. `"5" + 1` is an error, not `6`. When you need a number from text, or text from a number, you call a conversion function yourself. The functions have the same names as the types, so `int("5")` builds an int from the string "5". This post covers what each conversion does, and what goes wrong when it can't.

Every example here was run with Python 3.13. The behavior was checked against the [official `int()` and related docs](https://docs.python.org/3/library/functions.html#int).

## Text to number

`int()` and `float()` read a string and return a number:

```python
print(int("42"), int("-7"), int("  8  "))
print(float("3.5"), float("1e3"))
```

```text
42 -7 8
3.5 1000.0
```

`int` ignores spaces at both ends of the text. Only digits (and an optional sign) are allowed in the middle.

Pass a second argument to `int` to read another base. The docs say the allowed bases are 0 and 2 to 36:

```python
print(int("ff", 16), int("1010", 2))
```

```text
255 10
```

## Number to text

`str()` turns any value into text. Use it when you want to join text and a number with `+`:

```python
print(str(42) + "!")
print(str(3.0), str(True))
```

```text
42!
3.0 True
```

You can also write `f"{age}"`, which is usually clearer. The f-strings post covers it.

## Float to int: truncation

`int()` on a float cuts off the decimal part, toward zero:

```python
print(int(3.9), int(-3.9))
```

```text
3 -3
```

This is not rounding. `int(3.9)` is 3, not 4. To round, use `round()` first, and then convert if you need an int. `round()` is covered in the number operations post.

## True and False as numbers

`bool` is a subclass of `int`, so `True` counts as 1 and `False` as 0:

```python
print(int(True) + 1)
```

```text
2
```

## Truthiness: bool()

`bool()` returns `True` or `False` based on the value's truth test. The docs say: "If the argument is false or omitted, this returns False; otherwise, it returns True." These values are false: `0`, `0.0`, `""`, `[]`, and `None`. Everything else is true:

```python
print(bool(0), bool(""), bool([]), bool(None), bool(0.0))
print(bool("0"))
```

```text
False False False False False
True
```

`"0"` is a non-empty string, so it's true. The check is about the text being empty, not about its value.

## Between sequence types

`list()`, `tuple()` and `set()` turn one collection into another:

```python
print(list("abc"))
print(tuple([1, 2]), set([1, 1, 2]))
```

```text
['a', 'b', 'c']
(1, 2) {1, 2}
```

A string becomes a list of its characters. A set drops duplicates, so `[1, 1, 2]` becomes `{1, 2}`.

## When conversion fails

Some text can't become a number. Python raises a `ValueError`:

```python
int("3.5")
```

```text
ValueError: invalid literal for int() with base 10: '3.5'
```

`"3.5"` is a float, so `int` refuses it. Convert with `float` if you want decimals. An empty string fails the same way:

```python
int("")
```

```text
ValueError: invalid literal for int() with base 10: ''
```

When the argument has the wrong type, you get a `TypeError`. For example, `None` is not text or a number:

```python
int(None)
```

```text
TypeError: int() argument must be a string, a bytes-like object or a real number, not 'NoneType'
```

Check user input, or catch the error with `try` and `except`, as described in the input() post.

## Common mistakes

- **Expecting `int()` to round.** `int(3.9)` is 3.
- **Converting `"3.5"` with `int`.** Use `float("3.5")`.
- **Assuming `"0"` is false.** Any non-empty string is true, including `"0"` and `"False"`.
- **Mixing text and numbers with `+`.** `"5" + 1` raises `TypeError`. Convert one side, for example `int("5") + 1`.

## What's next

Next in the series: f-strings, the clean way to put values into text.
