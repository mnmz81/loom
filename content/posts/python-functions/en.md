---
title: "Functions in Python"
summary: "def, parameters and return values, default and keyword arguments, the mutable default trap, docstrings and type hints, and passing a function as a value."
date: 2026-10-13
tags: [python]
series: { key: python, order: 17 }
---

You've been calling functions since the first post: `print()`, `len()`, `sorted()`. This post is about writing your own. A function gives a name to a block of code. You write it once, then run it as many times as you need, with different values each time. That keeps programs short, and it means a bug gets fixed in one place.

Every example here was run with Python 3.13. The behavior was checked against the [defining functions section of the tutorial](https://docs.python.org/3/tutorial/controlflow.html#defining-functions) and [more on defining functions](https://docs.python.org/3/tutorial/controlflow.html#more-on-defining-functions).

## Defining and calling a function

The tutorial says: "The keyword `def` introduces a function definition. It must be followed by the function name and the parenthesized list of formal parameters." The body is the indented block under it:

```python
def greet(name):
    print(f"Hello, {name}!")

greet("Dana")
greet("Avi")
```

```text
Hello, Dana!
Hello, Avi!
```

`def` only defines the function. Nothing in the body runs until you call it with parentheses. `name` is a *parameter*: a variable that gets its value from the call. `"Dana"` is the *argument* passed in. A function can have no parameters, or several, separated by commas:

```python
def show_line():
    print("-" * 20)

def describe(item, price):
    print(item, "costs", price)

show_line()
describe("tea", 12)
```

```text
--------------------
tea costs 12
```

## return: getting a value back

`print()` inside a function shows something on the screen, but the caller can't use it. To hand a value back to the caller, use `return`:

```python
def area(width, height):
    return width * height

room = area(4, 3)
print(room, area(2, 2) + room)
```

```text
12 16
```

`return` also ends the function right away. A function can have several `return` statements, for example one in each branch of an `if`:

```python
def grade(score):
    if score >= 90:
        return "A"
    if score >= 70:
        return "B"
    return "C"

print(grade(95), grade(80), grade(40))
```

```text
A B C
```

A function without `return`, or with a bare `return`, gives back `None`:

```python
def shout(text):
    print(text.upper())

result = shout("hi")
print(result)
```

```text
HI
None
```

To return several values, separate them with commas. Python packs them into a tuple, and the caller can [unpack it](en/posts/python-lists/):

```python
def min_max(numbers):
    return min(numbers), max(numbers)

low, high = min_max([4, 9, 1, 7])
print(low, high)
```

```text
1 9
```

## Default values and keyword arguments

A parameter can have a default value. The caller may leave it out:

```python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Dana"))
print(greet("Dana", "Shalom"))
print(greet(greeting="Hi", name="Noa"))
```

```text
Hello, Dana!
Shalom, Dana!
Hi, Noa!
```

The last call uses *keyword arguments*: `name=value`. With keywords, the order doesn't matter, and the call explains itself. You've used them before: `print(..., end=" ")` and `sorted(..., reverse=True)`. Parameters with defaults must come after the ones without.

Positional arguments go first, then keyword arguments. Passing the same parameter twice is an error:

```python
greet("Dana", name="Avi")
```

```text
TypeError: greet() got multiple values for argument 'name'
```

## The mutable default trap

The tutorial has an "Important warning": "The default value is evaluated only once." When the default is a list or a dictionary, every call that doesn't pass the argument shares the same object:

```python
def add_item(item, cart=[]):
    cart.append(item)
    return cart

print(add_item("milk"))
print(add_item("bread"))
```

```text
['milk']
['milk', 'bread']
```

The second call didn't start with an empty cart. The fix is to use `None` as the default and create the list inside the function:

```python
def add_item(item, cart=None):
    if cart is None:
        cart = []
    cart.append(item)
    return cart

print(add_item("milk"))
print(add_item("bread"))
```

```text
['milk']
['bread']
```

## Docstrings and type hints

A string on the first line of the body is the function's *docstring*. Editors show it, and `help()` prints it. *Type hints* after the parameters and after `->` say what types the function expects and returns:

```python
def average(numbers: list[float]) -> float:
    """Return the mean of a non-empty list of numbers."""
    return sum(numbers) / len(numbers)

print(average([3, 4, 5]))
print(average.__doc__)
```

```text
4.0
Return the mean of a non-empty list of numbers.
```

Hints are documentation. Python doesn't check them when the code runs, as the [TypeError post](en/posts/python-type-errors-and-checking/) shows. Tools like mypy and your editor do.

## Functions are values

A function is a value like any other. You can store it in a variable, put it in a list, or pass it to another function. That's what `key=len` did in the [lists post](en/posts/python-lists/): it passed the function `len` to `sorted()`, without calling it:

```python
def last_letter(word):
    return word[-1]

words = ["kiwi", "apple", "fig"]
print(sorted(words, key=last_letter))

shout = str.upper
print(shout("quiet"))
```

```text
['apple', 'fig', 'kiwi']
QUIET
```

For a function this small, a `lambda` is a one-line version without a name: `sorted(words, key=lambda w: w[-1])` gives the same result.

## Common mistakes

- **Forgetting the parentheses.** `greet` is the function itself. `greet()` calls it. `print(greet)` prints something like `<function greet at 0x...>`.
- **Printing instead of returning.** A function that prints its result returns `None`, so `total = add(2, 3)` stores `None`.
- **Code after `return`.** Lines after a `return` in the same block never run.
- **A list or dict as a default value.** Use `None` and create the object inside the function.
- **Using a function before it's defined.** The `def` line has to run before the call. Python reads the file top to bottom.

## What's next

Next in the series: code blocks and scope, which explains which variables a function can see, and why a variable created inside `if` is still there after it.
