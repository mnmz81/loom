---
title: "Lists in Python"
summary: "A list holds many values in order. Creating one, indexing and slicing, adding and removing items, sorting, copying without surprises, and a word on tuples."
date: 2026-10-13
updated: 2026-10-19
tags: [python]
series: { key: python, order: 10 }
---

Real programs work with many values at once: the items in a cart, the lines of a file, the scores of a class. The basic tool is the list, which the docs call the most versatile of Python's compound data types: values in square brackets, in a fixed order, that you can change.

Every example here was run with Python 3.13. The behavior was checked against the [lists section of the tutorial](https://docs.python.org/3/tutorial/introduction.html#lists), [more on lists](https://docs.python.org/3/tutorial/datastructures.html#more-on-lists) and the [`list` type reference](https://docs.python.org/3/library/stdtypes.html#lists).

## Creating a list

Write the values between square brackets, separated by commas:

```python
fruits = ["apple", "banana", "cherry"]
scores = [90, 72, 85]
empty = []
mixed = ["Dana", 30, True]
print(fruits, len(fruits))
print(empty, len(empty))
print(type(scores))
```

```text
['apple', 'banana', 'cherry'] 3
[] 0
<class 'list'>
```

A list can mix types, like `mixed`, but usually all items share one type. `len()` gives the number of items, as for a string.

`list()` builds a list from anything you can go through item by item, like a string ([type conversion post](en/posts/python-type-conversion/)) or a `range` ([loops post](en/posts/python-loops/)).

## Indexing and slicing

Lists use the same indexes as [strings](en/posts/python-strings/): the first item is `0`, and negative indexes count from the end. A slice `[start:stop]` returns a new list:

```python
fruits = ["apple", "banana", "cherry", "date"]
print(fruits[0], fruits[-1])
print(fruits[1:3])
print(fruits[::-1])
```

```text
apple date
['banana', 'cherry']
['date', 'cherry', 'banana', 'apple']
```

An index past the end is an error, but a slice past the end returns what exists:

```python
print(fruits[1:100])
print(fruits[10])
```

```text
['banana', 'cherry', 'date']
IndexError: list index out of range
```

## Changing a list

Here lists differ from strings: a string can't be changed, but a list can (the tutorial: "lists are a mutable type"). You can replace an item in place:

```python
scores = [90, 72, 85]
scores[1] = 75
print(scores)
```

```text
[90, 75, 85]
```

To add items, use methods. `append()` adds one item to the end, `insert()` adds one at a position, and `extend()` adds every item of another list:

```python
cart = ["milk"]
cart.append("bread")
cart.insert(0, "eggs")
cart.extend(["tea", "rice"])
print(cart)
```

```text
['eggs', 'milk', 'bread', 'tea', 'rice']
```

To remove items, `remove()` deletes the first item with a given value, `pop()` deletes by position and returns the item, and `del` deletes by index or slice:

```python
cart.remove("milk")
last = cart.pop()
first = cart.pop(0)
print(cart, last, first)

del cart[0]
print(cart)
```

```text
['bread', 'tea'] rice eggs
['tea']
```

`pop()` with no argument takes from the end. That makes a list a natural stack: `append()` to push, `pop()` to take the last item back.

## Searching and counting

`in` checks if a value is in the list and returns `True` or `False`. `index()` gives the position of the first match, and `count()` counts matches:

```python
colors = ["red", "green", "blue", "green"]
print("green" in colors, "pink" in colors)
print(colors.index("green"), colors.count("green"))
```

```text
True False
1 2
```

`index()` raises an error when the value isn't there, so check with `in` first (see [conditions](en/posts/python-if-else/)):

```python
print(colors.index("pink"))
```

```text
ValueError: 'pink' is not in list
```

For lists of numbers, `sum()`, `min()` and `max()` do what their names say:

```python
scores = [90, 72, 85]
print(sum(scores), min(scores), max(scores))
print(sum(scores) / len(scores))
```

```text
247 72 90
82.33333333333333
```

## Sorting

There are two ways to sort. The `sort()` method sorts the list itself and returns `None`. The `sorted()` function leaves the list alone and returns a new, sorted list:

```python
numbers = [3, 1, 2]
print(sorted(numbers), numbers)

numbers.sort()
print(numbers)

numbers.sort(reverse=True)
print(numbers)
```

```text
[1, 2, 3] [3, 1, 2]
[1, 2, 3]
[3, 2, 1]
```

The `key` argument sorts by something computed from each item. `key=len` sorts words by length, and `key=str.lower` ignores case:

```python
words = ["banana", "Apple", "fig"]
print(sorted(words))
print(sorted(words, key=str.lower))
print(sorted(words, key=len))
```

```text
['Apple', 'banana', 'fig']
['Apple', 'banana', 'fig']
['fig', 'Apple', 'banana']
```

Plain `sorted(words)` puts `"Apple"` first because uppercase letters come before lowercase ones, which is rarely what you want for names.

## Two names, one list

Assigning a list to another variable doesn't copy it. Both names point to the same list, so a change through one name shows up through the other:

```python
a = [1, 2, 3]
b = a
b.append(4)
print(a)
print(a is b)
```

```text
[1, 2, 3, 4]
True
```

To get an independent list, copy it with `copy()`, `list()` or a full slice `[:]`:

```python
a = [1, 2, 3]
c = a.copy()
c.append(4)
print(a, c)
```

```text
[1, 2, 3] [1, 2, 3, 4]
```

These are *shallow* copies: a list inside the list is still shared. For numbers and strings, that never matters.

## Tuples: a list that can't change

A tuple is written with parentheses instead of brackets. It's indexed like a list, but it can't be changed after it's created:

```python
point = (3, 4)
print(point[0], len(point))
x, y = point
print(x, y)
point[0] = 10
```

```text
3 2
3 4
TypeError: 'tuple' object does not support item assignment
```

`x, y = point` is *unpacking*: one name per item, as in `x, y = 1, 2` from the [variables post](en/posts/python-variables-types/). Use a tuple for a fixed group that belongs together, like coordinates, and a list for a collection that grows and shrinks.

## Common mistakes

- **Using the result of `sort()`.** `numbers = numbers.sort()` sets `numbers` to `None`. Use `numbers.sort()` alone, or `numbers = sorted(numbers)`.
- **`append()` with a list.** `cart.append(["tea", "rice"])` adds one item, a list inside the list. To add each item, use `extend()`.
- **Off-by-one indexes.** The last item is `items[len(items) - 1]`, or simply `items[-1]`. `items[len(items)]` is an `IndexError`.
- **Calling a variable `list`.** `list = [1, 2]` hides the built-in `list()` ([shadowing](en/posts/python-scope-and-naming/)).

## What's next

Next: list indexes in depth, the `IndexError`, and lists inside lists.
