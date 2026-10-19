---
title: "בלוקים של קוד ו-scope ב-Python"
summary: "מה זה בלוק של קוד ב-Python, למה if, for, while ו-try לא יוצרים scope חדש, אילו בלוקים כן יוצרים (פונקציות, מחלקות, comprehensions), והבאגים שנובעים מבלבול ביניהם."
date: 2026-10-13
tags: [python]
series: { key: python, order: 18 }
---

אם יוצרים משתנה בתוך בלוק של `if`, אפשר להשתמש בו אחרי הבלוק? בהרבה שפות לא. ב-Python כן, כי *בלוק של קוד* הוא לא *scope* (טווח הכרה של שמות).

כל הדוגמאות הורצו עם Python 3.13 ונבדקו מול [התיעוד של משפטים מורכבים](https://docs.python.org/3/reference/compound_stmts.html) ו[מודל ההרצה](https://docs.python.org/3/reference/executionmodel.html#naming-and-binding).

## מה זה בלוק של קוד

שורה של `if`, `for`, `while`, `def` או `class` נגמרת בנקודתיים. השורות המוזחות מתחתיה הן המשפטים שהיא שולטת בהם. התיעוד קורא לקבוצה הזו *suite*: "קבוצת משפטים שנשלטת על ידי פסוקית". אפשר לקנן בלוקים, וההזחה מראה לאיזה בלוק שייכת כל שורה:

```python
def check(n):
    if n > 0:
        print("positive")
        if n > 100:
            print("big")
    print("checked", n)

check(150)
check(-1)
```

```text
positive
big
checked 150
checked -1
```

‏`print("checked", n)` נמצאת ברמה של הפונקציה, ולכן היא רצה בכל פעם. שתי ההדפסות שמעליה שייכות ל-`if`. ‏[הפוסט על הזחה](he/posts/python-indentation-error/) מכסה את השגיאות שמקבלים כשההזחה לא נכונה.

בלוק יכול גם לשבת באותה שורה עם הכותרת שלו, מופרד בנקודה-פסיק:

```python
if True: print("one line"); print("two statements")
```

```text
one line
two statements
```

זה עובד, אבל קשה לקריאה. ‏PEP 8 ממליץ להימנע מזה.

## בלוקים שלא יוצרים scope

‏*scope* הוא המקום שבו שם מוכר. ב-Python, ‏`if`, `elif`, `else`, `for`, `while`, `with` ו-`try` לא יוצרים scope חדש. משתנה שמוגדר בתוכם שייך לפונקציה או למודול שמסביבם:

```python
if True:
    message = "set inside if"
print(message)

for i in range(3):
    last = i * 10
print(i, last)
```

```text
set inside if
2 20
```

‏`message` עדיין קיים אחרי ה-`if`. אחרי הלולאה, `i` ו-`last` שומרים את הערכים מהסיבוב האחרון. התיעוד אומר את זה במפורש: "השמות ברשימת היעד לא נמחקים כשהלולאה מסתיימת". ‏`while` מתנהגת אותו דבר. בניגוד ל-C, ‏Java או `let` ב-JavaScript, ב-Python אין scope של בלוק.

### זהירות: משתנה שמוגדר רק בענף אחד

"אין scope של בלוק" לא אומר שהמשתנה תמיד קיים. הוא קיים רק אם השורה שמגדירה אותו באמת רצה:

```python
hour = 9
if hour > 12:
    greeting = "Good afternoon"
print(greeting)
```

```text
NameError: name 'greeting' is not defined
```

הפתרון הוא לתת למשתנה ערך לפני ה-`if`, או בכל אחד מהענפים:

```python
hour = 9
greeting = "Good morning"
if hour > 12:
    greeting = "Good afternoon"
print(greeting)
```

```text
Good morning
```

אותו דבר קורה עם לולאה על רשימה ריקה. התיעוד מציין שאם הרצף ריק, משתני הלולאה "לא יקבלו ערך בכלל":

```python
for item in []:
    found = item
print(found)
```

```text
NameError: name 'found' is not defined. Did you mean: 'round'?
```

## בלוקים שכן יוצרים scope

מודל ההרצה מפרט אילו בלוקים יוצרים scope: "מודול, גוף של פונקציה והגדרה של מחלקה". משתנה שמוגדר בתוך פונקציה הוא מקומי לפונקציה ונעלם כשהיא מסתיימת:

```python
def make_greeting():
    text = "Hello"
    return text

print(make_greeting())
print(text)
```

```text
Hello
NameError: name 'text' is not defined. Did you mean: 'next'?
```

כדי להוציא ערך מפונקציה, מחזירים אותו עם `return`.

אותו דבר נכון לגוף של מחלקה. השמות שלו לא מוכרים בתוך המתודות, ולכן ניגשים אליהם דרך `self` או דרך שם המחלקה:

```python
class Config:
    debug = True

    def show(self):
        return debug

print(Config.debug)
Config().show()
```

```text
True
NameError: name 'debug' is not defined. Did you mean: 'self.debug'?
```

### ל-comprehension יש scope משלו

‏list comprehension (לולאה בשורה אחת שבונה רשימה) הוא היוצא מן הכלל ל"לולאות לא יוצרות scope". משתנה הלולאה שלו נשאר בפנים:

```python
x = "outer"
squares = [x * x for x in range(4)]
print(squares, x)
```

```text
[0, 1, 4, 9] outer
```

‏[התיעוד של comprehensions](https://docs.python.org/3/reference/expressions.html#displays-for-lists-sets-and-dictionaries) אומר שה-comprehension רץ "ב-scope מקונן נפרד".

## קריאה וכתיבה של שמות מבחוץ

‏scope פנימי יכול **לקרוא** שמות מה-scopes שמסביבו:

```python
x = 10

def outer():
    y = 20

    def inner():
        print(x, y)

    inner()

outer()
```

```text
10 20
```

**השמה** לשם בתוך פונקציה יוצרת משתנה מקומי חדש, במקום לשנות את החיצוני:

```python
enemies = 1

def increase_enemies():
    enemies = 2
    print("inside:", enemies)

increase_enemies()
print("outside:", enemies)
```

```text
inside: 2
outside: 1
```

יש כאן שני משתנים שונים בשם `enemies`. מילות המפתח `global` ו-`nonlocal`, וה-`UnboundLocalError` שמקבלים כשמערבבים קריאה והשמה, מוסברים ב[פוסט על scope ושמות](he/posts/python-scope-and-naming/). עדיף להעביר ערכים כארגומנטים ולהחזיר תוצאות, במקום לשנות משתנים גלובליים.

## ההפתעה היחידה: except ... as

בלוק אחד כן מנקה אחריו. השם שאחרי `as` בפסוקית `except` נמחק כשהפסוקית מסתיימת:

```python
try:
    1 / 0
except ZeroDivisionError as err:
    saved = err
print(saved)
print(err)
```

```text
division by zero
NameError: name 'err' is not defined
```

לפי התיעוד, כדי להשתמש בחריגה אחרי פסוקית ה-`except` "צריך לשמור אותה בשם אחר". זה בדיוק מה ש-`saved = err` עושה.

## מה הלאה

הצעד הבא בסדרה: scope ושמות, עם מילות המפתח `global` ו-`nonlocal`, ואיך בוחרים שמות טובים.
