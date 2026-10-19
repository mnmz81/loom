---
title: "The modulo operator % in Python"
summary: "What % does in Python and where it's useful: even or odd, every Nth item, wrapping around a list or a clock, splitting seconds with divmod, digits, FizzBuzz, and how it treats negative numbers."
date: 2026-10-13
tags: [python]
series: { key: python, order: 14 }
---

`%` is the modulo operator: the remainder after division. The [number operations post](en/posts/python-number-operations/) introduced it in a few lines.

Every example ran with Python 3.13, checked against the [binary arithmetic operations reference](https://docs.python.org/3/reference/expressions.html#binary-arithmetic-operations) and the [`divmod()` docs](https://docs.python.org/3/library/functions.html#divmod).

## What % does

`a % b` is what's left over when you divide `a` into groups of `b`:

```python
print(17 % 5, 10 % 2, 3 % 7, 0 % 4)
```

```text
2 0 3 0
```

17 is three groups of 5 plus 2. 3 is smaller than 7, so all of it is left over.

`%` goes hand in hand with floor division `//`. The docs give the identity `x == (x//y)*y + (x%y)`: the quotient times the divisor, plus the remainder, gives back the original number.

## Even or odd

A number is even when dividing it by 2 leaves nothing:

```python
number = 7
if number % 2 == 0:
    print(number, "is even")
else:
    print(number, "is odd")
```

```text
7 is odd
```

The same idea works for any divisor. `n % 3 == 0` means "`n` divides by 3".

## Every Nth item

Inside a loop, `%` picks every Nth step:

```python
for i in range(1, 11):
    if i % 3 == 0:
        print(i, end=" ")
print()
```

```text
3 6 9 
```

In real code this is "save every 100 rows" or "print progress every 1,000 items": `if i % 1000 == 0:`.

## Wrapping around

The result of `x % n` is always between 0 and `n - 1` (for positive `n`). That makes it perfect for going around in a circle, like days of the week:

```python
days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
today = 5
print(days[(today + 3) % 7])
print(days[(today - 8) % 7])
```

```text
Mon
Thu
```

Today is index 5 (Friday). Three days later is index 8, and `8 % 7` is 1, Monday. Eight days back is index -3, and `-3 % 7` is 4, Thursday. The index never falls off the list. A 24-hour clock works the same way.

`%=` keeps an angle between 0 and 359:

```python
angle = 350
angle += 20
angle %= 360
print(angle)
```

```text
10
```

## Splitting units with divmod

To turn seconds into hours, minutes and seconds, you need both the quotient and the remainder. `divmod(x, y)` returns both as a pair, `(x // y, x % y)`:

```python
total_seconds = 3725
minutes, seconds = divmod(total_seconds, 60)
hours, minutes = divmod(minutes, 60)
print(f"{hours}:{minutes:02}:{seconds:02}")
```

```text
1:02:05
```

The `:02` pads with a zero to two digits, as shown in the [f-strings post](en/posts/python-f-strings/).

## Digits of a number

`% 10` gives the last digit of a whole number. `% 100` gives the last two. Combine it with `//` to get any digit:

```python
n = 4096
print(n % 10, n % 100, n // 10 % 10)
```

```text
6 96 9
```

## FizzBuzz

The interview exercise tests `%` and `elif` order: print the numbers from 1 to 15, but "Fizz" for multiples of 3, "Buzz" for multiples of 5, and "FizzBuzz" for multiples of both:

```python
for n in range(1, 16):
    if n % 15 == 0:
        print("FizzBuzz")
    elif n % 3 == 0:
        print("Fizz")
    elif n % 5 == 0:
        print("Buzz")
    else:
        print(n)
```

```text
1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz
```

(Output shown on one line to save space.) The `n % 15` check must come first, or 15 would match `n % 3 == 0` and print "Fizz", as explained in the [`if`/`elif` post](en/posts/python-if-else/).

## Negative numbers

Here Python differs from C, Java and JavaScript. The docs say the result of `%` "always yields a result with the same sign as its second operand (or zero)":

```python
print(-7 % 3, 7 % -3, -7 % -3)
print(-7 // 3, -7 == (-7 // 3) * 3 + (-7 % 3))

import math
print(math.fmod(-7, 3))
```

```text
2 -2 -1
-3 True
-1.0
```

`-7 // 3` rounds down to -3, and `-3 * 3 + 2` is -7, so the remainder is 2. In C or JavaScript, `-7 % 3` is -1. `math.fmod()` gives that behavior, and the [math docs](https://docs.python.org/3/library/math.html#math.fmod) recommend `fmod()` for floats and `%` for integers.

Python's rule is the reason the wrap-around trick works with negative indexes, and why `n % 2 == 1` is a correct odd check even for negative `n`:

```python
print(-3 % 2 == 1, -3 % 2)
```

```text
True 1
```

In C, `-3 % 2` is -1, so the same check would fail.

## Floats

`%` works on floats too, but float rounding can show up in the result:

```python
print(7.5 % 2, 5 % 0.1)
```

```text
1.5 0.09999999999999973
```

`5 % 0.1` isn't 0 because 0.1 can't be stored exactly. Use `%` with whole numbers when you can.

## Common mistakes

- **Dividing by zero.** `5 % 0` raises `ZeroDivisionError: integer modulo by zero`, the same as `5 / 0`.
- **Confusing `%` with percent.** `50 % 10` is 0, not "5". For a percentage, multiply: `part / total * 100`.
- **Mistaking `%` in strings for modulo.** `"%s is %d years old" % ("Dana", 30)` is the old string formatting. With a string on the left, `%` formats text; use f-strings instead.

## What's next

Next in the series: loops with `for` and `while`, where `%` and conditions do most of their work.
