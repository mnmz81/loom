---
title: "TypeError and type checking in Python"
summary: "The common TypeError messages in Python and what they mean, checking types with type() and isinstance(), why type hints are not enforced, and when to check types versus catching the error."
date: 2026-10-11
tags: [python]
series: { key: python, order: 27 }
---

A `TypeError` means you used a value in a way its type doesn't support. The docs describe it as "an operation or function is applied to an object of inappropriate type". It's one of the most common errors.

Every example ran with Python 3.13, checked against the [`TypeError` docs](https://docs.python.org/3/library/exceptions.html#TypeError) and the [`isinstance()` docs](https://docs.python.org/3/library/functions.html#isinstance).

## The common TypeError messages

Read the last line of the error. It names the types involved.

**Mixing text and numbers,** often a value from `input()`, which always returns a `str`:

```python
"5" + 1
```

```text
TypeError: can only concatenate str (not "int") to str
```

**A function that doesn't accept the type:**

```python
len(5)
```

```text
TypeError: object of type 'int' has no len()
```

**Using `None` as a value.** This often comes from a function that forgot to `return`:

```python
None + 1
```

```text
TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'
```

**Calling something that isn't a function:**

```python
x = 5
x()
```

```text
TypeError: 'int' object is not callable
```

**Indexing something that has no items:**

```python
x = 5
x[0]
```

```text
TypeError: 'int' object is not subscriptable
```

**Looping over a number:**

```python
for item in 5:
    pass
```

```text
TypeError: 'int' object is not iterable
```

**Wrong number of arguments:**

```python
len()
```

```text
TypeError: len() takes exactly one argument (0 given)
```

**Comparing types that can't be ordered:**

```python
3 < "4"
```

```text
TypeError: '<' not supported between instances of 'int' and 'str'
```

The exact wording changes between Python versions. The error type and the idea don't.

## TypeError or ValueError?

The docs draw a line between the two. Passing the wrong *type*, such as a list where an int is expected, should give a `TypeError`. Passing the right type with a bad *value*, such as `int("abc")`, gives a `ValueError`.

## Checking a type: type() and isinstance()

`type()` returns the exact type of a value. `isinstance()` asks whether a value is of a type, or of a subclass of it:

```python
print(type(5), type(5) == int, type(True) == int)
print(isinstance(5, int), isinstance(True, int), isinstance(5.0, int))
```

```text
<class 'int'> True False
True True False
```

`type(True) == int` is `False`, but `isinstance(True, int)` is `True`, because `bool` is a subclass of `int`. The docs say `isinstance()` is the recommended way to test types for this reason.

`isinstance` accepts a tuple, which means "any of these":

```python
print(isinstance(5, (int, float)), isinstance("5", (int, float)))
```

```text
True False
```

## Checking before you use a value

A function can check its inputs and raise a clear error:

```python
def safe_add(a, b):
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        raise TypeError("numbers only")
    return a + b

print(safe_add(1, 2.5))
safe_add(1, "2")
```

```text
3.5
TypeError: numbers only
```

Don't overdo this. Python is dynamically typed, and a function that works with any value that has the right behavior is often more useful than one that insists on one type.

## Catching instead of checking

Sometimes it's simpler to try and handle the failure:

```python
def to_number(text):
    try:
        return int(text)
    except ValueError:
        return float(text)

print(to_number("3"), to_number("3.5"))
```

```text
3 3.5
```

## Type hints are not enforced

You can add type hints to a function:

```python
def double(x: int) -> int:
    return x * 2

print(double(4))
print(double("ab"))
```

```text
8
abab
```

The docs say: "The Python runtime does not enforce function and variable type annotations. They can be used by third party tools such as type checkers, IDEs, linters, etc." A checker like mypy would flag the second call before you run the code. At runtime, the hints are only stored:

```python
print(double.__annotations__)
```

```text
{'x': <class 'int'>, 'return': <class 'int'>}
```

## What's next

Next in the series: [exceptions](en/posts/python-exceptions/), the full story of `try`, `except`, `else` and `finally`.
