---
title: "המרת טיפוסים ב-Python"
summary: "איך ממירים בין טיפוסים ב-Python עם int(), float(), str(), bool(), list(), tuple() ו-set(): מה כל המרה עושה, קיצוץ, בסיסים, אמת ושקר, ושגיאות כשההמרה נכשלת."
date: 2026-10-11
tags: [python]
series: { key: python, order: 7 }
---

Python כמעט לא ממירה טיפוסים בשבילכם. `"5" + 1` היא שגיאה, ולא `6`. כשצריך מספר מטקסט, או טקסט ממספר, קוראים לפונקציית המרה בעצמכם. לפונקציות יש את אותם שמות כמו הטיפוסים, כך ש-`int("5")` בונה int מהמחרוזת "5".

כל דוגמה כאן הורצה עם Python 3.13. ההתנהגות נבדקה מול [התיעוד הרשמי של `int()` ופונקציות קשורות](https://docs.python.org/3/library/functions.html#int).

## מטקסט למספר

`int()` ו-`float()` קוראות מחרוזת ומחזירות מספר:

```python
print(int("42"), int("-7"), int("  8  "))
print(float("3.5"), float("1e3"))
```

```text
42 -7 8
3.5 1000.0
```

`int` מתעלמת מרווחים בשני הקצוות של הטקסט. באמצע מותרות רק ספרות (וסימן אופציונלי).

מעבירים ל-`int` ארגומנט שני כדי לקרוא בבסיס אחר. לפי התיעוד, הבסיסים המותרים הם 0 ו-2 עד 36:

```python
print(int("ff", 16), int("1010", 2))
```

```text
255 10
```

## ממספר לטקסט

`str()` הופכת כל ערך לטקסט. משתמשים בה כשרוצים לחבר טקסט ומספר עם `+`:

```python
print(str(42) + "!")
print(str(3.0), str(True))
```

```text
42!
3.0 True
```

אפשר גם לכתוב `f"{age}"`, ולרוב זה ברור יותר (ראו את הפוסט על f-strings).

## מ-float ל-int: קיצוץ

`int()` על float חותך את החלק העשרוני, לכיוון האפס:

```python
print(int(3.9), int(-3.9))
```

```text
3 -3
```

זה לא עיגול. כדי לעגל משתמשים קודם ב-`round()`, ואם צריך int ממירים אחר כך. `round()` מוסברת בפוסט על פעולות מספריות.

## True ו-False כמספרים

`bool` היא תת-מחלקה של `int`, ולכן `True` נחשב 1 ו-`False` נחשב 0:

```python
print(int(True) + 1)
```

```text
2
```

## אמת ושקר: bool()

`bool()` מחזירה `True` או `False` לפי בדיקת האמת של הערך. לפי התיעוד: "אם הארגומנט שקרי או לא סופק, מוחזר False; אחרת מוחזר True". הערכים השקריים הם: `0`, `0.0`, `""`, `[]` ו-`None`. כל השאר אמת:

```python
print(bool(0), bool(""), bool([]), bool(None), bool(0.0))
print(bool("0"))
```

```text
False False False False False
True
```

`"0"` היא מחרוזת לא ריקה, ולכן היא אמת, וכך גם `"False"`. הבדיקה עוסקת בריקנות הטקסט, ולא בערך שלו.

## בין סוגי אוספים

`list()`, `tuple()` ו-`set()` הופכות אוסף לאוסף אחר:

```python
print(list("abc"))
print(tuple([1, 2]), set([1, 1, 2]))
```

```text
['a', 'b', 'c']
(1, 2) {1, 2}
```

set מוחק כפילויות.

## כשההמרה נכשלת

יש טקסטים שאי אפשר להפוך למספר. Python מעלה `ValueError`:

```python
int("3.5")
```

```text
ValueError: invalid literal for int() with base 10: '3.5'
```

`"3.5"` הוא מספר עשרוני, ו-`int` לא מקבל אותו. אם רוצים עשרוניים, ממירים עם `float`. מחרוזת ריקה נכשלת באותו אופן:

```python
int("")
```

```text
ValueError: invalid literal for int() with base 10: ''
```

כשהארגומנט הוא מסוג לא מתאים, מקבלים `TypeError`. למשל, `None` אינו טקסט ואינו מספר:

```python
int(None)
```

```text
TypeError: int() argument must be a string, a bytes-like object or a real number, not 'NoneType'
```

בודקים את קלט המשתמש קודם, או תופסים את השגיאה עם `try` ו-`except` ([פוסט על חריגות](he/posts/python-exceptions/)).

## מה הלאה

בפוסט הבא: `input()`, שקוראת טקסט מהמשתמש וצריכה המרת טיפוסים מיד.
