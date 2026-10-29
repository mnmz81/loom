---
title: "Nesting lists and dictionaries in Python"
summary: "List of dicts, dict of lists or dict of dicts: picking the shape, reading deep values safely, looping through levels, reshaping, the shallow-copy trap, and printing it readably."
date: 2026-10-29
tags: [python]
series: { key: python, order: 22 }
---

Most real data is lists and dictionaries inside each other: a JSON response from an API, a config file, rows from a spreadsheet. The [nested lists post](en/posts/python-lists-nested/) covered grids, and the [dictionaries post](en/posts/python-dicts/) read one nested value. This post is about working with the whole structure.

Every example ran with Python 3.13, checked against the [data structures tutorial](https://docs.python.org/3/tutorial/datastructures.html) and the [`copy` module](https://docs.python.org/3/library/copy.html).

## Three shapes for the same data

```python
# list of dicts: one dict per record
orders = [
    {"id": 7, "customer": "Dana", "items": [{"name": "pen", "qty": 3, "price": 2.5}]},
    {"id": 8, "customer": "Avi", "items": [{"name": "book", "qty": 1, "price": 40.0},
                                           {"name": "pen", "qty": 2, "price": 2.5}]},
    {"id": 9, "customer": "Dana", "items": []},
]

# dict of dicts: records by id
by_id = {o["id"]: o for o in orders}

# dict of lists: order ids per customer
by_customer = {}
for o in orders:
    by_customer.setdefault(o["customer"], []).append(o["id"])

print(by_id[8]["customer"])
print(by_customer)
```

```text
Avi
{'Dana': [7, 9], 'Avi': [8]}
```

Pick the shape from the question you'll ask most:

- **List of dicts**: "go over all of them". It's what APIs and CSV readers usually give you.
- **Dict of dicts**: "find one by its id". `by_id[8]` is one step, instead of a loop over the list.
- **Dict of lists**: "everything that belongs to X". The grouping comes from [`setdefault`](en/posts/python-dicts-deep-dive/).

`by_id` holds the same dictionaries as `orders`, not copies: change `by_id[8]` and `orders[1]` changes too.

## Reading deep values safely

A chain of `[]` reads from the outside in, and fails at the first level that's missing:

```python
order = orders[0]
print(order["items"][0]["name"])
print(order.get("shipping", {}).get("city", "no city"))
print(orders[2]["items"][0]["name"])
```

```text
pen
no city
IndexError: list index out of range
```

`.get("shipping", {})` returns an empty dictionary when the key is missing, so the next `.get` has something to call. Lists have no `get()`: check the length or loop over the list instead. The error names the type that failed (`IndexError` for a list, `KeyError` for a dictionary), which tells you which level was missing.

## Looping through the levels

One loop per level, and each loop works on what the previous one gave it:

```python
for order in orders:
    total = 0
    for item in order["items"]:
        total += item["qty"] * item["price"]
    print(order["id"], order["customer"], total)
```

```text
7 Dana 7.5
8 Avi 45.0
9 Dana 0
```

When the inner loop only adds things up, `sum()` with a generator replaces it:

```python
totals = {o["id"]: sum(i["qty"] * i["price"] for i in o["items"]) for o in orders}
print(totals)
```

```text
{7: 7.5, 8: 45.0, 9: 0}
```

## Shallow copies share the inside

`copy()`, `list()` and `[:]` copy only the outer level. The inner lists and dictionaries are shared between the original and the copy:

```python
import copy

shallow = orders.copy()
deep = copy.deepcopy(orders)

shallow[0]["customer"] = "Noa"
deep[1]["items"].clear()
print(orders[0]["customer"], len(orders[1]["items"]))
```

```text
Noa 2
```

Changing `shallow[0]` changed `orders[0]`, because both lists hold the same dictionary. [`copy.deepcopy()`](https://docs.python.org/3/library/copy.html#copy.deepcopy) copies every level, so clearing `deep[1]["items"]` left the original alone. Use it before changing a nested structure you received from elsewhere.

## Printing it readably

`print()` puts everything on one line. [`json.dumps(..., indent=2)`](https://docs.python.org/3/library/json.html#json.dumps) prints one value per line:

```python
import json

print(json.dumps(orders[1], indent=2))
```

```text
{
  "id": 8,
  "customer": "Avi",
  "items": [
    {
      "name": "book",
      "qty": 1,
      "price": 40.0
    },
    {
      "name": "pen",
      "qty": 2,
      "price": 2.5
    }
  ]
}
```

This works only with JSON types: dictionaries with string keys, lists, strings, numbers, booleans and `None`. For anything else, [`pprint.pprint()`](https://docs.python.org/3/library/pprint.html) prints any Python value, wrapping long lines.

## Common mistakes

- **Looping over the wrong level.** `for item in order:` goes over the order's keys (`id`, `customer`, `items`), not its items. Write `order["items"]`.
- **Expecting `copy()` to protect nested data.** It copies one level. Use `copy.deepcopy()`.
- **A long `[]` chain on data from outside.** One missing key crashes the whole line. Use `.get()` with a default at each level that might be missing.

## What's next

Next in the series: functions, which give a name to a block of code so you can run it again with different values.
