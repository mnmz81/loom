---
title: "if, elif, else: conditions in Python"
summary: "How Python decides which code to run: if, else and elif, the comparison operators, truthy and falsy values, the conditional expression (x if C else y), and a first look at match."
date: 2026-10-13
tags: [python]
series: { key: python, order: 11 }
---

So far every line in our programs ran, top to bottom. Real programs make decisions: show a different message to a minor, refuse an empty password, give a grade based on a score. In Python that's the job of the `if` statement. This post covers `if`, `else` and `elif`, the comparison operators you put in a condition, and the one-line conditional expression.

Every example here was run with Python 3.13. The behavior was checked against the [tutorial section on `if` statements](https://docs.python.org/3/tutorial/controlflow.html#if-statements), the [comparisons reference](https://docs.python.org/3/reference/expressions.html#comparisons) and the [conditional expressions reference](https://docs.python.org/3/reference/expressions.html#conditional-expressions).

## The if statement

An `if` has a condition, a colon, and an indented block. The block runs only when the condition is true:

```python
temperature = 31
if temperature > 30:
    print("Hot")
    print("Drink water")
print("Done")
```

```text
Hot
Drink water
Done
```

Both indented lines belong to the `if`. `print("Done")` is back at the left edge, so it runs no matter what. Indentation is how Python knows where the block ends, as explained in the [indentation post](en/posts/python-indentation-error/).

## else: the other branch

`else` runs when the condition is false. It has no condition of its own:

```python
age = 15
if age >= 18:
    print("You can vote")
else:
    print("Too young to vote")
```

```text
Too young to vote
```

Exactly one of the two blocks runs, never both and never neither.

## elif: more than two options

`elif` is short for "else if". You can have as many as you need, and `else` at the end is optional:

```python
score = 85
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "F"
print(grade)
```

```text
B
```

Python checks the conditions from the top and runs the **first** block whose condition is true. The rest are skipped, even if they're true too. That's why order matters. Here the checks are in the wrong order:

```python
score = 95
if score >= 80:
    print("B")
elif score >= 90:
    print("A")
```

```text
B
```

95 is at least 80, so the first branch wins and `score >= 90` is never checked. Put the narrowest condition first.

The docs point out that an `if`/`elif`/`elif` chain is Python's substitute for the `switch` or `case` statements of other languages.

## Comparison operators

A condition is usually a comparison. Each one returns `True` or `False`:

| Operator | Meaning |
|---|---|
| `==` | equal |
| `!=` | not equal |
| `<` | less than |
| `<=` | less than or equal |
| `>` | greater than |
| `>=` | greater than or equal |

```python
print(5 == 5, 5 != 3, 3 < 5, 5 <= 5, 7 > 9, 7 >= 7)
print("a" == "A", "apple" < "banana", 1 == 1.0)
```

```text
True True True True False True
False True True
```

Strings compare character by character, and uppercase and lowercase are different characters. `1 == 1.0` is `True`, because numbers compare by value even across `int` and `float`.

Comparisons can be chained. The docs say `x < y <= z` is equivalent to `x < y and y <= z`, except that `y` is evaluated only once:

```python
age = 25
print(18 <= age < 65)
```

```text
True
```

Two more operators show up in conditions all the time. `in` checks membership, and `is` checks identity. Use `is` only with `None`:

```python
fruit = "apple"
print(fruit in ["apple", "pear"], "z" in "pizza", "x" not in "pizza")

value = None
if value is None:
    print("no value")
```

```text
True True True
no value
```

## Truthy and falsy values

A condition doesn't have to be `True` or `False`. Python accepts any value. The docs list what counts as false: `False`, `None`, zero of any numeric type, and empty strings and containers. Everything else is true:

```python
name = ""
if name:
    print("Hello", name)
else:
    print("No name given")

items = [1, 2]
if items:
    print(len(items), "items")
```

```text
No name given
2 items
```

`if name:` reads as "if there is a name". It's shorter than `if name != "":` and is the usual Python style. The [type conversion post](en/posts/python-type-conversion/) covers `bool()` and truthiness in more detail.

## Nested conditions

A block can contain another `if`:

```python
age = 20
has_ticket = True
if age >= 18:
    if has_ticket:
        print("Come in")
    else:
        print("Buy a ticket")
else:
    print("Adults only")
```

```text
Come in
```

Nesting works, but every level pushes the code further right. Often `and` gives a flatter version, which is the topic of the [next post](en/posts/python-logical-operators/).

A block can't be empty. If you need a placeholder, write `pass`, a statement that does nothing:

```python
x = 3
if x > 0:
    pass
print("ok")
```

```text
ok
```

## The conditional expression

When all you need is to choose between two values, there's a one-line form. The docs call it a conditional expression, "sometimes called a ternary operator":

```python
age = 20
status = "adult" if age >= 18 else "minor"
print(status)

n = 1
print(f"{n} item{'' if n == 1 else 's'}")
```

```text
adult
1 item
```

Read it as "`adult` if the condition is true, else `minor`". The condition is evaluated first, then only one of the two values. Because it's an expression, it fits inside an assignment, a function call or an f-string. Keep it for short choices: if either side needs more than a few words, a normal `if`/`else` is easier to read.

## When there are many values: match

If you're comparing one value against many constants, Python 3.10 added the `match` statement:

```python
def describe(command):
    match command:
        case "start" | "go":
            return "Starting"
        case "stop":
            return "Stopping"
        case _:
            return "Unknown command"

print(describe("go"), describe("stop"), describe("jump"))
```

```text
Starting Stopping Unknown command
```

Only the first matching `case` runs. `|` means "or", and `_` matches anything, like `else`. `match` can do much more (unpacking lists and objects), as the [tutorial on `match`](https://docs.python.org/3/tutorial/controlflow.html#match-statements) shows. For a few conditions, `if`/`elif` is still the simpler choice.

## Common mistakes

- **`=` instead of `==`.** `if x = 5:` is a `SyntaxError`. Python even suggests the fix: `Maybe you meant '==' or ':=' instead of '='?`
- **Forgetting the colon.** `if x == 5` without `:` gives `SyntaxError: expected ':'`.
- **An empty block.** An `if` with nothing indented under it gives `IndentationError: expected an indented block after 'if' statement`. Use `pass` as a placeholder.
- **Wrong order in an `elif` chain.** Only the first true branch runs, so put specific conditions before general ones.
- **Comparing text to a number.** `5 == "5"` is `False`, not an error. Convert the value from `input()` before comparing.
- **Comparing floats with `==`.** `0.1 + 0.2 == 0.3` is `False`. Use `math.isclose()` instead.

## What's next

Next in the series: the logical operators `and`, `or` and `not`, which combine several conditions into one.
