---
title: "Dictionaries in Python"
summary: "A dict stores values by key instead of by position. Creating one, reading safely with get, adding and removing, looping over keys and values, counting, nesting, and the keys you can use."
date: 2026-10-13
tags: [python]
series: { key: python, order: 20 }
---

A [list](en/posts/python-lists/) finds a value by position: `scores[2]`. Often you want a name instead: the price of "apple", the phone number of "Dana", the setting called "theme". That's a dictionary, `dict` for short: "a set of key: value pairs, with the requirement that the keys are unique", as the tutorial puts it.

Every example ran with Python 3.13, checked against the [dictionaries section of the tutorial](https://docs.python.org/3/tutorial/datastructures.html#dictionaries) and the [mapping types reference](https://docs.python.org/3/library/stdtypes.html#mapping-types-dict).

## Creating a dictionary

Write `key: value` pairs between braces. A value is read by putting its key in square brackets:

```python
prices = {"apple": 4.5, "bread": 9.9, "milk": 6.2}
print(prices["bread"])
print(len(prices))
print(prices)

empty = {}
person = dict(name="Dana", age=31)
print(person)
```

```text
9.9
3
{'apple': 4.5, 'bread': 9.9, 'milk': 6.2}
{'name': 'Dana', 'age': 31}
```

`{}` is an empty dictionary, not an empty set. `dict(name="Dana")` is another way to write string keys. Pairs keep the order you added them.

## Reading safely: in and get()

A missing key is an error:

```python
prices = {"apple": 4.5, "bread": 9.9}
print(prices["cheese"])
```

```text
KeyError: 'cheese'
```

`in` checks if a key exists. `get()` returns the value, or `None` (or a default you choose) when the key is missing:

```python
print("apple" in prices, "cheese" in prices)
print(prices.get("cheese"))
print(prices.get("cheese", 0))
```

```text
True False
None
0
```

`in` checks the keys, not the values. `4.5 in prices` is `False`.

## Adding, changing and removing

Assigning to a key adds it if it's new, and replaces the value if it exists. Keys are unique, so there's never a second "apple":

```python
stock = {"apple": 10}
stock["pear"] = 3
stock["apple"] = 8
stock["apple"] += 1
print(stock)

stock.update({"kiwi": 5, "pear": 4})
print(stock)
```

```text
{'apple': 9, 'pear': 3}
{'apple': 9, 'pear': 4, 'kiwi': 5}
```

`update()` copies every pair from another dictionary, replacing the keys that already exist. To remove a key, `del` deletes it, and `pop()` deletes it and returns the value:

```python
del stock["kiwi"]
pears = stock.pop("pear")
print(stock, pears)
print(stock.pop("plum", "not there"))
```

```text
{'apple': 9} 4
not there
```

Like `get()`, `pop()` takes a default for a missing key. Without one, a missing key raises `KeyError`.

## Looping over a dictionary

A [`for` loop](en/posts/python-loops/) over a dictionary gives its keys. `values()` gives the values, and `items()` gives `(key, value)` pairs, which you unpack in the loop:

```python
prices = {"apple": 4.5, "bread": 9.9, "milk": 6.2}
for name in prices:
    print(name)

print(sum(prices.values()))

for name, price in prices.items():
    print(f"{name:<6} {price:>5.2f}")
```

```text
apple
bread
milk
20.6
apple   4.50
bread   9.90
milk    6.20
```

The format specs `:<6` and `:>5.2f` line up the columns, as in the [f-strings post](en/posts/python-f-strings/). Don't add or remove keys while looping over a dictionary (`RuntimeError: dictionary changed size during iteration`); loop over `list(prices)` if you must.

## Counting with a dictionary

To count how many times each thing appears, `get(key, 0)` gives zero for a key not seen yet:

```python
words = "the cat and the hat and the bat".split()
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
print(counts)
print(max(counts, key=counts.get))
```

```text
{'the': 3, 'cat': 1, 'and': 2, 'hat': 1, 'bat': 1}
the
```

`max(counts, key=counts.get)` finds the key with the largest value. The standard library's `collections.Counter` does the same counting in one line.

## Nested data

Values can be anything, including lists and other dictionaries, like a JSON response from a web API:

```python
user = {
    "name": "Dana",
    "langs": ["he", "en"],
    "address": {"city": "Haifa", "zip": "3200003"},
}
print(user["langs"][0])
print(user["address"]["city"])
user["langs"].append("fr")
print(user["langs"])
```

```text
he
Haifa
['he', 'en', 'fr']
```

Read nested values one step at a time, from the outside in: `user["address"]` is a dictionary, and `["city"]` reads from it.

## What can be a key

Keys must be *hashable*: in practice, values that can't change, like strings, numbers and tuples. A list can't be a key:

```python
grid = {(0, 0): "start", (2, 3): "treasure"}
print(grid[(2, 3)])
bad = {["a", "b"]: 1}
```

```text
treasure
TypeError: unhashable type: 'list'
```

A list could change after being used as a key, so it's refused. Values have no such limit.

## Common mistakes

- **Expecting `in` to search values.** `"Dana" in user` checks keys. For values, use `"Dana" in user.values()`.
- **Copying with `=`.** As with lists, `b = a` gives a second name for the same dictionary. Use `a.copy()` for a separate one.

## What's next

Next in the series: the dictionary tools beyond the basics: comprehensions, `setdefault`, `defaultdict`, `Counter` and merging.
