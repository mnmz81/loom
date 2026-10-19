---
title: "Logical operators in Python: and, or, not"
summary: "How and, or and not combine conditions in Python: truth tables, short-circuit evaluation, why and/or return one of their operands, precedence, and any() and all()."
date: 2026-10-13
tags: [python]
series: { key: python, order: 14 }
---

A single comparison answers one question: is the user an adult? Real conditions often ask several at once: is the user an adult **and** do they have a ticket? Python has three logical operators for this: `and`, `or` and `not`. They're words, not symbols like `&&` and `||` in other languages.

Every example here was run with Python 3.13. The behavior was checked against the [Boolean operations reference](https://docs.python.org/3/reference/expressions.html#boolean-operations) and the [truth value testing docs](https://docs.python.org/3/library/stdtypes.html#truth-value-testing).

## The three operators

- `a and b` is true when **both** sides are true.
- `a or b` is true when **at least one** side is true.
- `not a` flips the value.

```python
age = 25
has_ticket = True
print(age >= 18 and has_ticket)
print(age < 12 or age > 65)
print(not has_ticket)
```

```text
True
False
False
```

Here are all four combinations of two values:

```python
for a in (True, False):
    for b in (True, False):
        print(a, b, a and b, a or b)
```

```text
True True True True
True False False True
False True False True
False False False False
```

They make nested `if` statements flatter. The ticket check from the [previous post](en/posts/python-if-else/) becomes:

```python
age = 20
has_ticket = True
if age >= 18 and has_ticket:
    print("Come in")
```

```text
Come in
```

## Short-circuit evaluation

Python evaluates from left to right and stops as soon as the answer is known. If the left side of `and` is false, the result is false, so the right side never runs. If the left side of `or` is true, the right side never runs:

```python
def check(label, result):
    print("checking", label)
    return result

print(check("a", False) and check("b", True))
print(check("c", True) or check("d", True))
```

```text
checking a
False
checking c
True
```

This works as a guard: put the safe check first, and the risky one runs only when it's safe:

```python
items = []
if items and items[0] == "x":
    print("starts with x")
else:
    print("empty or not x")

count = 0
total = 10
if count != 0 and total / count > 2:
    print("big")
print("no ZeroDivisionError")
```

```text
empty or not x
no ZeroDivisionError
```

`items[0]` on an empty list would raise an `IndexError`, and `total / count` would raise a `ZeroDivisionError`. Neither runs, because the left side is already false.

## and and or return a value, not just True or False

The docs are precise: `x and y` returns `x` if `x` is false, otherwise `y`. `x or y` returns `x` if `x` is true, otherwise `y`. They return one of the operands, not necessarily a `bool`:

```python
print(0 and 5, 3 and 5, 0 or 5, 3 or 5)
print("" or "guest", [] or "empty", None and 1)
print(not "", not "hi", not 0)
```

```text
0 5 5 3
guest empty None
True False True
```

`not` is different: it always returns `True` or `False`.

This makes `or` handy for defaults. An empty answer from `input()` is falsy, so `or` replaces it. Here the user pressed Enter without typing anything:

```python
name = input("Name: ") or "guest"
print("Hello", name)
```

```text
Name: 
Hello guest
```

Be careful with numbers: `count or 10` also replaces a real `0`. When `0` is a valid value, write `10 if count is None else count`.

## Precedence

`not` binds tightest, then `and`, then `or`. All three come after comparisons, so `age >= 18 and has_ticket` needs no parentheses:

```python
print(True or False and False)
print((True or False) and False)
print(not 1 == 2)
```

```text
True
False
True
```

The first line is `True or (False and False)`. When you mix `and` and `or`, add parentheses even when they aren't needed. The reader shouldn't have to remember the table.

A common trap is comparing one variable to two values:

```python
x = 5
print(x == 3 or 4)
print(x == 3 or x == 4)
print(x in (3, 4))
```

```text
4
False
False
```

`x == 3 or 4` means `(x == 3) or 4`. The comparison is false, so `or` returns `4`, which is truthy. An `if` with that condition would always run. Repeat the comparison, or better, use `in`. For a range, a [chained comparison](en/posts/python-if-else/) such as `10 < x < 20` is shorter than two comparisons joined with `and`.

## Putting it together: leap years

A year is a leap year if it divides by 4, except years that divide by 100, unless they also divide by 400:

```python
def is_leap(year):
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)

print(is_leap(2024), is_leap(1900), is_leap(2000), is_leap(2026))
```

```text
True False True False
```

The parentheses matter here. `%` is the remainder operator, which gets its own [post later in the series](en/posts/python-modulo/).

## any() and all()

For many conditions, the built-ins `any()` and `all()` are the `or` and `and` of a whole collection:

```python
scores = [72, 88, 95]
print(any(s > 90 for s in scores), all(s > 70 for s in scores))
print(all([]), any([]))
```

```text
True True
True False
```

`any` is true if at least one item is true. `all` is true if every item is true. Note the empty cases: `all([])` is `True` and `any([])` is `False`. Both stop early, like `and` and `or`. See the [`any()`](https://docs.python.org/3/library/functions.html#any) and [`all()`](https://docs.python.org/3/library/functions.html#all) docs.

## Common mistakes

- **Writing `&&`, `||` or `!`.** Those are other languages. Python uses `and`, `or` and `not`. `!x` is a `SyntaxError`.
- **Using `&` and `|` instead of `and` and `or`.** `&` and `|` are bitwise operators. `1 & 2` is `0`, while `1 and 2` is `2`. They also don't short-circuit.

## What's next

Next: indentation, and the `IndentationError` you get when the blocks under your conditions are off.
