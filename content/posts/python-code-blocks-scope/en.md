---
title: "Code blocks and scope in Python"
summary: "What a code block is in Python, why if, for, while and try don't create a new scope, which blocks do (functions, classes, comprehensions), and the bugs that come from mixing them up."
date: 2026-10-13
tags: [python]
series: { key: python, order: 18 }
---

The last few posts were full of indented blocks: under `if` and `else`, loops and `def`. A natural question: if I create a variable inside an `if` block, can I use it after the block? In many languages, no. In Python, yes, because a *block of code* is not a *scope*. This post explains both, and the bugs you get when you confuse them.

Every example here was run with Python 3.13. The rules were checked against the [compound statements reference](https://docs.python.org/3/reference/compound_stmts.html) and the [execution model](https://docs.python.org/3/reference/executionmodel.html#naming-and-binding).

## What a code block is

An `if`, `for`, `while`, `def` or `class` line ends with a colon. The indented lines under it are the statements it controls. The reference calls that group a *suite*: "a group of statements controlled by a clause". Most people just say a block. Blocks can be nested, and indentation shows which block each line belongs to:

```python
def check(n):
    if n > 0:
        print("positive")
        if n > 100:
            print("big")
    print("checked", n)

check(150)
check(-1)
```

```text
positive
big
checked 150
checked -1
```

`print("checked", n)` is at the function's level, so it runs every time; the two prints above it belong to the `if`. The [indentation post](en/posts/python-indentation-error/) covers indentation errors.

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

`message` is still there after the `if`, and after the loop `i` and `last` keep the last iteration's values (the reference: "Names in the target list are not deleted when the loop is finished"). A `while` loop works the same way:

```python
count = 0
while count < 3:
    step = count
    count += 1
print(count, step)
```

```text
3 2
```

If you come from C, Java or JavaScript (`let`), this is the biggest surprise: there's no block scope in Python.

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

The condition is false, so the assignment never ran. Give the variable a value before the `if`, or in every branch:

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

To get a value out of a function, `return` it. Don't try to reach into the function's variables from outside.

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

The `x` inside the brackets didn't overwrite the outer `x`. The [comprehensions reference](https://docs.python.org/3/reference/expressions.html#displays-for-lists-sets-and-dictionaries) says the comprehension runs "in a separate implicitly nested scope".

## Reading and writing names from outside

An inner scope can **read** names from the scopes around it:

```python
x = 10

def outer():
    y = 20

    def inner():
        print(x, y)

    inner()

outer()
```

```text
10 20
```

**Assigning** a name inside a function creates a new local variable instead of changing the outer one:

```python
enemies = 1

def increase_enemies():
    enemies = 2
    print("inside:", enemies)

increase_enemies()
print("outside:", enemies)
```

```text
inside: 2
outside: 1
```

There are two different `enemies` here. The `global` and `nonlocal` keywords, and the `UnboundLocalError` from mixing reading and assigning, are in the [scope and naming post](en/posts/python-scope-and-naming/). The advice stands: pass values in as arguments and return results, instead of changing globals.

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

## Common mistakes

- **Expecting block scope.** A variable from inside an `if` or `for` is still visible after it. Reusing a name like `i` after a loop gets the last value, not a fresh one.
- **Assigning in only one branch.** If the branch doesn't run, the name doesn't exist and you get a `NameError`. Set a default before the `if`.
- **Using a loop variable after an empty loop.** It was never assigned.
- **Reading a function's local variable from outside.** Return the value instead.
- **Thinking a comprehension changes the outer variable.** It has its own scope, unlike a `for` loop.
- **Using the `except ... as` name after the clause.** Copy it to another name first.

## What's next

Next in the series: scope and naming, with the `global` and `nonlocal` keywords and how to choose good names.
