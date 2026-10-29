---
title: "Dictionaries in Python: a deep dive"
summary: "The dict tools past the basics: comprehensions, grouping with setdefault and defaultdict, Counter, merging with |, live views and set operations on keys, and sorting by value."
date: 2026-10-29
tags: [python]
series: { key: python, order: 21 }
---

The [dictionaries post](en/posts/python-dicts/) covered creating, reading, changing and looping. This one covers the tools that replace most of the hand-written loops around a dictionary.

Every example ran with Python 3.13, checked against the [mapping types reference](https://docs.python.org/3/library/stdtypes.html#mapping-types-dict) and the [`collections` module](https://docs.python.org/3/library/collections.html).

## Dict comprehensions

A comprehension builds a dictionary in one expression: `{key: value for item in iterable}`, with an optional `if`:

```python
prices = {"apple": 4.5, "bread": 9.9, "milk": 6.2, "cheese": 32.0}

with_vat = {name: round(p * 1.18, 2) for name, p in prices.items()}
cheap = {name: p for name, p in prices.items() if p < 10}
by_price = {p: name for name, p in prices.items()}
print(with_vat)
print(cheap)
print(by_price[9.9])
```

```text
{'apple': 5.31, 'bread': 11.68, 'milk': 7.32, 'cheese': 37.76}
{'apple': 4.5, 'bread': 9.9, 'milk': 6.2}
bread
```

`by_price` swaps keys and values. If two keys share a value, the later one wins and the earlier one is lost without a warning.

## Grouping: setdefault and defaultdict

Grouping means "a list per key". The long way checks whether the key exists before every `append`. [`setdefault(key, default)`](https://docs.python.org/3/library/stdtypes.html#dict.setdefault) returns the value if the key exists, and otherwise inserts `default` and returns it:

```python
words = ["apple", "avocado", "bread", "banana", "cherry"]

groups = {}
for w in words:
    groups.setdefault(w[0], []).append(w)
print(groups)
```

```text
{'a': ['apple', 'avocado'], 'b': ['bread', 'banana'], 'c': ['cherry']}
```

[`defaultdict`](https://docs.python.org/3/library/collections.html#collections.defaultdict) does the same for every missing key. It takes a function with no arguments, such as `list` or `int`, and calls it to create the missing value:

```python
from collections import defaultdict

groups = defaultdict(list)
for w in words:
    groups[w[0]].append(w)
print(groups["b"])
print(groups["z"])
print(sorted(groups))
```

```text
['bread', 'banana']
[]
['a', 'b', 'c', 'z']
```

The last line shows the price: just reading `groups["z"]` added `"z"`. To check without adding, use `in` or `get()`, which don't create keys.

## Counter

The dictionaries post counted words with `get(word, 0) + 1`. [`Counter`](https://docs.python.org/3/library/collections.html#collections.Counter) is a dictionary built for that:

```python
from collections import Counter

counts = Counter("the cat and the hat and the bat".split())
print(counts.most_common(2))
print(counts["dog"])
counts.update(["the", "dog"])
print(counts["the"], counts["dog"])
print(Counter("aab") + Counter("abc"))
```

```text
[('the', 3), ('and', 2)]
0
4 1
Counter({'a': 3, 'b': 2, 'c': 1})
```

A missing key gives `0`, and unlike `defaultdict`, reading it doesn't add it. `update()` adds to the counts instead of replacing them, and `+` adds two counters together.

## Merging: | and |=

Since Python 3.9, `|` merges two dictionaries into a new one, and `|=` updates one in place. When a key is in both, the right side wins:

```python
defaults = {"theme": "light", "lang": "he", "size": 14}
user = {"theme": "dark", "size": 16}

settings = defaults | user
print(settings)
print(defaults)
defaults |= {"lang": "en"}
print(defaults)
```

```text
{'theme': 'dark', 'lang': 'he', 'size': 16}
{'theme': 'light', 'lang': 'he', 'size': 14}
{'theme': 'light', 'lang': 'en', 'size': 14}
```

`defaults | user` is the "defaults, overridden by the user" pattern in one expression. In older code you'll see `{**defaults, **user}`, which does the same.

## Views are live

`keys()`, `values()` and `items()` don't copy anything. The reference calls them views: "when the dictionary changes, the view reflects these changes". The keys view also supports set operations:

```python
stock = {"apple": 3, "pear": 0}
names = stock.keys()
stock["kiwi"] = 7
print(names)

week1 = {"apple": 3, "pear": 1}
week2 = {"pear": 2, "kiwi": 5}
print(week1.keys() & week2.keys())
print(week1.keys() - week2.keys())
```

```text
dict_keys(['apple', 'pear', 'kiwi'])
{'pear'}
{'apple'}
```

`names` was taken before `kiwi` was added, and still shows it. `&` gives the keys in both dictionaries, and `-` the keys only in the first.

## Sorting by value

Dictionaries keep insertion order, but have no `sort()`. Sort the items with a `key` function and build a new dictionary from the result:

```python
scores = {"Dana": 88, "Avi": 95, "Noa": 72}
ranked = dict(sorted(scores.items(), key=lambda kv: kv[1], reverse=True))
print(ranked)
print(list(ranked)[0])
```

```text
{'Avi': 95, 'Dana': 88, 'Noa': 72}
Avi
```

`kv` is one `(name, score)` pair, and `kv[1]` is the score. Two dictionaries with the same pairs are equal (`==`) whatever their order.

## Common mistakes

- **Reading a `defaultdict` to check it.** `if groups["x"]:` adds `"x"`. Use `"x" in groups`.
- **`defaultdict([])` instead of `defaultdict(list)`.** It needs a function to call, not a value: `TypeError: first argument must be callable or None`.
- **Adding or removing keys while looping over a view.** The view changes too, and Python stops the loop with `RuntimeError`. Loop over `list(d.items())`.

## What's next

Next in the series: lists and dictionaries inside each other, the shape of most real data.
