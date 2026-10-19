---
title: "Number operations in Python"
summary: "The arithmetic operators in Python: + - * / // % and **, the difference between true and floor division, round, the math module, and why floats aren't exact."
date: 2026-10-11
tags: [python]
series: { key: python, order: 6 }
---

Python does arithmetic the way you'd expect, with a few details that matter: `/` and `//` are different operations, and `round()` doesn't always round halves up.

Every example here was run with Python 3.13. The rules were checked against the [official numeric types docs](https://docs.python.org/3/library/stdtypes.html#numeric-types-int-float).

## The basic operators

```python
print(7 + 2, 7 - 2, 7 * 2)
print(2 ** 10)
```

```text
9 5 14
1024
```

`**` is the power operator. `2 ** 10` is 2 to the power of 10.

Operators follow the usual precedence: `**` first, then `*`, `/`, `//` and `%`, then `+` and `-`. Use parentheses when you're not sure:

```python
print(2 + 3 * 4 ** 2)
```

```text
50
```

`4 ** 2` is 16, `3 * 16` is 48, and `2 + 48` is 50.

## True division and floor division

`/` always gives a float, and `//` rounds down to a whole number:

```python
print(7 / 2)
print(7 // 2)
print(10 / 4 * 2)
```

```text
3.5
3
5.0
```

`//` rounds toward minus infinity, not toward zero. The docs give the examples `1//2` is `0`, `(-1)//2` is `-1`, and `1//(-2)` is `-1`. The same rule applies to floats:

```python
print(1 // 0.5, -7.5 // 2)
```

```text
2.0 -4.0
```

## The remainder: %

`%` gives the remainder after division: `7 % 2` is `1`. It has its own [post](en/posts/python-modulo/): what it's useful for, how it treats negative numbers, and `divmod()`.

## Assignment operators

`+=` from the [variables post](en/posts/python-variables-types/) works with every operator here: `-=`, `*=`, `/=`, `//=`, `%=` and `**=`:

```python
x = 5
x += 2
x *= 3
print(x)
```

```text
21
```

## Built-in functions

`abs` returns the absolute value. `round` rounds to the nearest number:

```python
print(abs(-3.5))
print(round(2.5), round(3.5))
print(round(2.675, 2))
```

```text
3.5
2 4
2.67
```

Python rounds halves to the nearest even number. `round(2.675, 2)` gives 2.67, because 2.675 is stored as a float slightly below 2.675.

## The math module

For square roots, rounding up or down, and other functions, import `math`:

```python
import math

print(math.sqrt(16), math.floor(3.7), math.ceil(3.2))
```

```text
4.0 3 4
```

`math.floor` rounds down, and `math.ceil` rounds up. Both return an int.

## Floats are not exact

Computers store most decimal fractions as approximations:

```python
print(0.1 + 0.2)
```

```text
0.30000000000000004
```

This isn't a Python bug. It's how binary floats work. For money or exact comparisons, use the `decimal` module, or compare with `math.isclose()` instead of `==`.

## What's next

Next: type conversion, turning text into numbers and back.
