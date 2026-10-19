---
title: "רשימות ב-Python"
summary: "רשימה מחזיקה הרבה ערכים לפי סדר. יצירה, אינדקסים וחיתוך, הוספה והסרה, מיון, העתקה בלי הפתעות, ומילה על tuples."
date: 2026-10-13
updated: 2026-10-19
tags: [python]
series: { key: python, order: 10 }
---

תוכניות אמיתיות עובדות עם הרבה ערכים בבת אחת: המוצרים בעגלת קניות, השורות בקובץ, הציונים של כיתה. הכלי הבסיסי לזה הוא הרשימה (list). התיעוד מגדיר אותה כגמישה ביותר מבין טיפוסי הנתונים המורכבים של Python: רצף ערכים בתוך סוגריים מרובעים, בסדר קבוע, שאפשר לשנות.

כל דוגמה כאן הורצה עם Python 3.13. ההתנהגות נבדקה מול [החלק על רשימות במדריך הרשמי](https://docs.python.org/3/tutorial/introduction.html#lists), ‏[עוד על רשימות](https://docs.python.org/3/tutorial/datastructures.html#more-on-lists) ו[התיעוד של הטיפוס `list`](https://docs.python.org/3/library/stdtypes.html#lists).

## יצירת רשימה

כותבים את הערכים בין סוגריים מרובעים, מופרדים בפסיקים:

```python
fruits = ["apple", "banana", "cherry"]
scores = [90, 72, 85]
empty = []
mixed = ["Dana", 30, True]
print(fruits, len(fruits))
print(empty, len(empty))
print(type(scores))
```

```text
['apple', 'banana', 'cherry'] 3
[] 0
<class 'list'>
```

רשימה יכולה להחזיק ערכים מטיפוסים שונים, כמו `mixed`, אבל בדרך כלל כל הפריטים מאותו טיפוס. ‏`len()` נותן את מספר הפריטים, בדיוק כמו במחרוזת.

‏`list()` בונה רשימה מכל דבר שאפשר לעבור עליו פריט אחרי פריט, כמו מחרוזת ([פוסט על המרת טיפוסים](he/posts/python-type-conversion/)) או `range` ([פוסט על לולאות](he/posts/python-loops/)).

## אינדקסים וחיתוך

ברשימות משתמשים באותם אינדקסים כמו ב[מחרוזות](he/posts/python-strings/): הפריט הראשון הוא `0`, ואינדקסים שליליים סופרים מהסוף. חיתוך `[start:stop]` מחזיר רשימה חדשה:

```python
fruits = ["apple", "banana", "cherry", "date"]
print(fruits[0], fruits[-1])
print(fruits[1:3])
print(fruits[::-1])
```

```text
apple date
['banana', 'cherry']
['date', 'cherry', 'banana', 'apple']
```

אינדקס שעובר את הסוף הוא שגיאה, אבל חיתוך שעובר את הסוף מחזיר את מה שקיים:

```python
print(fruits[1:100])
print(fruits[10])
```

```text
['banana', 'cherry', 'date']
IndexError: list index out of range
```

## שינוי רשימה

כאן רשימות שונות ממחרוזות. מחרוזת אי אפשר לשנות, ורשימה אפשר. המדריך הרשמי מנסח את זה כך: "Unlike strings, which are immutable, lists are a mutable type". אפשר להחליף פריט במקום:

```python
scores = [90, 72, 85]
scores[1] = 75
print(scores)
```

```text
[90, 75, 85]
```

כדי להוסיף פריטים משתמשים במתודות. ‏`append()` מוסיף פריט אחד לסוף, `insert()` מוסיף פריט במיקום מסוים, ו-`extend()` מוסיף את כל הפריטים של רשימה אחרת:

```python
cart = ["milk"]
cart.append("bread")
cart.insert(0, "eggs")
cart.extend(["tea", "rice"])
print(cart)
```

```text
['eggs', 'milk', 'bread', 'tea', 'rice']
```

כדי להסיר פריטים: `remove()` מוחק את הפריט הראשון עם ערך מסוים, `pop()` מוחק לפי מיקום ומחזיר את הפריט, ו-`del` מוחק לפי אינדקס או חיתוך:

```python
cart.remove("milk")
last = cart.pop()
first = cart.pop(0)
print(cart, last, first)

del cart[0]
print(cart)
```

```text
['bread', 'tea'] rice eggs
['tea']
```

‏`pop()` בלי ארגומנט לוקח מהסוף. זה הופך רשימה למחסנית (stack) טבעית: `append()` כדי לדחוף, ו-`pop()` כדי לקחת בחזרה את הפריט האחרון.

## חיפוש וספירה

‏`in` בודק אם ערך נמצא ברשימה ומחזיר `True` או `False`. ‏`index()` נותן את המיקום של ההתאמה הראשונה, ו-`count()` סופר התאמות:

```python
colors = ["red", "green", "blue", "green"]
print("green" in colors, "pink" in colors)
print(colors.index("green"), colors.count("green"))
```

```text
True False
1 2
```

‏`index()` מעלה שגיאה כשהערך לא קיים, אז בודקים קודם עם `in`, או משתמשים ב[תנאים מהפוסט הבא](he/posts/python-if-else/):

```python
print(colors.index("pink"))
```

```text
ValueError: 'pink' is not in list
```

ברשימות של מספרים, `sum()`, ‏`min()` ו-`max()` עושים את מה שהשם שלהם אומר:

```python
scores = [90, 72, 85]
print(sum(scores), min(scores), max(scores))
print(sum(scores) / len(scores))
```

```text
247 72 90
82.33333333333333
```

## מיון

יש שתי דרכים למיין. המתודה `sort()` ממיינת את הרשימה עצמה ומחזירה `None`. הפונקציה `sorted()` לא נוגעת ברשימה ומחזירה רשימה חדשה וממוינת:

```python
numbers = [3, 1, 2]
print(sorted(numbers), numbers)

numbers.sort()
print(numbers)

numbers.sort(reverse=True)
print(numbers)
```

```text
[1, 2, 3] [3, 1, 2]
[1, 2, 3]
[3, 2, 1]
```

הארגומנט `key` ממיין לפי משהו שמחושב מכל פריט. ‏`key=len` ממיין מילים לפי אורך, ו-`key=str.lower` מתעלם מאותיות גדולות וקטנות:

```python
words = ["banana", "Apple", "fig"]
print(sorted(words))
print(sorted(words, key=str.lower))
print(sorted(words, key=len))
```

```text
['Apple', 'banana', 'fig']
['Apple', 'banana', 'fig']
['fig', 'Apple', 'banana']
```

‏`sorted(words)` רגיל שם את `"Apple"` ראשון כי אותיות גדולות באות לפני קטנות, וזה כמעט אף פעם לא מה שרוצים כשממיינים שמות.

## שני שמות, רשימה אחת

השמה של רשימה למשתנה אחר לא מעתיקה אותה. שני השמות מצביעים על אותה רשימה, אז שינוי דרך שם אחד נראה גם דרך השני:

```python
a = [1, 2, 3]
b = a
b.append(4)
print(a)
print(a is b)
```

```text
[1, 2, 3, 4]
True
```

כדי לקבל רשימה נפרדת, מעתיקים עם `copy()`, ‏`list()` או חיתוך מלא `[:]`:

```python
a = [1, 2, 3]
c = a.copy()
c.append(4)
print(a, c)
```

```text
[1, 2, 3] [1, 2, 3, 4]
```

אלה העתקות *רדודות* (shallow): רשימה שנמצאת בתוך הרשימה עדיין משותפת. ברשימות של מספרים ומחרוזות זה אף פעם לא משנה.

## ‏Tuples: רשימה שאי אפשר לשנות

‏tuple נכתב עם סוגריים עגולים במקום מרובעים. ניגשים אליו עם אינדקסים כמו לרשימה, אבל אי אפשר לשנות אותו אחרי שנוצר:

```python
point = (3, 4)
print(point[0], len(point))
x, y = point
print(x, y)
point[0] = 10
```

```text
3 2
3 4
TypeError: 'tuple' object does not support item assignment
```

‏`x, y = point` הוא *פירוק* (unpacking): שם אחד לכל פריט, כמו ב-`x, y = 1, 2` מ[הפוסט על משתנים](he/posts/python-variables-types/). משתמשים ב-tuple לקבוצה קבועה של ערכים ששייכים יחד, כמו קואורדינטות, וברשימה לאוסף שגדל וקטן.

## טעויות נפוצות

- **שימוש בתוצאה של `sort()`.** ‏`numbers = numbers.sort()` שם ב-`numbers` את `None`. כותבים `numbers.sort()` לבד, או `numbers = sorted(numbers)`.
- **‏`append()` עם רשימה.** ‏`cart.append(["tea", "rice"])` מוסיף פריט אחד, רשימה בתוך הרשימה. כדי להוסיף כל פריט בנפרד משתמשים ב-`extend()`.
- **טעות של אחד באינדקס.** הפריט האחרון הוא `items[len(items) - 1]`, או פשוט `items[-1]`. ‏`items[len(items)]` הוא `IndexError`.
- **משתנה בשם `list`.** ‏`list = [1, 2]` מסתיר את `list()` המובנה ([הסתרת שם מובנה](he/posts/python-scope-and-naming/)).

## מה הלאה

בפוסט הבא: אינדקסים ברשימות לעומק, ה-`IndexError`, ורשימות בתוך רשימות.
