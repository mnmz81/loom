---
title: "מילונים ב-Python: צלילה לעומק"
summary: "הכלים של dict מעבר לבסיס: comprehensions, קיבוץ עם setdefault ו-defaultdict, ‏Counter, מיזוג עם |, ‏views חיים ופעולות קבוצה על מפתחות, ומיון לפי ערך."
date: 2026-10-29
tags: [python]
series: { key: python, order: 21 }
---

[הפוסט על מילונים](he/posts/python-dicts/) כיסה יצירה, קריאה, שינוי ולולאות. הפוסט הזה עוסק בכלים שמחליפים את רוב הלולאות שכותבים ביד סביב מילון.

כל הדוגמאות הורצו עם Python 3.13 ונבדקו מול [התיעוד של mapping types](https://docs.python.org/3/library/stdtypes.html#mapping-types-dict) ו[התיעוד של המודול `collections`](https://docs.python.org/3/library/collections.html).

## ‏Dict comprehensions

‏comprehension בונה מילון בביטוי אחד: `{key: value for item in iterable}`, עם `if` אופציונלי:

```python
prices = {"apple": 4.5, "bread": 9.9, "milk": 6.2, "cheese": 32.0}

with_vat = {name: round(p * 1.18, 2) for name, p in prices.items()}
cheap = {name: p for name, p in prices.items() if p < 10}
by_price = {p: name for name, p in prices.items()}
print(with_vat)
print(cheap)
print(by_price[9.9])
```

```text
{'apple': 5.31, 'bread': 11.68, 'milk': 7.32, 'cheese': 37.76}
{'apple': 4.5, 'bread': 9.9, 'milk': 6.2}
bread
```

‏`by_price` מחליף בין מפתחות לערכים. אם לשני מפתחות יש אותו ערך, המאוחר מנצח והקודם נעלם בלי אזהרה.

## קיבוץ: setdefault ו-defaultdict

קיבוץ פירושו "רשימה לכל מפתח". הדרך הארוכה בודקת אם המפתח קיים לפני כל `append`. ‏[`setdefault(key, default)`](https://docs.python.org/3/library/stdtypes.html#dict.setdefault) מחזיר את הערך אם המפתח קיים, ואחרת מכניס את `default` ומחזיר אותו:

```python
words = ["apple", "avocado", "bread", "banana", "cherry"]

groups = {}
for w in words:
    groups.setdefault(w[0], []).append(w)
print(groups)
```

```text
{'a': ['apple', 'avocado'], 'b': ['bread', 'banana'], 'c': ['cherry']}
```

‏[`defaultdict`](https://docs.python.org/3/library/collections.html#collections.defaultdict) עושה את אותו הדבר לכל מפתח חסר. הוא מקבל פונקציה בלי ארגומנטים, כמו `list` או `int`, וקורא לה כדי ליצור את הערך החסר:

```python
from collections import defaultdict

groups = defaultdict(list)
for w in words:
    groups[w[0]].append(w)
print(groups["b"])
print(groups["z"])
print(sorted(groups))
```

```text
['bread', 'banana']
[]
['a', 'b', 'c', 'z']
```

השורה האחרונה מראה את המחיר: עצם הקריאה של `groups["z"]` הוסיפה את `"z"`. כדי לבדוק בלי להוסיף, משתמשים ב-`in` או ב-`get()`, שלא יוצרים מפתחות.

## ‏Counter

הפוסט על מילונים ספר מילים עם `get(word, 0) + 1`. ‏[`Counter`](https://docs.python.org/3/library/collections.html#collections.Counter) הוא מילון שנבנה בדיוק לזה:

```python
from collections import Counter

counts = Counter("the cat and the hat and the bat".split())
print(counts.most_common(2))
print(counts["dog"])
counts.update(["the", "dog"])
print(counts["the"], counts["dog"])
print(Counter("aab") + Counter("abc"))
```

```text
[('the', 3), ('and', 2)]
0
4 1
Counter({'a': 3, 'b': 2, 'c': 1})
```

מפתח חסר נותן `0`, ובניגוד ל-`defaultdict`, הקריאה לא מוסיפה אותו. ‏`update()` מוסיף לספירות במקום להחליף אותן, ו-`+` מחבר שני מונים.

## מיזוג: | ו-|=

מאז Python 3.9, ‏`|` ממזג שני מילונים למילון חדש, ו-`|=` מעדכן מילון קיים. כשמפתח נמצא בשניהם, הצד הימני מנצח:

```python
defaults = {"theme": "light", "lang": "he", "size": 14}
user = {"theme": "dark", "size": 16}

settings = defaults | user
print(settings)
print(defaults)
defaults |= {"lang": "en"}
print(defaults)
```

```text
{'theme': 'dark', 'lang': 'he', 'size': 16}
{'theme': 'light', 'lang': 'he', 'size': 14}
{'theme': 'light', 'lang': 'en', 'size': 14}
```

‏`defaults | user` הוא הדפוס "ברירות מחדל, שהמשתמש דורס" בביטוי אחד. בקוד ישן יותר תראו `{**defaults, **user}`, שעושה אותו הדבר.

## ‏Views חיים

‏`keys()`, ‏`values()` ו-`items()` לא מעתיקים כלום. התיעוד קורא להם views: ‏"when the dictionary changes, the view reflects these changes". ה-view של המפתחות תומך גם בפעולות של קבוצות:

```python
stock = {"apple": 3, "pear": 0}
names = stock.keys()
stock["kiwi"] = 7
print(names)

week1 = {"apple": 3, "pear": 1}
week2 = {"pear": 2, "kiwi": 5}
print(week1.keys() & week2.keys())
print(week1.keys() - week2.keys())
```

```text
dict_keys(['apple', 'pear', 'kiwi'])
{'pear'}
{'apple'}
```

‏`names` נלקח לפני ש-`kiwi` נוסף, ועדיין מציג אותו. ‏`&` נותן את המפתחות שנמצאים בשני המילונים, ו-`-` את המפתחות שנמצאים רק בראשון.

## מיון לפי ערך

מילונים שומרים על סדר ההכנסה, אבל אין להם `sort()`. ממיינים את הזוגות עם פונקציית `key` ובונים מהתוצאה מילון חדש:

```python
scores = {"Dana": 88, "Avi": 95, "Noa": 72}
ranked = dict(sorted(scores.items(), key=lambda kv: kv[1], reverse=True))
print(ranked)
print(list(ranked)[0])
```

```text
{'Avi': 95, 'Dana': 88, 'Noa': 72}
Avi
```

‏`kv` הוא זוג אחד של `(name, score)`, ו-`kv[1]` הוא הציון. שני מילונים עם אותם זוגות שווים (`==`) בלי קשר לסדר.

## טעויות נפוצות

- **קריאה מ-`defaultdict` כדי לבדוק אותו.** ‏`if groups["x"]:` מוסיף את `"x"`. השתמשו ב-`"x" in groups`.
- **‏`defaultdict([])` במקום `defaultdict(list)`.** הוא צריך פונקציה לקרוא לה, לא ערך: `TypeError: first argument must be callable or None`.
- **הוספה או מחיקה של מפתחות בזמן לולאה על view.** ה-view משתנה גם הוא, ו-Python עוצרת את הלולאה עם `RuntimeError`. עברו בלולאה על `list(d.items())`.

## מה הלאה

הצעד הבא בסדרה: רשימות ומילונים אחד בתוך השני, הצורה של רוב הנתונים האמיתיים.
