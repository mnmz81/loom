---
title: "Loops in Python: for and while"
summary: "Running code again and again: for over a list or a range, enumerate and zip, while, break and continue, the else clause on a loop, and the loop bugs everyone writes once."
date: 2026-10-13
tags: [python]
series: { key: python, order: 15 }
---

The [modulo post](en/posts/python-modulo/) already used a few loops without explaining them. This post does. A loop runs the same block of code again and again: once for every item in a [list](en/posts/python-lists/), once for every number in a range, or for as long as a condition is true. Python has two loops: `for` and `while`.

Every example here was run with Python 3.13. The behavior was checked against the [control flow tutorial](https://docs.python.org/3/tutorial/controlflow.html#for-statements) and the [`for` statement reference](https://docs.python.org/3/reference/compound_stmts.html#the-for-statement).

## for: one item at a time

In Python, `for` goes through the items of a sequence. The tutorial says it "iterates over the items of any sequence (a list or a string), in the order that they appear in the sequence". Each time around, the loop variable holds the next item:

```python
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(fruit, len(fruit))
print("done")
```

```text
apple 5
banana 6
cherry 6
done
```

The indented block is the body of the loop. `print("done")` isn't indented, so it runs once, after the loop. A string is a sequence of characters, so a loop over a string gets one character at a time:

```python
for ch in "hey":
    print(ch.upper())
```

```text
H
E
Y
```

A common pattern is the *accumulator*: a variable that starts empty and grows on each pass:

```python
scores = [90, 72, 85, 64]
total = 0
passed = []
for score in scores:
    total += score
    if score >= 70:
        passed.append(score)
print(total, passed)
```

```text
311 [90, 72, 85]
```

## range(): looping over numbers

`range()` gives a sequence of whole numbers. With one argument it starts at 0 and stops *before* the end. With two, you choose the start. A third argument is the step:

```python
print(list(range(5)))
print(list(range(2, 6)))
print(list(range(10, 0, -3)))

for i in range(3):
    print("attempt", i + 1)
```

```text
[0, 1, 2, 3, 4]
[2, 3, 4, 5]
[10, 7, 4, 1]
attempt 1
attempt 2
attempt 3
```

`range(5)` is 0 to 4, five numbers. The end is never included, the same as in a slice.

## enumerate and zip

When you need the position as well as the item, don't loop over `range(len(items))`. Use `enumerate()`, which gives pairs of index and item. The `start` argument changes where counting begins:

```python
fruits = ["apple", "banana", "cherry"]
for i, fruit in enumerate(fruits, start=1):
    print(f"{i}. {fruit}")
```

```text
1. apple
2. banana
3. cherry
```

`i, fruit` unpacks each pair, the same way `x, y = point` unpacks a tuple. To go through two lists side by side, use `zip()`:

```python
names = ["Dana", "Avi", "Noa"]
ages = [31, 25, 40]
for name, age in zip(names, ages):
    print(name, age)
```

```text
Dana 31
Avi 25
Noa 40
```

`zip()` stops at the end of the shortest list. In Python 3.10 and later, `zip(names, ages, strict=True)` raises a `ValueError` instead, when the lengths differ.

## while: loop until a condition changes

`while` repeats as long as its condition is true. It checks the condition before every pass, so it fits when you don't know in advance how many passes you need:

```python
balance = 100
years = 0
while balance < 200:
    balance *= 1.1
    years += 1
print(years, round(balance, 2))
```

```text
8 214.36
```

Something inside the body has to change the condition. If nothing does, the loop never ends. In a terminal, `Ctrl+C` stops a stuck program.

## break and continue

`break` leaves the loop right away. `continue` skips the rest of the current pass and moves on to the next one:

```python
for n in [4, 7, -1, 9, 0, 3]:
    if n < 0:
        continue
    if n == 0:
        break
    print(n)
```

```text
4
7
9
```

`-1` is skipped by `continue`. At `0`, `break` ends the loop, so `3` is never reached. Both work in `while` loops too.

A loop that stops on a condition in the middle often uses `while True` with a `break`. It's the usual shape for "keep asking until the answer is valid":

```python
attempts = ["", "abc", "42"]
while True:
    answer = attempts.pop(0)
    if answer.isdigit():
        break
    print("not a number:", repr(answer))
print("got", int(answer))
```

```text
not a number: ''
not a number: 'abc'
got 42
```

In a real program, `answer = input("Number: ")` would take the place of `attempts.pop(0)`.

## else on a loop

A loop can have an `else` block. It runs when the loop finishes normally, and is skipped when the loop ends with `break`. The tutorial says: "If the loop finishes without executing the break, the else clause executes." It fits searches:

```python
for n in [3, 9, 15]:
    if n % 2 == 0:
        print("found an even number:", n)
        break
else:
    print("no even numbers")
```

```text
no even numbers
```

Read the `else` as "no break". Many Python programmers find it confusing, so use it when it makes the code shorter, and a flag variable when it doesn't.

## Common mistakes

- **Changing a list while looping over it.** Removing items from the list you're looping over skips items. Loop over a copy (`for x in items[:]`) or build a new list.
- **`range(len(items))` for everything.** `for item in items` is shorter, and `enumerate()` gives the index when you need it.
- **Off-by-one with `range`.** `range(1, 10)` stops at 9. To include 10, write `range(1, 11)`.
- **A `while` that never ends.** Make sure the body changes something the condition checks.
- **Expecting `for` to make a new scope.** The loop variable still exists after the loop, with its last value. The [code blocks post](en/posts/python-code-blocks-scope/) explains why.

## What's next

Next in the series: dictionaries, which store values by name instead of by position, and which you'll loop over constantly.
