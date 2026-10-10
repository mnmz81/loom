---
title: "What is Python, and why use it?"
summary: "What Python is, what it's good for, and how it differs from languages like C and Java: interpreted, dynamically typed, indentation-based and batteries included."
date: 2026-10-10
tags: [python, tutorial]
series: { key: python, order: 1 }
---

Python is a high-level, general-purpose programming language. The official FAQ describes it as "an interpreted, interactive, object-oriented programming language" that also supports procedural and functional styles. It runs on Windows, macOS and Linux, and it's used for web backends, automation scripts, data analysis, games, teaching and a lot more.

This is the first post in a series where each post covers one Python topic. Every code example here was run, and the claims were checked against the official Python docs.

## A short history

Guido van Rossum started Python during the Christmas holidays of 1989 and posted it to USENET in February 1991. The name comes from the BBC show *Monty Python's Flying Circus*, not from the snake.

The language is free to use, including commercially. Python 2 is no longer maintained, so everything today means Python 3.

## What Python looks like

The classic first program is one line:

```python
print("Hello, world!")
```

```text
Hello, world!
```

No `main` function, no class, no semicolons, and no compile step. You save it as `hello.py` and run `python3 hello.py`.

## How it differs from other languages

### 1. It's interpreted

In C or Java you compile first and then run. In Python you run the source directly. The docs say this saves "considerable time during program development because no compilation and linking is necessary".

There's also an interactive mode: type `python3` and you get a prompt where every line runs immediately. It's a good place to try small ideas.

Two honest caveats. First, the distinction is blurry: the standard implementation (CPython) compiles your source to bytecode behind the scenes, and caches it in `.pyc` files. Second, interpreted programs generally run more slowly than compiled ones, which is the price of the short edit-and-run cycle.

### 2. Indentation is the syntax

Other languages mark blocks with braces. Python uses indentation: "statement grouping is done by indentation instead of beginning and ending brackets."

```python
words = ["python", "is", "readable"]
lengths = {w: len(w) for w in words}
print(lengths)
for word, n in lengths.items():
    if n > 2:
        print(word, "is longer than 2")
    else:
        print(word, "is short")
```

```text
{'python': 6, 'is': 2, 'readable': 8}
python is longer than 2
is is short
readable is longer than 2
```

This is the code you'd write anyway to make it readable, except now it's enforced. Indenting a line by accident is an error, not a silent change in meaning:

```text
IndentationError: unexpected indent
```

### 3. No type declarations, but types still exist

You don't declare a variable's type: "no variable or argument declarations are necessary." A name can point to a number now and a string later:

```python
x = 5
print(x, type(x))
x = "five"
print(x, type(x))
```

```text
5 <class 'int'>
five <class 'str'>
```

Python is **dynamically typed** (types belong to values, and are checked as the program runs) but not loosely typed. It won't quietly turn a string into a number:

```python
"5" + 1
```

```text
TypeError: can only concatenate str (not "int") to str
```

The exact wording of error messages changes between versions, but the error itself doesn't.

Because Python looks at what an object can do rather than what it's called, code works with anything that fits. This is called duck typing in the docs: "If it looks like a duck and quacks like a duck, it must be a duck."

```python
def total(items):
    return sum(items)

print(total([1, 2, 3]))
print(total((1.5, 2.5)))
print(total({10, 20}))
```

```text
6
4.0
30
```

One function, three kinds of collections. If you want, you can add **type hints** (`def total(items: list[int]) -> int:`), but they're optional and Python doesn't enforce them. They're for editors and checkers like mypy.

### 4. Big built-in data types

Lists and dictionaries are part of the language, so complex operations fit in one statement. Integers also have no fixed size, so there's no overflow to worry about in everyday code:

```python
print(10 ** 30)
```

```text
1000000000000000000000000000000
```

### 5. Memory is managed for you

You never free memory by hand. CPython uses reference counting plus a cyclic garbage collector to clean up objects nobody uses anymore.

### 6. Batteries included

Python "comes with a large collection of standard modules" for files, system calls, sockets and more. Beyond that, the Python Package Index (pypi.org) holds third-party packages you install with `pip`. Your code is split into modules, so it's easy to reuse.

## So what is it good for?

According to the official tutorial, Python programs are typically much shorter than equivalent C, C++ or Java programs, and it's "applicable to a much larger problem domain than Awk or even Perl". It's a strong fit when:

- you want to get something working fast (scripts, automation, prototypes);
- readability matters more than raw speed;
- you need a library that already exists, which is very often.

It's a weaker fit when every microsecond counts, such as operating-system kernels or tight game engines. Even there Python is often the glue: the docs note you can write critical operations in C and call them from Python.

## Mistakes beginners make

- **Mixing tabs and spaces.** Pick spaces (four is the convention) and let your editor do it.
- **Typing `python` and getting a different version.** On many systems the command is `python3`. Check with `python3 --version`.
- **Expecting types to be checked before running.** Mistakes like `"5" + 1` only show up when that line runs.

## What's next

Next in the series: installing Python, running a script and using the interactive prompt.
