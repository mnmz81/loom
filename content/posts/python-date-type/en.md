---
title: "The date type in Python"
summary: "How to work with dates in Python using datetime.date: creating dates, reading parts of a date, formatting with strftime and isoformat, date arithmetic with timedelta, and invalid dates."
date: 2026-10-11
tags: [python]
series: { key: python, order: 9 }
---

Python has no built-in date value like `int` or `str`. Dates live in the standard library module `datetime`, and the type you usually need is `date`. A `date` holds a year, a month and a day: no time of day, no time zone. For a time, use `datetime`, a separate topic.

Every example here was run with Python 3.13 and checked against the [`date` objects docs](https://docs.python.org/3/library/datetime.html#date-objects).

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

All three arguments are required and must be in range (month 1 to 12, day 1 up to the month's length), or you get a `ValueError`:

```python
date(2026, 2, 30)
```

```text
ValueError: day is out of range for month
```

To get today's date, call `date.today()`. Its output changes daily, so it isn't printed here.

## Reading parts of a date

```python
print(d.year, d.month, d.day)
print(d.weekday(), d.isoweekday())
```

```text
2026 10 11
6 7
```

`weekday()` counts Monday as 0 (Sunday is 6), `isoweekday()` counts Monday as 1 (Sunday is 7). Pick one and stick to it.

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

For other formats, such as `11/10/2026`, use `datetime.strptime`.

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

`.days` returns the number of days as an integer.

Dates can be compared with `<`, `>` and `==`:

```python
print(d > date(2026, 1, 1))
```

```text
True
```

## Common mistakes

- **Using a string where a date is needed.** `"2026-10-11" > "2026-01-01"` compares text. It only works by accident for ISO format. Convert with `fromisoformat` first.

## What's next

Next: lists, which hold many values in one variable.
