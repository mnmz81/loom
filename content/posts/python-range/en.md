---
title: "range() in Python: more than a list of numbers"
summary: "range is a lazy sequence, not a list: indexing, slicing and fast in checks, negative steps and empty ranges, why floats are refused, and when range(len()) is the right tool."
date: 2026-10-29
tags: [python]
series: { key: python, order: 18 }
---

The [loops post](en/posts/python-loops/) used `range()` with one, two and three arguments. This post is about what `range()` actually returns, and the bugs that come from treating it as a list.

Every example ran with Python 3.13, checked against the [`range` reference](https://docs.python.org/3/library/stdtypes.html#ranges) and the [`range()` built-in](https://docs.python.org/3/library/functions.html#func-range).

## range is an object, not a list

```python
import sys

r = range(5)
print(r, type(r))
print(list(r))

big = range(10**12)
print(len(big), big[-1])
print(sys.getsizeof(big), sys.getsizeof(list(range(1000))))
```

```text
range(0, 5) <class 'range'>
[0, 1, 2, 3, 4]
1000000000000 999999999999
48 8056
```

The reference explains why: a range "will always take the same (small) amount of memory, no matter the size of the range it represents", because it stores only `start`, `stop` and `step` and computes each number when asked. A range of a trillion numbers takes 48 bytes. A list of a thousand takes over 8,000. Wrap a range in `list()` only when you need a real list.

## Indexing, slicing and in

A range is a full sequence: it supports `len()`, indexes, slices and `in`, like a list or a tuple.

```python
r = range(0, 20, 5)
print(list(r))
print(r[1], r[-1])
print(r[1:3])
print(15 in r, 7 in r)
print(r.index(10))
```

```text
[0, 5, 10, 15]
5 15
range(5, 15, 5)
True False
2
```

A slice of a range is another range, not a list. `15 in r` doesn't loop over the numbers: since Python 3.2, an integer is tested "in constant time": Python checks with arithmetic whether it falls between the ends and on the step. So `10**11 in range(10**12)` is instant.

Two ranges are equal when they produce the same numbers, even when they were written differently:

```python
print(range(0) == range(5, 2))
print(range(0, 3, 2) == range(0, 4, 2))
```

```text
True
True
```

## Negative steps and empty ranges

To count down, give a negative step. The stop value is still excluded:

```python
print(list(range(5, 0, -1)))
print(list(reversed(range(5))))
print(list(range(0, 5, -1)))
```

```text
[5, 4, 3, 2, 1]
[4, 3, 2, 1, 0]
[]
```

`reversed(range(5))` gives the same numbers as `range(5)` backwards, without working out the arguments. The last line is the trap: start below stop with a negative step gives an empty range, with no error. A `for` loop over it simply doesn't run.

A step of zero would never end, so Python refuses it:

```python
range(0, 10, 0)
```

```text
ValueError: range() arg 3 must not be zero
```

## Only whole numbers

Every argument must be an integer:

```python
range(0, 1, 0.1)
```

```text
TypeError: 'float' object cannot be interpreted as an integer
```

For decimal steps, loop over whole numbers and divide:

```python
print([i / 10 for i in range(5)])
```

```text
[0.0, 0.1, 0.2, 0.3, 0.4]
```

Dividing on each pass avoids adding `0.1` again and again, which drifts (`0.1 + 0.2` is `0.30000000000000004`).

## When range(len()) is the right tool

To read items with their positions, [`enumerate()`](https://docs.python.org/3/library/functions.html#enumerate) is clearer. `range(len(...))` is right when you need the index itself: to change items in place, or to compare each item with its neighbour.

```python
prices = [10.0, 20.0, 30.0]
for i in range(len(prices)):
    prices[i] = round(prices[i] * 1.18, 2)
print(prices)

temps = [21, 23, 22, 25]
for i in range(len(temps) - 1):
    print(temps[i + 1] - temps[i], end=" ")
```

```text
[11.8, 23.6, 35.4]
2 -1 3 
```

`for price in prices: price *= 1.18` wouldn't work: it changes the loop variable, not the list. The second loop stops one early, so `temps[i + 1]` never goes past the end.

## Common mistakes

- **Off by one at the end.** `range(1, 10)` stops at 9. For 1 to 10, write `range(1, 11)`.
- **Treating a range as a list.** `range(5).append(5)` raises `AttributeError`. Convert with `list()` first.
- **A countdown with the default step.** `range(10, 0)` is empty. Add `-1`.

## What's next

Next in the series: `while` loops in depth: sentinels, the walrus operator, and loops that are guaranteed to end.
