---
title: "משתנים וטיפוסים ב-Python"
summary: "איך משתנים עובדים ב-Python: השמה, שמות, הטיפוסים הבסיסיים int, float, str, bool ו-None, type() ו-isinstance(), המרה בין טיפוסים ושגיאת NameError."
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

## חילוק מחזיר float

`/` תמיד מחזירה float, גם כשהתוצאה שלמה. `//` מחזירה int:

```python
print(10 / 2, type(10 / 2))
print(10 // 2, type(10 // 2))
print(7 % 3)
```

```text
5.0 <class 'float'>
5 <class 'int'>
1
```

`%` מחזירה את שארית החילוק.

## בדיקת טיפוסים

`type(x) == int` עובד, אבל התיעוד ממליץ על `isinstance()`, כי היא גם מקבלת תתי-מחלקות:

```python
print(isinstance(3, int))
print(isinstance(True, int))
```

```text
True
True
```

`bool` היא תת-מחלקה של `int`, ולכן `True` הוא גם int.

## המרה בין טיפוסים

ב-Python ברוב המקרים אין המרה אוטומטית, ולכן עושים אותה במפורש עם שם הטיפוס:

```python
print(int("42") + 1)
print(float("3.5") * 2)
print(str(7) + "7")
print(bool(""), bool("0"))
```

```text
43
7.0
77
False True
```

`bool("0")` הוא `True`, כי זו מחרוזת לא ריקה. רק ערכים ריקים כמו `""`, `0` ו-`None` נחשבים `False`.

ההמרה נכשלת כשהטקסט לא מתאים לטיפוס:

```python
int("3.5")
```

```text
ValueError: invalid literal for int() with base 10: '3.5'
```

## טעויות נפוצות

**שימוש בשם לפני השמה.** מקבלים `NameError`:

```python
print(n)
```

```text
NameError: name 'n' is not defined
```

מבצעים השמה לפני השימוש, ובודקים שהשם מאוית אותו דבר בכל מקום.

**בלבול בין `=` ל-`==`.** `=` מבצע השמה. `==` משווה. `if x = 5:` היא שגיאת תחביר, ו-`if x == 5:` היא הבדיקה שרוצים.

## מה הלאה

בפוסט הבא: מחרוזות והפעולות הנפוצות לשינוי ולחיפוש טקסט.
