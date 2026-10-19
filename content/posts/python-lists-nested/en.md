---
title: "List indexes, IndexError and nested lists"
summary: "How a list index is really an offset, why it raises IndexError, how to stay inside the bounds, building lists with append() in a loop, and lists inside lists."
date: 2026-10-19
tags: [python]
series: { key: python, order: 11 }
---

The [lists post](en/posts/python-lists/) showed the basics. This one explains the number inside the brackets, the error it causes most often, and what to do when a list holds other lists.

Every example ran with Python 3.13. The behavior was checked against the [lists section of the tutorial](https://docs.python.org/3/tutorial/introduction.html#lists) and the [sequence types reference](https://docs.python.org/3/library/stdtypes.html#common-sequence-operations).

## The index is an offset

The index is not the item's place in line. It is the **offset**: how many steps to move from the start of the list. The first item is 0 steps away, so its index is `0`:

```python
letters = ["a", "b", "c", "d"]
for offset in range(len(letters)):
    print(offset, letters[offset])
```

```text
0 a
1 b
2 c
3 d
```

A list of length `n` has the indexes `0` to `n - 1`. A negative index counts from the end: `-1` is one step back from the end, so `letters[-1]` is the last item.

## IndexError

An index outside that range raises `IndexError`:

```python
print(letters[4])
```

```text
IndexError: list index out of range
```

```python
print(letters[-5])
```

```text
IndexError: list index out of range
```

`letters[4]` fails because the valid offsets stop at 3. An empty list has no valid index at all, so `[][0]` and `[][-1]` always fail. That makes the "last item" of a list that might be empty a classic bug.

To stay inside the bounds, check the length first, or catch the error ([exceptions post](en/posts/python-exceptions/)):

```python
queue = []
if queue:
    print("next:", queue[0])
else:
    print("queue is empty")

try:
    print(queue[0])
except IndexError:
    print("nothing at offset 0")
```

```text
queue is empty
nothing at offset 0
```

An empty list is false in a condition, so `if queue:` reads as "if the list has items". A slice never raises: `queue[:1]` is `[]` when the list is empty.

## Building a list with append()

`append()` changes the list in place and returns `None`. A common pattern is to start with an empty list and add one item per pass of a [loop](en/posts/python-loops/):

```python
squares = []
for n in range(1, 6):
    squares.append(n * n)
print(squares)
```

```text
[1, 4, 9, 16, 25]
```

The new item lands at offset `len(squares)`, one past the old last item. That is the one position you can't reach with an index. `squares[5] = 36` is an `IndexError` while `squares.append(36)` works.

Because `append()` returns `None`, this common mistake loses the list:

```python
squares = squares.append(36)
print(squares)
```

```text
None
```

## Lists inside lists

A list item can be any value, including another list. A list of lists is a table: the outer list holds the rows, each inner list is one row:

```python
grid = [
    [1, 2, 3],
    [4, 5, 6],
]
print(len(grid), len(grid[0]))
print(grid[1])
print(grid[1][2])
```

```text
2 3
[4, 5, 6]
6
```

`grid[1]` is the second row, itself a list, so `grid[1][2]` takes offset 2 inside it: row first, then column. An index can fail at either level:

```python
print(grid[2][0])
```

```text
IndexError: list index out of range
```

```python
print(grid[0][3])
```

```text
IndexError: list index out of range
```

Change an item with the same two indexes: `grid[0][1] = 20`.

To visit every item, use a loop inside a loop. The outer loop gives each row, the inner loop gives each item in that row:

```python
total = 0
for row in grid:
    for value in row:
        total += value
    print(row, sum(row))
print(total)
```

```text
[1, 2, 3] 6
[4, 5, 6] 15
21
```

To build a table, append one row per pass. Make a **new** inner list on each pass:

```python
table = []
for i in range(1, 4):
    row = []
    for j in range(1, 4):
        row.append(i * j)
    table.append(row)
print(table)
```

```text
[[1, 2, 3], [2, 4, 6], [3, 6, 9]]
```

## The repeated-row trap

`[0] * 3` is a fine way to make `[0, 0, 0]`. Repeating a list of lists is not, because the copies are not copies. Every row is the same list:

```python
bad = [[0] * 3] * 2
bad[0][0] = 9
print(bad)

good = [[0] * 3 for _ in range(2)]
good[0][0] = 9
print(good)
```

```text
[[9, 0, 0], [9, 0, 0]]
[[9, 0, 0], [0, 0, 0]]
```

`bad` holds two names for one row ([two names, one list](en/posts/python-lists/)). The `for` inside the brackets, a *list comprehension*, builds a new row each time, so changing one leaves the other alone.

## Common mistakes

- **Using `len(items)` as an index.** The last offset is `len(items) - 1`, or `-1`.
- **Row and column swapped.** `grid[row][column]`: the first index picks the inner list.
- **Adding to a list you loop over.** The loop keeps finding new items. Build a second list instead.

## What's next

Next: conditions with `if`, `elif` and `else`, which decide what to run based on values like `len(queue) > 0`.
