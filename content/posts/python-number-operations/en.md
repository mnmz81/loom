---
title: "Number operations in Python"
summary: "The arithmetic operators in Python: + - * / // % and **, the difference between true and floor division, negative numbers, divmod, round, and the math module."
date: 2026-10-11
tags: [python]
series: { key: python, order: 6 }
---

Python does arithmetic the way you'd expect, with a few details that matter: `/` and `//` are different operations, `%` works with negative numbers in a specific way, and `round()` doesn't always round halves up. This post covers the operators, the common functions, and the surprises.

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
print(1 // 0.5, 7.5 % 2)
```

```text
2.0 1.5
```

## The remainder: %

`%` gives the remainder after division:

```python
print(7 % 2)
print(10 % 3 == 1)
```

```text
1
True
```

With negative numbers, the result takes the sign of the divisor:

```python
print(-7 // 2, -7 % 2)
```

```text
-4 1
```

`-7 // 2` is -4, because it rounds down. `-7 % 2` is 1, because `(-4) * 2 + 1` is -7. Keep this in mind when you use `%` to wrap around a list index.

`divmod` returns both results at once, as the pair `(x // y, x % y)`:

```python
print(divmod(17, 5))
```

```text
(3, 2)
```

## Assignment operators

`+=`, `*=` and the others update a variable in place:

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

`round(2.5)` is 2 and `round(3.5)` is 4. Python rounds halves to the nearest even number. `round(2.675, 2)` gives 2.67, because 2.675 is stored as a float slightly below 2.675.

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

This isn't a Python bug. It's how binary floats work. For money or exact comparisons, use the `decimal` module, or compare with a tolerance instead of `==`.

## Common mistakes

- **Expecting `//` to round toward zero.** `-7 // 2` is -4, not -3.
- **Comparing floats with `==`.** `0.1 + 0.2 == 0.3` is `False`.
- **Relying on `round` for "normal" rounding.** Halves go to the even number, so `round(2.5)` is 2.
- **Mixing up `/` and `//`.** `/` returns a float even for whole results, such as `10 / 2`, which is `5.0`.

## What's next

Next in the series: type conversion, which is how you turn text into numbers and back.
