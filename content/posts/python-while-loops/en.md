---
title: "while loops in Python: sentinels, the walrus operator and loops that end"
summary: "When while beats for, the three parts every while loop needs, the continue that skips the update, sentinel loops with :=, draining a list, and capping retries."
date: 2026-10-29
tags: [python]
series: { key: python, order: 19 }
---

The [loops post](en/posts/python-loops/) showed the basic `while`, `break`, `continue` and `else`. This post is about writing `while` loops that stop when they should.

Every example ran with Python 3.13, checked against the [`while` statement reference](https://docs.python.org/3/reference/compound_stmts.html#the-while-statement) and [PEP 572](https://peps.python.org/pep-0572/) for `:=`.

## When while beats for

`for` fits when there is something to go over: a list, a string, a `range`. `while` fits when the number of passes depends on what happens inside the loop. Counting the digits of a number is one:

```python
n = 90210
digits = 0
while n > 0:
    n //= 10
    digits += 1
print(digits)
```

```text
5
```

Nobody knows in advance how many times `n //= 10` will run. The loop finds out.

## Three parts: start, condition, update

Every `while` loop has a starting value, a condition that's checked before each pass, and an update that moves the value towards making the condition false. Forget the update, and the loop never ends. The quiet version of that bug is a `continue` that skips the update:

```python
i = 0
evens = []
while i < 10:
    i += 1
    if i % 2:
        continue
    evens.append(i)
print(evens)
```

```text
[2, 4, 6, 8, 10]
```

`i += 1` is the first line of the body, so every path through the loop runs it. With `i += 1` at the bottom, the first odd number would `continue` past it, and `i` would stay at 1 forever.

## Sentinel loops and :=

A *sentinel* is a value that means "stop", like `quit` typed by the user. The classic form reads once before the loop and again at the end of the body. The walrus operator `:=` (Python 3.8) assigns inside the condition, so the read appears once:

```python
lines = iter(["add milk", "add bread", "quit", "add eggs"])

while (line := next(lines)) != "quit":
    print("got:", line)
print("last read:", line)
```

```text
got: add milk
got: add bread
last read: quit
```

`line := next(lines)` stores the value in `line` and also returns it, so the comparison uses it. The parentheses are needed: without them, `line` would get the result of `!=`, a `True` or `False`. In a real program, `input("> ")` takes the place of `next(lines)`.

## Draining a list

An empty list is false, so `while items:` runs until a list is empty. With `pop()`, it fits work that adds more work, like walking a folder tree or nested lists:

```python
todo = [1, [2, [3, 4]], 5]
flat = []
while todo:
    item = todo.pop()
    if isinstance(item, list):
        todo.extend(item)
    else:
        flat.append(item)
print(sorted(flat))
```

```text
[1, 2, 3, 4, 5]
```

A `for` loop over `todo` couldn't do this: the list changes while it's being read. Here the condition is checked again on each pass, so items added by `extend` are picked up.

## Capping the number of passes

A loop that waits for something outside your code (a network call, a file, a user) needs an upper limit. The `else` from the loops post fits here: it runs only when the loop ended without `break`.

```python
replies = iter([503, 503, 200])
attempt = 0
while attempt < 5:
    attempt += 1
    status = next(replies)
    print("attempt", attempt, "->", status)
    if status == 200:
        break
else:
    print("gave up")
```

```text
attempt 1 -> 503
attempt 2 -> 503
attempt 3 -> 200
```

If all five replies were 503, the loop would end on its condition and print `gave up`. A real retry loop also waits between attempts (`time.sleep`).

## Common mistakes

- **`=` in the condition.** `while x = 5:` is a `SyntaxError`. Compare with `==`, or use `:=` when you mean to assign.
- **Comparing floats with `!=`.** `x = 0` plus `0.1` ten times gives `0.9999999999999999`, so `while x != 1:` never stops. Use `<` or `<=`.
- **An update in only one branch.** If one `if` branch changes the value and the other doesn't, the loop can get stuck in the other branch. Put the update where every path runs it.

## What's next

Next in the series: dictionaries, which store values by name instead of by position.
