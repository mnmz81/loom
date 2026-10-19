---
title: "פונקציות ב-Python"
summary: "‏def, פרמטרים וערכי החזרה, ברירות מחדל וארגומנטים לפי שם, המלכודת של ברירת מחדל שמשתנה, docstrings ו-type hints, והעברת פונקציה כערך."
date: 2026-10-13
tags: [python]
series: { key: python, order: 17 }
---

‏`print()`, ‏`len()` ו-`sorted()` הן פונקציות שמישהו אחר כתב. פונקציה נותנת שם לבלוק קוד: כותבים אותה פעם אחת ומריצים כמה פעמים שצריך, עם ערכים אחרים בכל פעם. ככה התוכנית נשארת קצרה, ובאג מתקנים במקום אחד.

כל הדוגמאות הורצו עם Python 3.13 ונבדקו מול [החלק על הגדרת פונקציות במדריך הרשמי](https://docs.python.org/3/tutorial/controlflow.html#defining-functions) ו[עוד על הגדרת פונקציות](https://docs.python.org/3/tutorial/controlflow.html#more-on-defining-functions).

## הגדרה וקריאה לפונקציה

המדריך הרשמי אומר: "The keyword `def` introduces a function definition. It must be followed by the function name and the parenthesized list of formal parameters." הגוף הוא הבלוק המוזח שמתחת:

```python
def greet(name):
    print(f"Hello, {name}!")

greet("Dana")
greet("Avi")
```

```text
Hello, Dana!
Hello, Avi!
```

‏`def` רק מגדיר את הפונקציה, והגוף רץ כשקוראים לה עם סוגריים. ‏`name` הוא *פרמטר*: משתנה שמקבל את הערך שלו מהקריאה. ‏`"Dana"` הוא ה*ארגומנט* שמועבר. לפונקציה יכולים להיות אפס פרמטרים, או כמה, מופרדים בפסיקים:

```python
def show_line():
    print("-" * 20)

def describe(item, price):
    print(item, "costs", price)

show_line()
describe("tea", 12)
```

```text
--------------------
tea costs 12
```

## ‏return: לקבל ערך בחזרה

‏`print()` מציגה משהו על המסך, אבל הקוד שקרא לפונקציה לא יכול להשתמש בזה. ‏`return` מחזיר לו ערך:

```python
def area(width, height):
    return width * height

room = area(4, 3)
print(room, area(2, 2) + room)
```

```text
12 16
```

‏`return` גם מסיים את הפונקציה מיד. בפונקציה יכולות להיות כמה פקודות `return`, למשל אחת בכל ענף של `if`:

```python
def grade(score):
    if score >= 90:
        return "A"
    if score >= 70:
        return "B"
    return "C"

print(grade(95), grade(80), grade(40))
```

```text
A B C
```

פונקציה בלי `return`, או עם `return` ריק, מחזירה `None`:

```python
def shout(text):
    print(text.upper())

result = shout("hi")
print(result)
```

```text
HI
None
```

כדי להחזיר כמה ערכים, מפרידים ביניהם בפסיקים. ‏Python אורזת אותם ב-tuple, והקוד שקרא יכול [לפרק אותו](he/posts/python-lists/):

```python
def min_max(numbers):
    return min(numbers), max(numbers)

low, high = min_max([4, 9, 1, 7])
print(low, high)
```

```text
1 9
```

## ברירות מחדל וארגומנטים לפי שם

לפרמטר יכול להיות ערך ברירת מחדל. מי שקורא לפונקציה יכול לוותר עליו:

```python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Dana"))
print(greet("Dana", "Shalom"))
print(greet(greeting="Hi", name="Noa"))
```

```text
Hello, Dana!
Shalom, Dana!
Hi, Noa!
```

הקריאה האחרונה משתמשת ב*ארגומנטים לפי שם* (keyword arguments): ‏`name=value`. עם שמות, הסדר לא משנה, והקריאה מסבירה את עצמה. כבר השתמשתם בהם: `print(..., end=" ")` ו-`sorted(..., reverse=True)`. פרמטרים עם ברירת מחדל חייבים לבוא אחרי אלה שבלי.

קודם באים ארגומנטים לפי מיקום, ואחריהם ארגומנטים לפי שם. העברה של אותו פרמטר פעמיים היא שגיאה:

```python
greet("Dana", name="Avi")
```

```text
TypeError: greet() got multiple values for argument 'name'
```

## המלכודת של ברירת מחדל שמשתנה

במדריך הרשמי יש "Important warning": ‏"The default value is evaluated only once." כשברירת המחדל היא רשימה או מילון, כל קריאה שלא מעבירה את הארגומנט חולקת את אותו אובייקט:

```python
def add_item(item, cart=[]):
    cart.append(item)
    return cart

print(add_item("milk"))
print(add_item("bread"))
```

```text
['milk']
['milk', 'bread']
```

התיקון: `None` כברירת מחדל, ויצירת הרשימה בתוך הפונקציה:

```python
def add_item(item, cart=None):
    if cart is None:
        cart = []
    cart.append(item)
    return cart

print(add_item("milk"))
print(add_item("bread"))
```

```text
['milk']
['bread']
```

## ‏Docstrings ו-type hints

מחרוזת בשורה הראשונה של הגוף היא ה-*docstring* של הפונקציה. עורכי קוד מציגים אותה, ו-`help()` מדפיס אותה. ‏*Type hints* אחרי הפרמטרים ואחרי `->` אומרים אילו טיפוסים הפונקציה מצפה לקבל ולהחזיר:

```python
def average(numbers: list[float]) -> float:
    """Return the mean of a non-empty list of numbers."""
    return sum(numbers) / len(numbers)

print(average([3, 4, 5]))
print(average.__doc__)
```

```text
4.0
Return the mean of a non-empty list of numbers.
```

ה-hints הם תיעוד. ‏Python לא בודקת אותם כשהקוד רץ, כמו שמראה [הפוסט על TypeError](he/posts/python-type-errors-and-checking/). כלים כמו mypy ועורך הקוד שלכם כן בודקים.

## פונקציות הן ערכים

פונקציה היא ערך כמו כל ערך אחר. אפשר לשמור אותה במשתנה, לשים אותה ברשימה, או להעביר אותה לפונקציה אחרת. זה מה ש-`key=len` עשה ב[פוסט על רשימות](he/posts/python-lists/): הוא העביר את הפונקציה `len` ל-`sorted()`, בלי לקרוא לה:

```python
def last_letter(word):
    return word[-1]

words = ["kiwi", "apple", "fig"]
print(sorted(words, key=last_letter))

shout = str.upper
print(shout("quiet"))
```

```text
['apple', 'fig', 'kiwi']
QUIET
```

לפונקציה קטנה כזו, `lambda` היא גרסה של שורה אחת בלי שם: `sorted(words, key=lambda w: w[-1])` נותן את אותה תוצאה.

## טעויות נפוצות

- **שכחה של הסוגריים.** ‏`greet` היא הפונקציה עצמה. ‏`greet()` קורא לה. ‏`print(greet)` מדפיס משהו כמו `<function greet at 0x...>`.
- **שימוש בפונקציה לפני שהוגדרה.** שורת ה-`def` צריכה לרוץ לפני הקריאה. ‏Python קוראת את הקובץ מלמעלה למטה.

## מה הלאה

הצעד הבא בסדרה: בלוקים של קוד ו-scope, שמסביר אילו משתנים פונקציה רואה, ולמה משתנה שנוצר בתוך `if` עדיין קיים אחריו.
