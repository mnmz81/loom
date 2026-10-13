---
title: "היקף משתנים ושמות טובים ב-Python"
summary: "איפה אפשר לראות ולשנות משתנה ב-Python: היקף מקומי, גלובלי ו-nonlocal, המילים global ו-nonlocal, הסתרת שמות, ואיך בוחרים שמות ברורים לפי PEP 8."
date: 2026-10-11
tags: [python]
series: { key: python, order: 19 }
---

למשתנה יש מקום מסוים בקוד. ה-*scope* (היקף) של משתנה הוא החלק בתוכנית שבו אפשר להשתמש בשם שלו. ההיקף הוא הסיבה שמשתנה יכול "להיעלם" בפונקציה אחת ולעבוד מצוין בפונקציה אחרת. הפוסט הזה מסביר איך Python מחליט לאיזה שם התכוונתם, ואיך לבחור שמות שמקלים על קריאת הקוד.

כל דוגמה כאן הורצה עם Python 3.13. הכללים נבדקו מול [המדריך הרשמי על היקפים](https://docs.python.org/3/tutorial/classes.html#python-scopes-and-namespaces), [הפניה למילה global](https://docs.python.org/3/reference/simple_stmts.html#the-global-statement) ו-[PEP 8](https://peps.python.org/pep-0008/#naming-conventions).

## איפה Python מחפש שם

כששמים לב לשם, Python מחפש לפי הסדר הבא: הפונקציה הנוכחית (מקומי), אחר כך הפונקציות שמקיפות אותה, אחר כך המודול (גלובלי), ולבסוף השמות המובנים כמו `print` ו-`len`. התיעוד מתאר את זה כך: "ההיקף הפנימי ביותר, שמחפשים בו קודם, מכיל את השמות המקומיים".

```python
x = "global"

def show_local():
    x = "local"
    print("inside:", x)

show_local()
print("outside:", x)
```

```text
inside: local
outside: global
```

בתוך הפונקציה, `x = "local"` יוצר משתנה מקומי חדש. ה-`x` הגלובלי לא נגע. לפי התיעוד, בלי מילה `global` או `nonlocal`, "השמה לשם תמיד נכנסת להיקף הפנימי ביותר".

## קריאה של משתנה גלובלי מותרת

פונקציה יכולה לקרוא משתנה גלובלי בלי שום מילה מיוחדת:

```python
def read_only():
    print("read:", x)

read_only()
```

```text
read: global
```

הבעיה מתחילה כשמבצעים *השמה* לשם בתוך הפונקציה. אז Python מתייחס אליו כמקומי, וזו הסיבה שהקוד הבא מבלבל:

```python
def try_change():
    x = "changed"
    print("inside:", x)

try_change()
print("still:", x)
```

```text
inside: changed
still: global
```

## המילה global

כדי לשנות משתנה גלובלי מתוך פונקציה, מצהירים עליו:

```python
def with_global():
    global x
    x = "changed by global"

with_global()
print("now:", x)
```

```text
now: changed by global
```

לפי התיעוד, שם שהוצהר כ-global "מפורש כגלובלי", וכל ההשמות שלו נכנסות להיקף של המודול. משתמשים בזה בזהירות. פונקציות ששינוי מצב גלובלי קשות יותר לבדיקה ולמעקב. בדרך כלל עדיף להעביר את הערך פנימה ולהחזיר את התוצאה.

## המילה nonlocal

לפונקציה שנמצאת בתוך פונקציה אחרת, `nonlocal` משנה משתנה של הפונקציה המקיפה:

```python
def outer():
    y = "outer"
    def inner():
        nonlocal y
        y = "changed by nonlocal"
    inner()
    print("outer y:", y)

outer()
```

```text
outer y: changed by nonlocal
```

בלי `nonlocal`, `inner` היה יוצר `y` משלו, ו-`outer` היה מדפיס `outer`.

## שם חייב להיות מוצהר לפני השימוש

בתוך פונקציה, משתנה הוא מקומי לכל גוף הפונקציה. אם משתמשים בו לפני ההשמה, מקבלים שגיאה:

```python
def bad_count():
    print(total)
    total = 5

bad_count()
```

```text
UnboundLocalError: cannot access local variable 'total' where it is not associated with a value
```

`total` הוא מקומי בגלל ההשמה שמופיעה למטה, ולכן ה-`print` מחפש ערך מקומי שעדיין לא קיים. אותו כלל חל על `global`: היא חייבת להופיע לפני כל שימוש בשם באותה פונקציה. אחרת מקבלים `SyntaxError`:

```python
counter = 0

def bump():
    counter += 1
    global counter
```

```text
SyntaxError: name 'counter' is assigned to before global declaration
```

## הסתרת שם מובנה

ההיקף מסביר גם מה קורה כשנותנים למשתנה שם של פונקציה מובנית:

```python
print(len("abc"))
len = 3
print(len)
```

```text
3
3
```

אחרי `len = 3`, ה-`len` של המודול מסתיר את הפונקציה המובנית `len`. כל קריאה מאוחרת ל-`len(...)` באותו קובץ תיכשל. זה נקרא הסתרה (shadowing). מונעים אותה בבחירת שם אחר.

## בחירת שמות טובים

PEP 8 נותן את הכללים לשמות. העיקריים:

- **משתנים ופונקציות:** אותיות קטנות, עם קווים תחתונים. `total_price`, ולא `totalPrice` או `TP`.
- **קבועים** (ערכים שלא משתנים, בדרך כלל ברמת המודול): אותיות גדולות. `MAX_RETRIES = 3`.
- **להימנע מ-`l`, `O` ו-`I`.** לפי PEP 8, בחלק מהגופנים הם נראים כמו הספרות אחת ואפס.
- **להימנע משמות מובנים.** `list`, `str`, `sum`, `max`, `id` ו-`len` הן טעויות נפוצות.

השוו בין שתי גרסאות של אותו קוד:

```python
def f(l, d):
    return l * d

def calculate_total_price(unit_price, quantity):
    return unit_price * quantity
```

שתיהן עושות את אותו דבר. השנייה אומרת לקורא הבא מה המספרים מייצגים, וזו בדיוק המטרה של שם.

ל-Python יש גם מילים שמורות, שאי אפשר להשתמש בהן כשמות. `class` היא אחת מהן:

```python
import keyword
print(keyword.iskeyword("class"), keyword.iskeyword("name"))
```

```text
True False
```

הניסיון `class = 1` מחזיר `SyntaxError: invalid syntax`.

## טעויות נפוצות

- **הנחה שהשמה משנה את המשתנה החיצוני.** בתוך פונקציה היא יוצרת שם מקומי חדש, אלא אם משתמשים ב-`global` או ב-`nonlocal`.
- **שימוש ב-`global` כברירת מחדל.** זה עובד, אבל זה מסתיר מאיפה הערכים מגיעים. מעבירים ערכים פנימה ומחזירים את התוצאה.
- **שמות קצרים שמסתירים משמעות.** `d` יכול להיות תאריך, מילון או כלב. נותנים שם לפי מה שהוא מחזיק.

## מה הלאה

הצעד הבא בסדרה: `TypeError`, השגיאה הנפוצה ביותר כשלערך יש טיפוס לא נכון, ואיך בודקים טיפוסים.
