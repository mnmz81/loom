---
title: "print(): showing output in Python"
summary: "How print() works in Python 3: printing several values, the sep and end arguments, printing to stderr, and the common mistake of printing None."
date: 2026-10-11
tags: [python, tutorial]
series: { key: python, order: 2 }
---

`print()` is the most used function in Python. It writes text to the screen, usually for debugging or to show a result. In the previous post it showed up in the first program. This post covers what it does with more than one value and which arguments change its output.

Every code example here was run with Python 3.13, and the behavior was checked against the [official `print()` docs](https://docs.python.org/3/library/functions.html#print).

## Printing one value or several

`print()` accepts any number of values, separated by commas. It converts each one to text and puts a space between them:

```python
print("Hello")
print("a", "b", "c")
```

```text
Hello
a b c
```

Each `print()` call ends with a newline, so the next call starts on a new line. With no arguments, `print()` prints just an empty line.

## sep and end

Two keyword arguments control the separator and the ending:

- `sep` goes between the values (default: a space).
- `end` goes after the last value (default: `\n`, a newline).

```python
print("a", "b", "c", sep="-")
print("no newline", end=" ")
print("continues here")
print()
```

```text
a-b-c
no newline continues here

```

The `end=" "` argument stays on the same line, so the next `print()` continues there. The empty `print()` at the end adds the blank line in the output.

The docs say `sep`, `end`, `file` and `flush` "must be given as keyword arguments", so `print("a", "b", "-")` is not a separator. It's a third value, and it prints `a b -`.

## Printing values with f-strings

Most of the time you want to mix text and variables. An f-string (a string with an `f` before the quotes) puts the variable inside braces:

```python
name = "Ada"
age = 36
print(f"{name} is {age}")
```

```text
Ada is 36
```

The full string syntax is in the next posts. For now, know that it's the cleanest way to print a mix of text and values.

## Where the output goes

By default `print()` writes to standard output. The `file` argument sends it somewhere else. Errors and warnings usually go to standard error (`sys.stderr`), so they can be separated from normal output:

```python
import sys

print("something went wrong", file=sys.stderr)
```

In a terminal both streams look the same. The difference matters when you redirect output to a file.

## Common mistake: print returns None

`print()` shows the value, but it doesn't return it. If you assign its result, you store `None`:

```python
x = print("hi")
print(x)
```

```text
hi
None
```

If you want the value to stay in a variable, assign it first and print the variable.

## What's next

Next in the series: variables and types, which are the values `print()` shows.
