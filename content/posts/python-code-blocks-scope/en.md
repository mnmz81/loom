---
title: "Code blocks and scope in Python"
summary: "What a code block is in Python, why if, for, while and try don't create a new scope, which blocks do (functions, classes, comprehensions), and the bugs that come from mixing them up."
date: 2026-10-13
tags: [python]
series: { key: python, order: 20 }
---

If you create a variable inside an `if` block, can you use it after the block? In many languages, no. In Python, yes, because a *block of code* is not a *scope*.

Every example ran with Python 3.13, checked against the [compound statements reference](https://docs.python.org/3/reference/compound_stmts.html) and the [execution model](https://docs.python.org/3/reference/executionmodel.html#naming-and-binding).

## What a code block is

An `if`, `for`, `while`, `def` or `class` line ends with a colon. The indented lines under it are the statements it controls. The reference calls that group a *suite*: "a group of statements controlled by a clause". Blocks can be nested; the [indentation post](en/posts/python-indentation-error/) shows how indentation marks where each one ends.

A block can also sit on the same line as its header, separated by semicolons:

```python
if True: print("one line"); print("two statements")
```

```text
one line
two statements
```

It works, but it's hard to read. PEP 8 discourages it.

## Blocks that don't create a scope

A *scope* is where a name is visible. In Python, `if`, `elif`, `else`, `for`, `while`, `with` and `try` don't create a new scope. A variable you assign inside them belongs to the surrounding function or module:

```python
if True:
    message = "set inside if"
print(message)

for i in range(3):
    last = i * 10
print(i, last)
```

```text
set inside if
2 20
```

`message` is still there after the `if`, and after the loop `i` and `last` keep the last iteration's values (the reference: "Names in the target list are not deleted when the loop is finished"). `while` works the same way. Unlike C, Java or JavaScript's `let`, Python has no block scope.

### Watch out: a variable set in only one branch

"No block scope" doesn't mean the variable always exists. It exists only if the line that assigns it actually ran:

```python
hour = 9
if hour > 12:
    greeting = "Good afternoon"
print(greeting)
```

```text
NameError: name 'greeting' is not defined
```

Give the variable a value before the `if`, or in every branch:

```python
hour = 9
greeting = "Good morning"
if hour > 12:
    greeting = "Good afternoon"
print(greeting)
```

```text
Good morning
```

The same thing happens with a loop over an empty list. The reference notes that if the sequence is empty, the loop variables "will not have been assigned to at all":

```python
for item in []:
    found = item
print(found)
```

```text
NameError: name 'found' is not defined. Did you mean: 'round'?
```

## Blocks that do create a scope

The execution model lists what counts as a scope-making block: "a module, a function body, and a class definition". A variable assigned inside a function is local to that function and disappears when the function returns:

```python
def make_greeting():
    text = "Hello"
    return text

print(make_greeting())
print(text)
```

```text
Hello
NameError: name 'text' is not defined. Did you mean: 'next'?
```

To get a value out of a function, `return` it. How a function reads names from outside it, and why assigning one creates a new local instead, is in the [scope and naming post](en/posts/python-scope-and-naming/).

The same goes for a class body. Its names aren't visible inside the methods, so you reach them through `self` or the class name:

```python
class Config:
    debug = True

    def show(self):
        return debug

print(Config.debug)
Config().show()
```

```text
True
NameError: name 'debug' is not defined. Did you mean: 'self.debug'?
```

### Comprehensions have their own scope

A list comprehension (a one-line loop that builds a list) is the exception to "loops don't create a scope". Its loop variable stays inside it:

```python
x = "outer"
squares = [x * x for x in range(4)]
print(squares, x)
```

```text
[0, 1, 4, 9] outer
```

The [comprehensions reference](https://docs.python.org/3/reference/expressions.html#displays-for-lists-sets-and-dictionaries) says the comprehension runs "in a separate implicitly nested scope".

## The one surprise: except ... as

One block does clean up after itself. The name after `as` in an `except` clause is deleted when the clause ends:

```python
try:
    1 / 0
except ZeroDivisionError as err:
    saved = err
print(saved)
print(err)
```

```text
division by zero
NameError: name 'err' is not defined
```

The reference says the exception "must be assigned to a different name to be able to refer to it after the `except` clause". That's what `saved = err` does.

## What's next

Next in the series: scope and naming, with the `global` and `nonlocal` keywords and how to choose good names.
