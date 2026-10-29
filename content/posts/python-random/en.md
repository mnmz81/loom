---
title: "Randomisation in Python: the random module"
summary: "Random numbers, picking and shuffling items with the random module: randint, random, choice, sample, shuffle, and seed for repeatable results. Plus why it's not for passwords."
date: 2026-10-19
tags: [python]
series: { key: python, order: 29 }
---

Games, simulations, sample data and "pick a winner" all need randomness. Python ships with the `random` module for it. You load it with `import random` and call its functions as `random.name()`. (The [modules post](en/posts/python-modules/) explains how `import` works.)

Every example ran with Python 3.13, checked against the [`random` module documentation](https://docs.python.org/3/library/random.html).

## Random numbers

`randint(a, b)` returns a whole number from `a` to `b`, **both included**. `random()` returns a float from 0.0 up to, but not including, 1.0. `uniform(a, b)` returns a float between `a` and `b`:

```python
import random

die = random.randint(1, 6)
chance = random.random()
temp = random.uniform(15.0, 30.0)
print(1 <= die <= 6, 0 <= chance < 1, 15 <= temp <= 30)
```

```text
True True True
```

The values change on every run, so the example prints the checks instead of the values. `randint(1, 6)` includes 6, unlike `range(1, 6)` ([loops post](en/posts/python-loops/)). To get the `range` behavior with a step, use `randrange(start, stop, step)`: `random.randrange(0, 100, 10)` picks one of `0, 10, ..., 90`.

## Picking from a list

`choice()` picks one item from a [list](en/posts/python-lists/). `sample(items, k)` picks `k` different items. `choices(items, k=n)` picks `n` items, and the same item can come up more than once:

```python
colors = ["red", "green", "blue", "yellow"]

one = random.choice(colors)
three = random.sample(colors, 3)
rolls = random.choices(colors, k=6)
print(one in colors, len(set(three)), len(rolls))
```

```text
True 3 6
```

`sample()` never repeats an item (the `len(set(...))` check is 3), so it fits a lottery or a team draw. `choices()` fits independent draws such as coin flips, and takes `weights=[...]` to make some items more likely. `random.choice([])` on an empty list is an `IndexError`.

## Shuffling

`shuffle()` reorders a list **in place** and returns `None`, like `sort()` in the [lists post](en/posts/python-lists/). To shuffle without touching the original, shuffle a copy, or use `sample()` with the full length:

```python
deck = [1, 2, 3, 4, 5]
mixed = random.sample(deck, len(deck))
random.shuffle(deck)
print(sorted(mixed) == sorted(deck) == [1, 2, 3, 4, 5])

deck = random.shuffle(deck)
print(deck)
```

```text
True
None
```

The last two lines are the usual mistake: `deck = random.shuffle(deck)` throws away the list.

## A repeatable sequence: seed

The numbers are *pseudo-random*: a formula produces them, starting from a hidden starting value. `seed()` sets that starting value, so the same seed gives the same numbers every time:

```python
random.seed(42)
first = [random.randint(1, 100) for _ in range(5)]

random.seed(42)
second = [random.randint(1, 100) for _ in range(5)]
print(first)
print(first == second)
```

```text
[82, 15, 4, 95, 36]
True
```

Seed when you need a result you can repeat: a test that must not flake, a bug you want to reproduce, an example in a tutorial. The exact numbers can change between Python versions, so rely on "same seed, same sequence", not on the digits.

## Not for passwords

The docs warn that these functions should not be used for security purposes. Someone who sees enough outputs can predict the next ones. For passwords, tokens and anything secret, use the [`secrets` module](https://docs.python.org/3/library/secrets.html) instead:

```python
import secrets

token = secrets.token_hex(8)
print(len(token), secrets.choice("abcdef") in "abcdef")
```

```text
16 True
```

## Common mistakes

- **Using the module's name for a file.** A file called `random.py` next to your script is imported instead of the real module, and `random.randint` fails with an `AttributeError`.
- **`randint` with the end excluded in mind.** `randint(0, len(items))` can return `len(items)`, an `IndexError` ([indexes post](en/posts/python-lists-nested/)). Use `choice(items)` or `randrange(len(items))`.
- **Seeding inside a loop.** `random.seed(1)` before every draw gives the same number every time.

## What's next

Next: modules, to see how `import random` finds code, and how to write a module of your own.
