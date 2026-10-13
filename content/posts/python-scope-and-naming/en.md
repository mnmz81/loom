---
title: "Variable scope and good variable names in Python"
summary: "Where a variable can be seen and changed in Python: local, global and nonlocal scope, the global and nonlocal keywords, shadowing, and how to choose clear names that follow PEP 8."
date: 2026-10-11
tags: [python]
series: { key: python, order: 19 }
---

A variable exists in a specific place in your code. The *scope* of a variable is the part of the program where its name can be used. Scope is the reason a variable can be "missing" in one function and work fine in another. This post covers how Python decides which name you mean, and how to choose names that make the code easier to read.

Every example here was run with Python 3.13. The rules were checked against the [official tutorial on scopes](https://docs.python.org/3/tutorial/classes.html#python-scopes-and-namespaces), the [`global` statement reference](https://docs.python.org/3/reference/simple_stmts.html#the-global-statement), and [PEP 8](https://peps.python.org/pep-0008/#naming-conventions).

## Where Python looks for a name

When you use a name, Python searches in this order: the current function (local), then any enclosing functions, then the module (global), and finally the built-in names such as `print` and `len`. The docs describe it the same way: "the innermost scope, which is searched first, contains the local names".

```python
x = "global"

def show_local():
    x = "local"
    print("inside:", x)

show_local()
print("outside:", x)
```

```text
inside: local
outside: global
```

Inside the function, `x = "local"` creates a new local variable. The global `x` is not touched. The docs say that without a `global` or `nonlocal` statement, "assignments to names always go into the innermost scope".

## Reading a global is fine

A function can read a global variable without any keyword:

```python
def read_only():
    print("read:", x)

read_only()
```

```text
read: global
```

The problem only starts when you *assign* to the name inside the function. Python then treats it as local, which is why this code is confusing:

```python
def try_change():
    x = "changed"
    print("inside:", x)

try_change()
print("still:", x)
```

```text
inside: changed
still: global
```

## The global keyword

To change a global variable from inside a function, declare it:

```python
def with_global():
    global x
    x = "changed by global"

with_global()
print("now:", x)
```

```text
now: changed by global
```

The docs say a declared name is "interpreted as globals", and all assignments go to the module-level namespace. Use this sparingly. Functions that change global state are harder to test and to follow. Usually it's better to pass the value in and return the new one.

## The nonlocal keyword

For a function inside another function, `nonlocal` changes a variable of the enclosing function:

```python
def outer():
    y = "outer"
    def inner():
        nonlocal y
        y = "changed by nonlocal"
    inner()
    print("outer y:", y)

outer()
```

```text
outer y: changed by nonlocal
```

Without `nonlocal`, `inner` would create its own `y`, and `outer` would print `outer`.

## A name must be declared before use

Inside a function, a variable is local for the whole function body. If you use it before the assignment, you get an error:

```python
def bad_count():
    print(total)
    total = 5

bad_count()
```

```text
UnboundLocalError: cannot access local variable 'total' where it is not associated with a value
```

`total` is local because of the assignment further down, so the `print` above looks for a local value that doesn't exist yet. The same rule applies to `global`: it must come before any use of the name in that function. Otherwise you get a `SyntaxError`:

```python
counter = 0

def bump():
    counter += 1
    global counter
```

```text
SyntaxError: name 'counter' is assigned to before global declaration
```

## Shadowing a built-in

Scope also explains what happens when you use a built-in name for your own variable:

```python
print(len("abc"))
len = 3
print(len)
```

```text
3
3
```

After `len = 3`, the module-level `len` hides the built-in `len` function. Any later call to `len(...)` in this file fails. This is called shadowing. Avoid it by choosing a different name.

## Choosing good names

PEP 8 gives the rules for names. The main ones:

- **Variables and functions:** lowercase, with underscores. `total_price`, not `totalPrice` or `TP`.
- **Constants** (values that don't change, usually at module level): all capitals. `MAX_RETRIES = 3`.
- **Avoid `l`, `O` and `I`.** The docs for PEP 8 say these look like the digits one and zero in some fonts.
- **Avoid built-in names.** `list`, `str`, `sum`, `max`, `id` and `len` are common mistakes.

Compare these two versions of the same code:

```python
def f(l, d):
    return l * d

def calculate_total_price(unit_price, quantity):
    return unit_price * quantity
```

Both do the same thing. The second one tells the next reader what the numbers mean, which is the whole point of a name.

Python also has reserved words, which you can't use as names. `class` is one of them:

```python
import keyword
print(keyword.iskeyword("class"), keyword.iskeyword("name"))
```

```text
True False
```

Trying `class = 1` gives `SyntaxError: invalid syntax`.

## Common mistakes

- **Assuming an assignment changes the outer variable.** Inside a function it creates a new local name unless you use `global` or `nonlocal`.
- **Using `global` by default.** It works, but it hides where values come from. Pass values in, and return the result.
- **Short names that hide meaning.** `d` could be a date, a dictionary, or a dog. Name it for what it holds.

## What's next

Next in the series: `TypeError`, the most common error when a value has the wrong type, and how to check types.
