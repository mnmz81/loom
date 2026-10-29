---
title: "‏range() ב-Python: יותר מרשימת מספרים"
summary: "‏range הוא רצף עצל ולא רשימה: אינדקסים, חיתוך ובדיקת in מהירה, צעד שלילי וטווח ריק, למה שברים נדחים, ומתי range(len()) הוא הכלי הנכון."
date: 2026-10-29
tags: [python]
series: { key: python, order: 18 }
---

[הפוסט על לולאות](he/posts/python-loops/) השתמש ב-`range()` עם ארגומנט אחד, שניים ושלושה. הפוסט הזה עוסק במה ש-`range()` מחזיר בפועל, ובבאגים שנוצרים כשמתייחסים אליו כמו לרשימה.

כל הדוגמאות הורצו עם Python 3.13 ונבדקו מול [התיעוד של `range`](https://docs.python.org/3/library/stdtypes.html#ranges) ו[התיעוד של הפונקציה `range()`](https://docs.python.org/3/library/functions.html#func-range).

## ‏range הוא אובייקט, לא רשימה

```python
import sys

r = range(5)
print(r, type(r))
print(list(r))

big = range(10**12)
print(len(big), big[-1])
print(sys.getsizeof(big), sys.getsizeof(list(range(1000))))
```

```text
range(0, 5) <class 'range'>
[0, 1, 2, 3, 4]
1000000000000 999999999999
48 8056
```

התיעוד מסביר למה: range ‏"will always take the same (small) amount of memory, no matter the size of the range it represents", כי הוא שומר רק את `start`, ‏`stop` ו-`step`, ומחשב כל מספר רק כשמבקשים אותו. טווח של טריליון מספרים תופס 48 בתים. רשימה של אלף מספרים תופסת יותר מ-8,000. עטפו range ב-`list()` רק כשבאמת צריך רשימה.

## אינדקסים, חיתוך ו-in

range הוא רצף מלא: הוא תומך ב-`len()`, באינדקסים, בחיתוך וב-`in`, כמו רשימה או tuple.

```python
r = range(0, 20, 5)
print(list(r))
print(r[1], r[-1])
print(r[1:3])
print(15 in r, 7 in r)
print(r.index(10))
```

```text
[0, 5, 10, 15]
5 15
range(5, 15, 5)
True False
2
```

חיתוך של range מחזיר range אחר, לא רשימה. ‏`15 in r` לא עובר על המספרים: מאז Python 3.2, מספר שלם נבדק "in constant time". ‏Python בודקת בחשבון אם הוא נמצא בין הקצוות ונופל על הצעד. לכן `10**11 in range(10**12)` מיידי.

שני טווחים שווים כשהם מייצרים את אותם מספרים, גם אם נכתבו אחרת:

```python
print(range(0) == range(5, 2))
print(range(0, 3, 2) == range(0, 4, 2))
```

```text
True
True
```

## צעד שלילי וטווח ריק

כדי לספור לאחור נותנים צעד שלילי. ערך הסיום עדיין לא נכלל:

```python
print(list(range(5, 0, -1)))
print(list(reversed(range(5))))
print(list(range(0, 5, -1)))
```

```text
[5, 4, 3, 2, 1]
[4, 3, 2, 1, 0]
[]
```

‏`reversed(range(5))` נותן את המספרים של `range(5)` בסדר הפוך, בלי לחשב ארגומנטים. השורה האחרונה היא המלכודת: התחלה קטנה מהסיום עם צעד שלילי נותנת טווח ריק, בלי שום שגיאה. לולאת `for` עליו פשוט לא רצה.

צעד אפס לא היה נגמר אף פעם, אז Python דוחה אותו:

```python
range(0, 10, 0)
```

```text
ValueError: range() arg 3 must not be zero
```

## רק מספרים שלמים

כל הארגומנטים חייבים להיות מספרים שלמים:

```python
range(0, 1, 0.1)
```

```text
TypeError: 'float' object cannot be interpreted as an integer
```

לצעדים עשרוניים עוברים על מספרים שלמים ומחלקים:

```python
print([i / 10 for i in range(5)])
```

```text
[0.0, 0.1, 0.2, 0.3, 0.4]
```

חלוקה בכל סיבוב חוסכת את החיבור החוזר של `0.1`, שמצטבר לסטייה (`0.1 + 0.2` הוא `0.30000000000000004`).

## מתי range(len()) הוא הכלי הנכון

כדי לקרוא פריטים יחד עם המיקום שלהם, [`enumerate()`](https://docs.python.org/3/library/functions.html#enumerate) ברור יותר. ‏`range(len(...))` מתאים כשצריך את האינדקס עצמו: כדי לשנות פריטים במקום, או כדי להשוות כל פריט לשכן שלו.

```python
prices = [10.0, 20.0, 30.0]
for i in range(len(prices)):
    prices[i] = round(prices[i] * 1.18, 2)
print(prices)

temps = [21, 23, 22, 25]
for i in range(len(temps) - 1):
    print(temps[i + 1] - temps[i], end=" ")
```

```text
[11.8, 23.6, 35.4]
2 -1 3 
```

‏`for price in prices: price *= 1.18` לא היה עובד: הוא משנה את משתנה הלולאה, לא את הרשימה. הלולאה השנייה עוצרת פריט אחד לפני הסוף, כך ש-`temps[i + 1]` אף פעם לא חורג מהרשימה.

## טעויות נפוצות

- **טעות של אחד בסוף.** ‏`range(1, 10)` נעצר ב-9. בשביל 1 עד 10 כותבים `range(1, 11)`.
- **להתייחס ל-range כמו לרשימה.** ‏`range(5).append(5)` זורק `AttributeError`. המירו קודם עם `list()`.
- **ספירה לאחור עם צעד ברירת המחדל.** ‏`range(10, 0)` ריק. הוסיפו `-1`.

## מה הלאה

הצעד הבא בסדרה: לולאות `while` לעומק: ערך עצירה (sentinel), אופרטור הוולרוס, ולולאות שמובטח שייגמרו.
