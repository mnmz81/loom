---
title: "אקראיות ב-Python: המודול random"
summary: "מספרים אקראיים, בחירה וערבוב של פריטים עם המודול random: randint, random, choice, sample, shuffle ו-seed לתוצאות שחוזרות על עצמן. ולמה זה לא מתאים לסיסמאות."
date: 2026-10-19
tags: [python]
series: { key: python, order: 29 }
---

משחקים, סימולציות, נתוני דוגמה ו"בחירת זוכה" צריכים כולם אקראיות. ל-Python יש בשביל זה את המודול `random`. טוענים אותו עם `import random` וקוראים לפונקציות שלו כ-`random.name()`. (הפוסט על [מודולים](he/posts/python-modules/) מסביר איך `import` עובד.)

כל דוגמה הורצה עם Python 3.13, ונבדקה מול [התיעוד של המודול `random`](https://docs.python.org/3/library/random.html).

## מספרים אקראיים

‏`randint(a, b)` מחזירה מספר שלם מ-`a` עד `b`, **כולל שניהם**. ‏`random()` מחזירה מספר עשרוני מ-0.0 ועד 1.0, בלי לכלול את 1.0. ‏`uniform(a, b)` מחזירה מספר עשרוני בין `a` ל-`b`:

```python
import random

die = random.randint(1, 6)
chance = random.random()
temp = random.uniform(15.0, 30.0)
print(1 <= die <= 6, 0 <= chance < 1, 15 <= temp <= 30)
```

```text
True True True
```

הערכים משתנים בכל הרצה, ולכן הדוגמה מדפיסה בדיקות ולא את הערכים. ‏`randint(1, 6)` כוללת את 6, בניגוד ל-`range(1, 6)` ([פוסט על לולאות](he/posts/python-loops/)). כדי לקבל התנהגות של `range` עם צעד, משתמשים ב-`randrange(start, stop, step)`: ‏`random.randrange(0, 100, 10)` בוחרת אחד מ-`0, 10, ..., 90`.

## בחירה מתוך רשימה

‏`choice()` בוחרת פריט אחד מ[רשימה](he/posts/python-lists/). ‏`sample(items, k)` בוחרת `k` פריטים שונים. ‏`choices(items, k=n)` בוחרת `n` פריטים, ואותו פריט יכול לצאת יותר מפעם אחת:

```python
colors = ["red", "green", "blue", "yellow"]

one = random.choice(colors)
three = random.sample(colors, 3)
rolls = random.choices(colors, k=6)
print(one in colors, len(set(three)), len(rolls))
```

```text
True 3 6
```

‏`sample()` אף פעם לא חוזרת על פריט (הבדיקה `len(set(...))` היא 3), ולכן היא מתאימה להגרלה או לחלוקה לקבוצות. ‏`choices()` מתאימה להגרלות בלתי תלויות כמו הטלת מטבע, ומקבלת `weights=[...]` כדי שפריטים מסוימים יהיו סבירים יותר. ‏`random.choice([])` על רשימה ריקה היא `IndexError`.

## ערבוב

‏`shuffle()` מסדרת מחדש רשימה **במקום** ומחזירה `None`, כמו `sort()` ב[פוסט על רשימות](he/posts/python-lists/). כדי לערבב בלי לגעת במקור, מערבבים העתק, או משתמשים ב-`sample()` עם האורך המלא:

```python
deck = [1, 2, 3, 4, 5]
mixed = random.sample(deck, len(deck))
random.shuffle(deck)
print(sorted(mixed) == sorted(deck) == [1, 2, 3, 4, 5])

deck = random.shuffle(deck)
print(deck)
```

```text
True
None
```

שתי השורות האחרונות הן הטעות הרגילה: ‏`deck = random.shuffle(deck)` זורקת את הרשימה.

## רצף שחוזר על עצמו: seed

המספרים הם *פסאודו-אקראיים*: נוסחה מייצרת אותם, החל מערך התחלה נסתר. ‏`seed()` קובעת את ערך ההתחלה, ולכן אותו seed נותן אותם מספרים בכל פעם:

```python
random.seed(42)
first = [random.randint(1, 100) for _ in range(5)]

random.seed(42)
second = [random.randint(1, 100) for _ in range(5)]
print(first)
print(first == second)
```

```text
[82, 15, 4, 95, 36]
True
```

קובעים seed כשצריך תוצאה שאפשר לחזור עליה: בדיקה שאסור לה להיות לא יציבה, באג שרוצים לשחזר, דוגמה במדריך. המספרים המדויקים יכולים להשתנות בין גרסאות Python, ולכן סומכים על "אותו seed, אותו רצף" ולא על הספרות.

## לא לסיסמאות

התיעוד מזהיר שאין להשתמש בפונקציות האלה למטרות אבטחה. מי שרואה מספיק פלטים יכול לנחש את הבאים. לסיסמאות, טוקנים וכל דבר סודי משתמשים במקום זה ב[מודול `secrets`](https://docs.python.org/3/library/secrets.html):

```python
import secrets

token = secrets.token_hex(8)
print(len(token), secrets.choice("abcdef") in "abcdef")
```

```text
16 True
```

## טעויות נפוצות

- **קובץ בשם של מודול.** קובץ בשם `random.py` ליד הסקריפט מיובא במקום המודול האמיתי, ו-`random.randint` נכשל עם `AttributeError`.
- **`randint` מתוך מחשבה שהסוף לא נכלל.** ‏`randint(0, len(items))` יכולה להחזיר `len(items)`, כלומר `IndexError` ([פוסט על אינדקסים](he/posts/python-lists-nested/)). משתמשים ב-`choice(items)` או ב-`randrange(len(items))`.
- **seed בתוך לולאה.** ‏`random.seed(1)` לפני כל הגרלה נותנת את אותו מספר בכל פעם.

## מה הלאה

הפוסט הבא: מודולים, כדי לראות איך `import random` מוצא קוד, ואיך כותבים מודול משלכם.
