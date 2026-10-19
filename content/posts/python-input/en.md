---
title: "input(): reading text from the user"
summary: "How input() reads a line from the user in Python: the prompt, why the result is always a str, converting it with int() and float(), the ValueError on bad input, and EOFError."
date: 2026-10-11
tags: [python]
series: { key: python, order: 8 }
---

`print()` writes to the screen. `input()` does the other direction: it shows an optional prompt, waits for the user to type a line and press Enter, and returns what was typed. It's the simplest way to make a script interactive.

Every example here was run with Python 3.13. The behavior was checked against the [official `input()` docs](https://docs.python.org/3/library/functions.html#input).

## The basic call

```python
name = input("What is your name? ")
print(f"Hello, {name}!")
```

The text in the parentheses is the prompt. It's written to the screen without a newline, so the cursor waits right after it. The docs say the line is read, "converts it to a string (stripping a trailing newline)", and returned.

If you type `Ada`, the screen shows:

```text
What is your name? Ada
Hello, Ada!
```

The `Ada` after the prompt is what you typed. It's not printed by the program.

## The result is always a str

Even when the user types digits, `input()` returns text:

```python
age = input("How old are you? ")
print(type(age))
```

If you type `36`, this prints:

```text
<class 'str'>
```

So `age + 1` would raise a `TypeError`. Convert the text first:

```python
age = input("How old are you? ")
years = int(age) + 1
print(f"Next year: {years}")
```

For decimals use `float()`. The conversion functions are covered in the type conversion post.

## Spaces are kept

`input()` removes only the trailing newline. Spaces stay:

```python
print(repr(input("Anything: ")))
```

If you type `  spaced  ` and press Enter, the output is:

```text
'  spaced  '
```

`repr()` shows the quotes and the spaces, so you can see them. To remove spaces at both ends, use `strip()`, the string method from the strings post.

## Common mistake: bad input

The user can type anything, so a conversion can fail:

```python
age = input("How old are you? ")
print(int(age))
```

If the user types `thirty`, the program stops:

```text
ValueError: invalid literal for int() with base 10: 'thirty'
```

For a real program, check the input before you convert it, or handle the error with `try` and `except`. A quick check with a string method is often enough:

```python
text = input("How old? ")
print(text.isdigit())
```

If you type `36`, this prints `True`. `isdigit()` only accepts digits, so `-5` and `3.5` return `False`.

## When there is no input

When the input stream ends, `input()` raises an error instead of returning an empty string. You see it when a script runs with no terminal attached, such as in a pipeline or from a file:

```python
name = input("What is your name? ")
```

```text
EOFError: EOF when reading a line
```

The docs say: "When EOF is read, EOFError is raised." An empty line (just pressing Enter) is different: that returns `""`, and the program keeps running.

## Common mistakes

- **Forgetting the space in the prompt.** `input("Name?")` puts the cursor right after the question mark. Add a space at the end of the prompt if you want a gap.

## What's next

Next: the `date` type, for days on a calendar.
