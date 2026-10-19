---
title: "מילונים (dict) ב-Python"
summary: "מילון שומר ערכים לפי מפתח במקום לפי מיקום. יצירה, קריאה בטוחה עם get, הוספה והסרה, לולאה על מפתחות וערכים, ספירה, מבנים מקוננים, ואילו ערכים יכולים להיות מפתח."
date: 2026-10-13
tags: [python]
series: { key: python, order: 18 }
---

[רשימה](he/posts/python-lists/) מוצאת ערך לפי המיקום שלו: `scores[2]`. הרבה פעמים רוצים למצוא ערך לפי שם: המחיר של "apple", מספר הטלפון של "Dana", ההגדרה שנקראת "theme". בשביל זה יש מילון, ובקיצור `dict`. המדריך הרשמי ממליץ לחשוב על מילון כעל "a set of key: value pairs, with the requirement that the keys are unique".

כל הדוגמאות הורצו עם Python 3.13 ונבדקו מול [החלק על מילונים במדריך הרשמי](https://docs.python.org/3/tutorial/datastructures.html#dictionaries) ו[התיעוד של טיפוסי מיפוי](https://docs.python.org/3/library/stdtypes.html#mapping-types-dict).

## יצירת מילון

כותבים זוגות `key: value` בין סוגריים מסולסלים. קוראים ערך כשכותבים את המפתח שלו בסוגריים מרובעים:

```python
prices = {"apple": 4.5, "bread": 9.9, "milk": 6.2}
print(prices["bread"])
print(len(prices))
print(prices)

empty = {}
person = dict(name="Dana", age=31)
print(person)
```

```text
9.9
3
{'apple': 4.5, 'bread': 9.9, 'milk': 6.2}
{'name': 'Dana', 'age': 31}
```

‏`{}` הוא מילון ריק, לא קבוצה (set) ריקה. ‏`dict(name="Dana")` הוא דרך נוספת לכתוב מפתחות שהם מחרוזות. מילון שומר את הזוגות שלו לפי סדר ההוספה.

## קריאה בטוחה: in ו-get()

מפתח שלא קיים הוא שגיאה:

```python
prices = {"apple": 4.5, "bread": 9.9}
print(prices["cheese"])
```

```text
KeyError: 'cheese'
```

‏`in` בודק אם מפתח קיים. ‏`get()` מחזיר את הערך, או `None` (או ברירת מחדל שבוחרים) כשהמפתח חסר:

```python
print("apple" in prices, "cheese" in prices)
print(prices.get("cheese"))
print(prices.get("cheese", 0))
```

```text
True False
None
0
```

‏`in` בודק את המפתחות, לא את הערכים. ‏`4.5 in prices` הוא `False`.

## הוספה, שינוי והסרה

השמה למפתח מוסיפה אותו אם הוא חדש, ומחליפה את הערך אם הוא כבר קיים. מפתחות הם ייחודיים, אז אף פעם אין "apple" שני:

```python
stock = {"apple": 10}
stock["pear"] = 3
stock["apple"] = 8
stock["apple"] += 1
print(stock)

stock.update({"kiwi": 5, "pear": 4})
print(stock)
```

```text
{'apple': 9, 'pear': 3}
{'apple': 9, 'pear': 4, 'kiwi': 5}
```

‏`update()` מעתיק כל זוג ממילון אחר, ומחליף את המפתחות שכבר קיימים. כדי להסיר מפתח, `del` מוחק אותו, ו-`pop()` מוחק אותו ומחזיר את הערך:

```python
del stock["kiwi"]
pears = stock.pop("pear")
print(stock, pears)
print(stock.pop("plum", "not there"))
```

```text
{'apple': 9} 4
not there
```

כמו `get()`, גם `pop()` מקבל ברירת מחדל למפתח חסר. בלי ברירת מחדל, מפתח חסר מעלה `KeyError`.

## לולאה על מילון

‏[לולאת `for`](he/posts/python-loops/) על מילון נותנת את המפתחות שלו. ‏`values()` נותן את הערכים, ו-`items()` נותן זוגות `(key, value)` שמפרקים בלולאה:

```python
prices = {"apple": 4.5, "bread": 9.9, "milk": 6.2}
for name in prices:
    print(name)

print(sum(prices.values()))

for name, price in prices.items():
    print(f"{name:<6} {price:>5.2f}")
```

```text
apple
bread
milk
20.6
apple   4.50
bread   9.90
milk    6.20
```

הגדרות העיצוב `:<6` ו-`:>5.2f` מיישרות את העמודות, כמו ב[פוסט על f-strings](he/posts/python-f-strings/). לא מוסיפים ולא מסירים מפתחות תוך כדי לולאה על מילון: Python מעלה `RuntimeError: dictionary changed size during iteration`. אם צריך, עוברים על `list(prices)`.

## ספירה עם מילון

כדי לספור כמה פעמים כל דבר מופיע, `get(key, 0)` נותן אפס למפתח שעוד לא ראינו:

```python
words = "the cat and the hat and the bat".split()
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
print(counts)
print(max(counts, key=counts.get))
```

```text
{'the': 3, 'cat': 1, 'and': 2, 'hat': 1, 'bat': 1}
the
```

‏`max(counts, key=counts.get)` מוצא את המפתח עם הערך הגדול ביותר. ‏`collections.Counter` מהספרייה הסטנדרטית עושה את אותה ספירה בשורה אחת.

## נתונים מקוננים

ערכים יכולים להיות כל דבר, כולל רשימות ומילונים אחרים, כמו בתשובת JSON מ-API ברשת:

```python
user = {
    "name": "Dana",
    "langs": ["he", "en"],
    "address": {"city": "Haifa", "zip": "3200003"},
}
print(user["langs"][0])
print(user["address"]["city"])
user["langs"].append("fr")
print(user["langs"])
```

```text
he
Haifa
['he', 'en', 'fr']
```

קוראים ערכים מקוננים צעד אחרי צעד, מבחוץ פנימה: `user["address"]` הוא מילון, ו-`["city"]` קורא ממנו.

## מה יכול להיות מפתח

מפתחות חייבים להיות *hashable*: בפועל, ערכים שלא יכולים להשתנות, כמו מחרוזות, מספרים ו-tuples. רשימה לא יכולה להיות מפתח:

```python
grid = {(0, 0): "start", (2, 3): "treasure"}
print(grid[(2, 3)])
bad = {["a", "b"]: 1}
```

```text
treasure
TypeError: unhashable type: 'list'
```

רשימה יכולה להשתנות אחרי שהשתמשו בה כמפתח, ולכן היא נדחית. על ערכים אין מגבלה כזו.

## טעויות נפוצות

- **ציפייה ש-`in` יחפש בערכים.** ‏`"Dana" in user` בודק מפתחות. לערכים כותבים `"Dana" in user.values()`.
- **העתקה עם `=`.** כמו ברשימות, `b = a` נותן שם שני לאותו מילון. למילון נפרד משתמשים ב-`a.copy()`.

## מה הלאה

הצעד הבא בסדרה: פונקציות, שנותנות שם לבלוק קוד כדי שאפשר יהיה להריץ אותו שוב עם ערכים אחרים.
