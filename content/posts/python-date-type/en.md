---
title: "The date type in Python"
summary: "How to work with dates in Python using datetime.date: creating dates, reading parts of a date, formatting with strftime and isoformat, date arithmetic with timedelta, and invalid dates."
date: 2026-10-11
tags: [python]
series: { key: python, order: 10 }
---

Python has no built-in date value like `int` or `str`. Dates live in the standard library module `datetime`, and the type you usually need is `date`. A `date` holds a year, a month and a day, and nothing else: no time of day, no time zone. For a time, use `datetime`, which is a separate topic.

Every example here was run with Python 3.13. The behavior was checked against the [official `date` objects docs](https://docs.python.org/3/library/datetime.html#date-objects).

## Creating a date

Import the class, then pass the year, month and day as integers:

```python
from datetime import date

d = date(2026, 10, 11)
print(d)
print(repr(d))
```

```text
2026-10-11
datetime.date(2026, 10, 11)
```

`print` shows the ISO format (`YYYY-MM-DD`). `repr` shows how you'd write the object in code.

All three arguments are required. The docs say each value must be in range: the month from 1 to 12, and the day from 1 up to the number of days in that month. Otherwise you get a `ValueError`:

```python
date(2026, 2, 30)
```

```text
ValueError: day is out of range for month
```

To get today's date, call `date.today()`. Its output changes every day, so this post doesn't print it. It returns a `date`, and its type is `<class 'datetime.date'>`.

## Reading parts of a date

```python
print(d.year, d.month, d.day)
print(d.weekday(), d.isoweekday())
```

```text
2026 10 11
6 7
```

`weekday()` counts from Monday as 0, so Sunday is 6. `isoweekday()` counts from Monday as 1, so Sunday is 7. The docs use both, so pick one and stick to it.

## Formatting a date

`strftime` builds text from a format string. The codes start with `%`:

```python
print(d.strftime("%d/%m/%Y"))
print(d.strftime("%A"))
print(d.isoformat())
```

```text
11/10/2026
Sunday
2026-10-11
```

`%d`, `%m` and `%Y` are the day, month and year. `%A` is the weekday name. The full list of codes is in the docs for `strftime`.

To read a date from text, use `fromisoformat`. It accepts the ISO format:

```python
print(date.fromisoformat("2026-01-01"))
```

```text
2026-01-01
```

For other formats, such as `11/10/2026`, use `datetime.strptime`, which is a topic for a later post.

## Date arithmetic

Add or subtract a `timedelta`, which represents a length of time:

```python
from datetime import timedelta

print(d + timedelta(days=30))
```

```text
2026-11-10
```

Subtracting two dates gives a `timedelta`:

```python
print(d - date(2026, 1, 1))
print((d - date(2026, 1, 1)).days)
```

```text
283 days, 0:00:00
283
```

`.days` returns the number of days as an integer, which is usually what you want for a calculation.

Dates can be compared with `<`, `>` and `==`:

```python
print(d > date(2026, 1, 1))
```

```text
True
```

## Common mistakes

- **Using a string where a date is needed.** `"2026-10-11" > "2026-01-01"` compares text. It only works by accident for ISO format. Convert with `fromisoformat` first.
- **Expecting time in a `date`.** A `date` has no hours, minutes or time zone. If you need them, use `datetime`.
- **Confusing the two `weekday` methods.** `weekday()` starts at 0 for Monday. `isoweekday()` starts at 1.

## What's next

Next in the series: number operations, including `/`, `//`, `%` and `**`.
