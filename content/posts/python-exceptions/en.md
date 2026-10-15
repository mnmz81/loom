---
title: "Exceptions in Python: try, except, else, finally"
summary: "What happens when Python hits an error at runtime: reading a traceback, catching errors with try/except, else and finally, raising your own exceptions, and why a bare except is a trap."
date: 2026-10-13
tags: [python]
series: { key: python, order: 21 }
---

The posts so far showed plenty of errors: `IndexError`, `KeyError`, `ValueError`, `TypeError`. Each stopped the program. The [TypeError post](en/posts/python-type-errors-and-checking/) showed a first `try`/`except` that catches one instead. This post covers the whole mechanism: errors detected during execution are called exceptions and "are not unconditionally fatal".

Every example here was run with Python 3.13. The behavior was checked against the [errors and exceptions tutorial](https://docs.python.org/3/tutorial/errors.html) and the [built-in exceptions reference](https://docs.python.org/3/library/exceptions.html).

## Reading a traceback

When an exception isn't handled, Python prints a *traceback* and stops. Read it from the bottom up: the last line says what went wrong, and the lines above say where:

```python
def average(numbers):
    return sum(numbers) / len(numbers)

print(average([]))
```

```text
Traceback (most recent call last):
  File "app.py", line 4, in <module>
    print(average([]))
          ~~~~~~~^^^^
  File "app.py", line 2, in average
    return sum(numbers) / len(numbers)
           ~~~~~~~~~~~~~^~~~~~~~~~~~~~
ZeroDivisionError: division by zero
```

The last line is the exception type and message. The frame above it is the line that failed, inside `average`; the one above that is the call that led there. The `~` and `^` marks point at the exact part of the line.

## try and except

Put code that might fail in a `try` block. If an exception of the type named in `except` happens, Python jumps to the `except` block instead of stopping:

```python
text = "12a"
try:
    number = int(text)
    print("parsed", number)
except ValueError:
    print("not a whole number:", text)
print("still running")
```

```text
not a whole number: 12a
still running
```

The rest of the `try` block is skipped once an exception happens, so `print("parsed", ...)` never runs. After the `except` block, the program continues normally.

`except ValueError as e` gives the exception object a name. `str(e)` is its message:

```python
try:
    int("12a")
except ValueError as e:
    print("error:", e)
    print(type(e).__name__)
```

```text
error: invalid literal for int() with base 10: '12a'
ValueError
```

## Catching several kinds

A `try` can have several `except` blocks. Python checks them in order and runs the first one that matches. One `except` can also take a tuple of types:

```python
def safe_ratio(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "can't divide by zero"
    except (TypeError, ValueError) as e:
        return f"bad input: {e}"

print(safe_ratio(6, 3))
print(safe_ratio(6, 0))
print(safe_ratio(6, "3"))
```

```text
2.0
can't divide by zero
bad input: unsupported operand type(s) for /: 'int' and 'str'
```

An exception type also matches its subclasses: `LookupError` catches both `IndexError` and `KeyError`. The full family tree is in the [built-in exceptions reference](https://docs.python.org/3/library/exceptions.html#exception-hierarchy).

## else and finally

`else` runs only if the `try` block finished without an exception. `finally` runs in every case: after success, after a handled exception, and even when an exception goes up to the caller. It's the place for cleanup:

```python
def read_number(text):
    try:
        value = int(text)
    except ValueError:
        print("bad:", text)
    else:
        print("good:", value)
    finally:
        print("done with", repr(text))

read_number("7")
read_number("x")
```

```text
good: 7
done with '7'
bad: x
done with 'x'
```

Why `else` and not more lines in `try`? Code in `else` isn't protected by the `except`, so an unexpected error there isn't hidden. Keep the `try` block as small as the line that can fail.

For files, `with open(...)` already does `finally`'s cleanup and closes the file even on an exception.

## Raising your own exceptions

`raise` throws an exception yourself. Use it when a function gets a value it can't work with. Pick the built-in type that fits, and write a message that says what was wrong:

```python
def set_age(age):
    if age < 0:
        raise ValueError(f"age can't be negative: {age}")
    return age

try:
    set_age(-3)
except ValueError as e:
    print(e)
```

```text
age can't be negative: -3
```

Inside an `except` block, a bare `raise` re-raises the same exception, after you log it or add details. For your own error types, define a class that inherits from `Exception`. Classes are a later topic, but the shape is short: `class OutOfStock(Exception): pass`.

## Don't catch everything

A bare `except:` or `except Exception:` catches every error, including your own typos:

```python
prices = {"tea": 12}
try:
    total = prices["tea"] * quantty
except Exception:
    total = 0
print(total)
```

```text
0
```

`quantty` is a misspelled name, so the real error is `NameError`. The `except` hid it, and the program carried on with a wrong total. Catch the specific exceptions you expect (here, `KeyError` for a missing product) and let everything else fail loudly.

## Common mistakes

- **A `try` block around half the program.** Wrap only the line that can fail, so you know which error you're handling.
- **`except: pass`.** Silently ignoring errors turns a clear crash into a wrong result that's hard to trace.
- **Catching to check what you could test.** `if key in d` is clearer than catching `KeyError` for a simple lookup. Use `try` when checking first would be awkward, like parsing a number.
- **Wrong order of `except` blocks.** A broad type before a narrow one catches everything first. Put `KeyError` before `LookupError`.
- **Raising a plain `Exception`.** Use a specific type like `ValueError` or `TypeError`, so callers can catch exactly that.

## What's next

Next in the series: pip, the tool that installs packages other people wrote.
