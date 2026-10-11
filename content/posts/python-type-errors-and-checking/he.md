---
title: "TypeError ובדיקת טיפוסים ב-Python"
summary: "הודעות TypeError נפוצות ב-Python ומה הן אומרות, בדיקת טיפוסים עם type() ו-isinstance(), למה רמזי טיפוסים לא נאכפים, ומתי לבדוק טיפוס ומתי לתפוס את השגיאה."
date: 2026-10-11
tags: [python, tutorial]
series: { key: python, order: 14 }
---

`TypeError` פירושו שהשתמשתם בערך בצורה שהטיפוס שלו לא תומך בה. התיעוד מתאר אותה כ"פעולה או פונקציה שהופעלה על אובייקט מטיפוס לא מתאים". זו אחת השגיאות הנפוצות ביותר, וההודעה כמעט תמיד אומרת בדיוק מה לא בסדר. הפוסט הזה עובר על ההודעות הרגילות, ואחר כך מראה איך בודקים טיפוס לפני שמשתמשים בערך.

כל דוגמה כאן הורצה עם Python 3.13. ההתנהגות נבדקה מול [התיעוד של `TypeError`](https://docs.python.org/3/library/exceptions.html#TypeError) ו[התיעוד של `isinstance()`](https://docs.python.org/3/library/functions.html#isinstance).

## הודעות TypeError נפוצות

קוראים את השורה האחרונה של השגיאה. היא מציינת את הטיפוסים המעורבים.

**ערבוב טקסט ומספרים:**

```python
"5" + 1
```

```text
TypeError: can only concatenate str (not "int") to str
```

**פונקציה שלא מקבלת את הטיפוס:**

```python
len(5)
```

```text
TypeError: object of type 'int' has no len()
```

**שימוש ב-`None` כערך.** זה קורה לרוב כשפונקציה שכחה `return`:

```python
None + 1
```

```text
TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'
```

**קריאה למשהו שאינו פונקציה:**

```python
x = 5
x()
```

```text
TypeError: 'int' object is not callable
```

**גישה באינדקס למשהו בלי פריטים:**

```python
x = 5
x[0]
```

```text
TypeError: 'int' object is not subscriptable
```

**לולאה על מספר:**

```python
for item in 5:
    pass
```

```text
TypeError: 'int' object is not iterable
```

**מספר ארגומנטים שגוי:**

```python
len()
```

```text
TypeError: len() takes exactly one argument (0 given)
```

**השוואה בין טיפוסים שאי אפשר לסדר:**

```python
3 < "4"
```

```text
TypeError: '<' not supported between instances of 'int' and 'str'
```

הניסוח המדויק משתנה בין גרסאות של Python. סוג השגיאה והרעיון לא משתנים.

## TypeError או ValueError?

התיעוד מבחין בין השתיים. העברת *טיפוס* שגוי, כמו רשימה במקום int, צריכה לתת `TypeError`. העברת טיפוס נכון עם *ערך* לא תקין, כמו `int("abc")`, נותנת `ValueError`.

## בדיקת טיפוס: type() ו-isinstance()

`type()` מחזירה את הטיפוס המדויק של ערך. `isinstance()` שואלת אם ערך הוא מטיפוס מסוים, או מתת-מחלקה שלו:

```python
print(type(5), type(5) == int, type(True) == int)
print(isinstance(5, int), isinstance(True, int), isinstance(5.0, int))
```

```text
<class 'int'> True False
True True False
```

`type(True) == int` הוא `False`, אבל `isinstance(True, int)` הוא `True`, כי `bool` היא תת-מחלקה של `int`. מסיבה זו התיעוד ממליץ על `isinstance()` לבדיקת טיפוסים.

`isinstance` מקבלת tuple, שפירושו "אחד מאלה":

```python
print(isinstance(5, (int, float)), isinstance("5", (int, float)))
```

```text
True False
```

## בדיקה לפני שימוש בערך

פונקציה יכולה לבדוק את הקלט שלה ולהעלות שגיאה ברורה:

```python
def safe_add(a, b):
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        raise TypeError("numbers only")
    return a + b

print(safe_add(1, 2.5))
safe_add(1, "2")
```

```text
3.5
TypeError: numbers only
```

לא להגזים. Python מוגדרת עם טיפוסים דינמיים, ופונקציה שעובדת עם כל ערך שיש לו את ההתנהגות הנכונה לרוב שימושית יותר מפונקציה שמתעקשת על טיפוס אחד.

## לתפוס במקום לבדוק

לפעמים פשוט יותר לנסות ולטפל בכישלון:

```python
def to_number(text):
    try:
        return int(text)
    except ValueError:
        return float(text)

print(to_number("3"), to_number("3.5"))
```

```text
3 3.5
```

## רמזי טיפוסים לא נאכפים

אפשר להוסיף לפונקציה רמזי טיפוסים (type hints):

```python
def double(x: int) -> int:
    return x * 2

print(double(4))
print(double("ab"))
```

```text
8
abab
```

Python מריצה את `double("ab")` בלי בעיה. התיעוד אומר: "סביבת הריצה של Python לא אוכפת הערות טיפוס של פונקציות ומשתנים. אפשר להשתמש בהן בכלים של צד שלישי כמו בודקי טיפוסים, סביבות פיתוח, linters ועוד". בודק כמו mypy היה מסמן את הקריאה השנייה לפני ההרצה. בזמן ריצה הרמזים רק נשמרים:

```python
print(double.__annotations__)
```

```text
{'x': <class 'int'>, 'return': <class 'int'>}
```

## טעויות נפוצות

- **שכחה ש-`input()` מחזירה טקסט.** `input()` נותנת `str`, ולכן ממירים לפני שמחשבים.
- **שימוש ב-`type(x) == int` לבדיקה.** מעדיפים `isinstance(x, int)`, שמקבלת גם תתי-מחלקות.
- **הסתמכות על רמזי טיפוסים כהגנה.** הם עוזרים לעורכים ולבודקים, אבל Python לא עוצרת קריאה שגויה.
- **הדפסה במקום החזרה.** פונקציה שרק מדפיסה מחזירה `None`, והפעולה הבאה עליה נכשלת ב-`TypeError`.

## מה הלאה

הצעד הבא בסדרה: תנאים (`if`, `elif`, `else`), שמשתמשים בכל הערכים והבדיקות מהפוסטים האחרונים.
