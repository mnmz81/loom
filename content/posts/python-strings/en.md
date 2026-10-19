---
title: "Strings in Python: slicing, methods and manipulation"
summary: "Python strings: quotes and escapes, raw and triple-quoted strings, indexing and slicing, immutability, the common str methods for changing, splitting and searching text."
date: 2026-10-11
tags: [python]
series: { key: python, order: 4 }
---

A string (`str`) is text. Python has a lot of tools for working with it, and most of them come built in as methods on the string itself.

Every code example here was run with Python 3.13, and the behavior was checked against the [official tutorial](https://docs.python.org/3/tutorial/introduction.html) and the [string methods reference](https://docs.python.org/3/library/stdtypes.html#string-methods).

## Writing strings

Single and double quotes give the same result. To put a quote inside a string, escape it with a backslash or use the other kind of quote:

```python
print('He said "hi"')
print("It's fine")
print("Tab\there")
```

```text
He said "hi"
It's fine
Tab	here
```

A raw string, with an `r` before the quote, keeps backslashes as they are. It's useful for Windows paths and regular expressions:

```python
print(r"C:\new\folder")
```

```text
C:\new\folder
```

Triple quotes (`"""` or `'''`) allow line breaks:

```python
print("""multi
line""")
```

```text
multi
line
```

Two string literals written next to each other are joined automatically. That works only for literals, not for variables.

## Indexing and slicing

Each character has an index. The first is `0`, and negative indexes count from the end:

```python
s = "Hello, World"
print(s[0], s[-1])
```

```text
H d
```

A slice `s[start:end]` takes characters from `start` up to, but not including, `end`:

```python
print(s[0:5])
print(s[7:])
print(s[::-1])
```

```text
Hello
World
dlroW ,olleH
```

`s[::-1]` takes every character with a step of -1, which reverses the string.

`len()` returns the number of characters:

```python
print(len(s))
```

```text
12
```

## Strings are immutable

You can read a character, but you can't change one in place:

```python
t = "immutable"
t[0] = "I"
```

```text
TypeError: 'str' object does not support item assignment
```

Methods don't change the original string either. They return a new one, so you have to keep the result (`s = s.upper()`):

```python
s = "Hello, World"
s.upper()
print(s)
print(s.upper())
```

```text
Hello, World
HELLO, WORLD
```

## Changing text

```python
print(s.lower(), s.upper())
print(s.replace("World", "Python"))
print("hello world".title(), "hello".capitalize())
print("  padded  ".strip() + "|")
print("ab" * 3)
```

```text
hello, world HELLO, WORLD
Hello, Python
Hello World Hello
padded|
ababab
```

- `replace(old, new)` replaces every occurrence.
- `strip()` removes spaces from both ends. `lstrip()` and `rstrip()` work on one side.
- `*` repeats a string.

## Splitting and joining

`split()` turns a string into a list, and `join()` does the reverse, using the string it's called on as the separator:

```python
print("a,b,c".split(","))
print("-".join(["2026", "10", "11"]))
```

```text
['a', 'b', 'c']
2026-10-11
```

## Searching

`find()` returns the index of the first match, or `-1` if there isn't one. `index()` returns the same index, but raises an error:

```python
print(s.find("World"), s.find("xyz"))
print(s.count("l"))
print(s.startswith("Hell"), s.endswith("!"))
```

```text
7 -1
3
True False
```

```python
s.index("xyz")
```

```text
ValueError: substring not found
```

Use `find()` when a missing value is normal, and `index()` when it should be an error.

## Padding and checking content

```python
print("42".zfill(5), "7".rjust(3, "0"))
print("abc".isalpha(), "123".isdigit())
```

```text
00042 007
True True
```

`zfill()` and `rjust()` pad to a width. Pass a fill character as the second argument of `rjust()` if you don't want spaces.

## What's next

Next: f-strings, which put values and number formats inside a string.
