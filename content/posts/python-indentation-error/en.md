---
title: "Indentation in Python and the IndentationError"
summary: "How Python uses indentation to group code, the four IndentationError messages you'll meet, why tabs and spaces can trigger a TabError, and how to find and fix them."
date: 2026-10-11
tags: [python]
series: { key: python, order: 13 }
---

In Python, indentation is part of the syntax. Other languages use braces `{}` to mark a block of code. Python uses the whitespace at the start of the line. The docs say: "indentation is Python's way of grouping statements".

Every example ran with Python 3.13, checked against the [lexical analysis docs](https://docs.python.org/3/reference/lexical_analysis.html#indentation) and the [exceptions reference](https://docs.python.org/3/library/exceptions.html#IndentationError).

## The rule

A block starts with a line that ends in a colon, such as `if`, `for`, `def` or `while`. The lines that belong to the block are indented more than the header:

```python
if 5 > 2:
    print("five is bigger")
    print("this is still inside the if")
print("this is outside")
```

```text
five is bigger
this is still inside the if
this is outside
```

The docs say each line in a block "must be indented by the same amount". The indentation ends when a line goes back to a shallower level.

## Error 1: unexpected indent

This happens when a line is indented but there's no block for it:

```python
print("hi")
    print("oops")
```

```text
  File "demo.py", line 2
    print("oops")
IndentationError: unexpected indent
```

The fix is to remove the extra spaces so the line matches the one before it.

## Error 2: expected an indented block

The opposite problem. A header ends with a colon, but the next line isn't indented:

```python
if 5 > 2:
print("five is bigger")
```

```text
  File "demo.py", line 2
    print("five is bigger")
    ^^^^^
IndentationError: expected an indented block after 'if' statement on line 1
```

Indent the body, or use `pass` for an empty block:

```python
if 5 > 2:
    pass
```

## Error 3: unindent does not match

A line goes back to an indentation level that no block opened:

```python
if True:
        x = 1
    y = 2
```

```text
  File "demo.py", line 3
    y = 2
         ^
IndentationError: unindent does not match any outer indentation level
```

Python keeps a stack of indentation levels. The first block opened at 8 spaces, so the line with 4 spaces doesn't match any level on the stack. Make it match one of the earlier levels, which here means 0 or 8 spaces.

## Error 4: TabError

Tabs and spaces both count as indentation, and their width depends on the editor. A file that mixes them can mean something different in another editor, so Python 3 refuses it:

```python
if True:
	x = 1
        y = 2
```

```text
  File "demo.py", line 3
    y = 2
TabError: inconsistent use of tabs and spaces in indentation
```

`TabError` is a subclass of `IndentationError`. The docs say the meaning of a line can depend on "the worth of a tab in spaces". Here, if a tab counts as 8 columns the second line's 8 spaces line up with it; if it counts as 1, they don't. The fix is to use spaces only. Four spaces per level is the convention.

The standard `tabnanny` checker prints the first line where tabs and spaces are ambiguous:

```bash
python3 -m tabnanny demo.py
```

```text
demo.py 3 '        y = 2'
```

## Catching it in code

`IndentationError` is a subclass of `SyntaxError` and can be caught like any error. `compile()` checks source code without running it:

```python
try:
    compile("if True:\nprint(1)\n", "<demo>", "exec")
except IndentationError as e:
    print(type(e).__name__, e.lineno, e.msg)
```

```text
IndentationError 2 expected an indented block after 'if' statement on line 1
```

Normal scripts rarely catch it, because it stops the program before it runs. It matters when a tool such as an editor or a linter reads a file, or when code is built from a string.

## Common mistakes

- **Copying code from a website.** Some pages turn tabs into spaces or lose the indentation.
- **Mixing editors.** One editor writes tabs and another writes spaces. Set a single setting for the project.
- **Off-by-one indentation.** A line with 3 spaces next to lines with 4 gives "unindent does not match".

An editor set to show whitespace and convert tabs to spaces avoids all four errors.

## What's next

Next in the series: the modulo operator `%`, which shows up in conditions all the time: even or odd, every Nth item, and wrapping around.
