---
title: "f-strings: formatting text in Python"
summary: "How f-strings work in Python: putting expressions in braces, format specs for width, alignment, precision, thousands separators and percentages, the = debug specifier, and !r conversions."
date: 2026-10-11
tags: [python]
series: { key: python, order: 13 }
---

An f-string is a string with an `f` before the opening quote. Inside it, anything in braces is an expression that Python evaluates and puts into the text. It's the standard way to build output in Python today, and it replaces the older `%` formatting and `str.format()` in most new code.

Every example here was run with Python 3.13. The syntax was checked against the [official f-strings reference](https://docs.python.org/3/reference/lexical_analysis.html#f-strings) and the [format specification mini-language](https://docs.python.org/3/library/string.html#format-specification-mini-language).

## The basics

```python
name = "Ada"
age = 36
print(f"{name} is {age} years old")
print(f"{age + 1} next year")
print(f"{name.upper()}")
```

```text
Ada is 36 years old
37 next year
ADA
```

The expression can be anything: a variable, arithmetic, or a method call. The docs say "expressions in formatted string literals are treated like regular Python expressions".

Use quotes of the other kind inside the braces if the expression needs quotes. Since Python 3.12 you can reuse the same kind, but it's clearer not to:

```python
print(f"{'nested ' + 'quotes'}")
```

```text
nested quotes
```

Literal braces are written doubled:

```python
print(f"{{literal braces}}")
```

```text
{literal braces}
```

## Format specs: after the colon

A colon after the expression starts a format spec. The general shape is `fill`, `align`, `sign`, `width`, `grouping`, `precision` and `type`. You don't need all of them.

### Decimals and thousands

```python
pi = 3.14159265
price = 1234567.891
print(f"{pi:.2f}")
print(f"{price:,.2f}")
```

```text
3.14
1,234,567.89
```

`.2f` means two digits after the decimal point. The comma inserts a separator every three digits. Use `_` instead of `,` if you want underscores.

```python
print(f"{1_000_000:_}")
```

```text
1_000_000
```

### Padding and alignment

Use `<` for left, `>` for right, and `^` for centered, with a width:

```python
name = "Ada"
print(f"{name:>6}|{name:<6}|{name:^7}|")
```

```text
   Ada|Ada   |  Ada  |
```

A character before the alignment sign is the fill. `*` in front of `^` gives stars:

```python
print(f"{'x':*^9}")
```

```text
****x****
```

Zero-padding a number: `05d` gives five digits, filled with zeros.

```python
age = 36
print(f"{age:05d}")
```

```text
00036
```

### Percentages, hex and binary

```python
print(f"{0.257:.1%}")
print(f"{255:x} {255:b} {255:#o}")
```

```text
25.7%
ff 11111111 0o377
```

`%` multiplies by 100 and adds a percent sign. `x`, `b` and `o` give hex, binary and octal. The `#` adds the prefix.

### Dynamic width

The width or precision can itself come from a variable, written in a nested pair of braces:

```python
pi = 3.14159265
width = 8
print(f"{pi:{width}.3f}|")
```

```text
   3.142|
```

## The = debug specifier

Put `=` after an expression to print the expression text and its value. Python 3.8 added this:

```python
age = 36
print(f"{age=}")
```

```text
age=36
```

It's handy for quick debugging, because you don't have to type the name twice.

## Conversions: !r

`!r` shows the value the way `repr()` does, which is useful for strings with quotes or spaces. The docs list `!s` (`str()`) and `!a` (`ascii()`) too:

```python
name = "Ada"
print(f"{name!r}")
```

```text
'Ada'
```

## Common mistakes

- **Forgetting the `f`.** `"{name} is {age}"` prints the braces as they are.
- **Putting a format spec where a conversion goes.** The conversion is `!r`, and the spec is `:` followed by the format.
- **Relying on rounding in the display.** `f"{2.675:.2f}"` shows 2.67 for the same reason `round(2.675, 2)` does. Formatting rounds the stored float, and floats are approximate.
- **Formatting user input directly.** Only use f-strings with trusted text in the template. Don't build the template from user input.

## What's next

Next in the series: you have the basic tools now. The next step is putting them together in conditions, starting with `if`, `elif` and `else`.
