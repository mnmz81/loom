---
title: "משתנים וטיפוסים ב-Python"
summary: "איך משתנים עובדים ב-Python: השמה, שמות, הטיפוסים הבסיסיים int, float, str, bool ו-None, type() ושגיאת NameError."
date: 2026-10-11
tags: [python]
series: { key: python, order: 3 }
---

משתנה ב-Python הוא שם שמצביע על ערך. לא מצהירים עליו ולא נותנים לו טיפוס. מבצעים השמה, והטיפוס מגיע עם הערך.

כל דוגמת קוד כאן הורצה עם Python 3.13, והטענות נבדקו מול [המדריך הרשמי](https://docs.python.org/3/tutorial/introduction.html) ומול [התיעוד של `type()`](https://docs.python.org/3/library/functions.html#type).

## השמה

סימן השוויון מבצע השמה של ערך לשם:

```python
count = 0
count += 1
print(count)
```

```text
1
```

`count += 1` הוא קיצור של `count = count + 1`.

אפשר להשים כמה שמות בשורה אחת, ולהחליף בין שני ערכים בלי משתנה עזר:

```python
x, y = 1, 2
print(x, y)
x, y = y, x
print(x, y)
```

```text
1 2
2 1
```

## הטיפוסים הבסיסיים

`type()` מציגה את הטיפוס של ערך:

```python
x = 5
print(x, type(x))
pi = 3.14
print(pi, type(pi))
name = "Python"
print(name, type(name))
flag = True
print(flag, type(flag))
```

```text
5 <class 'int'>
3.14 <class 'float'>
Python <class 'str'>
True <class 'bool'>
```

- `int`: מספרים שלמים, בלי גודל קבוע. `1_000_000` תקין. הקווים התחתונים רק לקריאות.
- `float`: מספרים עם חלק שברי.
- `str`: טקסט, בפוסט הבא.
- `bool`: `True` או `False`.
- `None`: הערך של "אין כלום". הטיפוס שלו הוא `NoneType`.

להמרה בין הטיפוסים האלה יש [פוסט משלה](he/posts/python-type-conversion/), ובדיקת טיפוס עם `isinstance()` נמצאת ב[פוסט על TypeError](he/posts/python-type-errors-and-checking/).

## טעויות נפוצות

**שימוש בשם לפני השמה.** מקבלים `NameError`:

```python
print(n)
```

```text
NameError: name 'n' is not defined
```

מבצעים השמה לפני השימוש, ובודקים שהשם מאוית אותו דבר בכל מקום.

## מה הלאה

בפוסט הבא: מחרוזות והפעולות הנפוצות לשינוי ולחיפוש טקסט.
