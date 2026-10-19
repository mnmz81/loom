---
title: "Multiple if statements in succession"
summary: "Several separate if statements in a row each get checked, unlike an if/elif chain that stops at the first match. When to use which, and the bugs that come from mixing them up."
date: 2026-10-19
tags: [python]
series: { key: python, order: 13 }
---

An `if`/`elif`/`else` chain ([conditions post](en/posts/python-if-else/)) picks one branch. But you can also write several separate `if` statements one after the other. They look similar and behave very differently.

Every example ran with Python 3.13, checked against the [`if` statement section of the tutorial](https://docs.python.org/3/tutorial/controlflow.html#if-statements) and the [`if` reference](https://docs.python.org/3/reference/compound_stmts.html#the-if-statement).

## Every if is checked

Each `if` starts a new, independent decision. Python checks its condition whatever the earlier `if` statements did:

```python
age = 70
has_card = True

if age >= 65:
    print("senior discount")
if has_card:
    print("member discount")
if age < 18:
    print("child ticket")
```

```text
senior discount
member discount
```

Two of the three conditions are true, so two messages print. Zero, one or all of the blocks can run.

## The same input with elif

Replace the second and third `if` with `elif` and the chain stops at the first true condition:

```python
if age >= 65:
    print("senior discount")
elif has_card:
    print("member discount")
elif age < 18:
    print("child ticket")
```

```text
senior discount
```

`has_card` is true, but Python never looks at it, because the first branch already ran. That is the whole difference:

| | Separate `if` statements | `if` / `elif` chain |
|---|---|---|
| Conditions checked | all of them | until the first true one |
| Blocks that can run | none, some or all | at most one |
| Fits | independent questions | one choice out of several |

## Independent questions: separate ifs

Use separate `if` statements when each condition is its own question and several answers can be "yes" together. A password check is a good fit, because every rule is a separate problem to report:

```python
password = "abc"
problems = []

if len(password) < 8:
    problems.append("shorter than 8 characters")
if not any(ch.isdigit() for ch in password):
    problems.append("no digit")
if password.lower() == password:
    problems.append("no uppercase letter")

print(problems)
```

```text
['shorter than 8 characters', 'no digit', 'no uppercase letter']
```

With `elif` this would report only the first problem, and the user would fix them one at a time.

## One choice: elif

Use `elif` when the conditions exclude each other, such as the ranges of a grade. With separate `if` statements, the later checks run even after a match, and the result gets overwritten:

```python
score = 95

if score >= 90:
    grade = "A"
if score >= 80:
    grade = "B"
if score >= 70:
    grade = "C"
print(grade)
```

```text
C
```

`95` passes all three tests, and the last assignment wins. Changing the second and third `if` to `elif` fixes it, and the result is `"A"`.

## Order matters when the blocks change a variable

Separate `if` statements run top to bottom, so a block can change something that a later condition looks at:

```python
price = 100
is_member = True
coupon = True

if is_member:
    price = price * 0.9
if coupon:
    price = price - 15
if price < 80:
    print("free shipping")
print(price)
```

```text
free shipping
75.0
```

The member discount brings `100` to `90.0`, the coupon brings it to `75.0`, and only then does the last `if` see a price under 80. Swap the first two `if` statements and the final price changes (`100 - 15 = 85`, then `76.5`), so the order is part of the program.

## Common mistakes

- **Separate `if` where `elif` was meant.** Grades, ranges and "which size" questions need `elif`. Symptom: a variable has the value of the last matching test.
- **`elif` where a separate `if` was meant.** Symptom: a rule never fires because an earlier one matched.
- **An `else` that belongs to the last `if` only.** In `if a: ... if b: ... else: ...`, the `else` pairs with `if b`, not with both. To handle "neither", write one chain, or use `if not (a or b):`.

## What's next

Next: the logical operators `and`, `or` and `not`, which combine several conditions into one `if`.
