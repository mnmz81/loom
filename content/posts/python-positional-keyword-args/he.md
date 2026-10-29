---
title: "ארגומנטים לפי מיקום ולפי שם ב-Python: ‏*args, ‏**kwargs, ‏/ ו-*"
summary: "איסוף ארגומנטים נוספים עם *args ו-**kwargs, חיוב שמות עם *, איסור שמות עם /, פריסת רשימה או מילון לתוך קריאה, והסדר המלא של הפרמטרים."
date: 2026-10-29
tags: [python]
series: { key: python, order: 24 }
---

[הפוסט על פונקציות](he/posts/python-functions/) העביר ארגומנטים לפי מיקום (`greet("Dana")`) ולפי שם (`greet(name="Dana")`). כברירת מחדל, כל פרמטר מקבל את שתי הדרכים. הפוסט הזה מראה איך פונקציה מקבלת כמה ארגומנטים שרוצים מכל סוג, ואיך היא מחייבת דרך אחת מהשתיים.

כל הדוגמאות הורצו עם Python 3.13 ונבדקו מול הסעיפים במדריך הרשמי על [פרמטרים מיוחדים](https://docs.python.org/3/tutorial/controlflow.html#special-parameters) ועל [פריסת רשימות ארגומנטים](https://docs.python.org/3/tutorial/controlflow.html#unpacking-argument-lists).

## ‏*args: כל מספר של ארגומנטים לפי מיקום

פרמטר שנכתב `*name` אוסף את כל הארגומנטים הנוספים לפי מיקום לתוך tuple. השם `args` הוא רק מוסכמה:

```python
def total(*prices):
    print(type(prices), prices)
    return sum(prices)

print(total())
print(total(5, 2.5, 10))
```

```text
<class 'tuple'> ()
0
<class 'tuple'> (5, 2.5, 10)
17.5
```

בלי ארגומנטים, `prices` הוא tuple ריק, לא שגיאה.

## ‏**kwargs: כל מספר של ארגומנטים לפי שם

‏`**name` אוסף את הארגומנטים הנוספים לפי שם לתוך מילון, משם לערך:

```python
def tag(name, **attrs):
    parts = " ".join(f'{key}="{value}"' for key, value in attrs.items())
    return f"<{name} {parts}>"

print(tag("a", href="/loom/", title="Home"))
```

```text
<a href="/loom/" title="Home">
```

המפתחות הם השמות כפי שנכתבו בקריאה, באותו סדר. פונקציה עם `**kwargs` מקבלת כל שם, אז שגיאת כתיב כמו `titel="Home"` נכנסת בשקט ל-`attrs`. זה המחיר של הגמישות.

## רק לפי שם: פרמטרים אחרי *

פרמטרים שאחרי `*args`, או אחרי `*` בודד, אפשר להעביר רק לפי שם:

```python
def resize(image, *, width, height, keep_ratio=True):
    return f"{image}: {width}x{height}, keep_ratio={keep_ratio}"

print(resize("cat.png", width=800, height=600))
resize("cat.png", 800, 600)
```

```text
cat.png: 800x600, keep_ratio=True
TypeError: resize() takes 1 positional argument but 3 were given
```

ה-`*` הבודד לא אוסף כלום. הוא רק מסמן איפה מתחיל החלק של "רק לפי שם". השתמשו בו כשקריאה עם ערכים חשופים לא הייתה קריאה: `resize("cat.png", 800, 600, False)` שולח את הקורא לבדוק מה `False` אומר. ‏`sorted()` של Python עובדת ככה, ולכן תמיד כותבים `sorted(nums, reverse=True)`.

## רק לפי מיקום: פרמטרים לפני /

פרמטרים שלפני `/` ‏(Python 3.8) אפשר להעביר רק לפי מיקום:

```python
def area(width, height, /):
    return width * height

print(area(2, 3))
area(width=2, height=3)
```

```text
6
TypeError: area() got some positional-only arguments passed as keyword arguments: 'width, height'
```

המדריך הרשמי נותן את הסיבה: כשהפרמטרים הם רק לפי מיקום, אפשר לשנות את השמות שלהם בהמשך בלי לשבור אף קורא, כי אף קורא לא יכול היה להשתמש בשמות. הרבה פונקציות מובנות עובדות ככה: `len(obj=[1])` הוא `TypeError`. זה גם משחרר את השם עבור `**kwargs`:

```python
def describe(name, /, **fields):
    return f"{name}: {fields}"

print(describe("Dana", name="nickname"))
```

```text
Dana: {'name': 'nickname'}
```

בלי ה-`/`, הקריאה הייתה נכשלת עם `got multiple values for argument 'name'`.

## פריסה לתוך קריאה: * ו-**

בקריאה, `*` פורס רשימה או tuple לארגומנטים לפי מיקום, ו-`**` פורס מילון לארגומנטים לפי שם:

```python
pair = (17, 5)
options = {"sep": " | ", "end": "!\n"}

print(divmod(*pair))
print(*["a", "b", "c"], **options)
```

```text
(3, 2)
a | b | c!
```

‏`divmod(*pair)` הוא `divmod(17, 5)`, ושורת ה-`print` היא `print("a", "b", "c", sep=" | ", end="!\n")`. כך הגדרות שנקראו מקובץ הופכות לארגומנטים של פונקציה.

## הסדר המלא

כל הסוגים יחד, בסדר היחיד ש-Python מקבלת:

```python
def full(pos_only, /, normal, *args, kw_only, **kwargs):
    return pos_only, normal, args, kw_only, kwargs

print(full(1, 2, 3, 4, kw_only=5, extra=6))
```

```text
(1, 2, (3, 4), 5, {'extra': 6})
```

קודם רק-לפי-מיקום, אחר כך רגילים, אחר כך `*args` (או `*` בודד), אחר כך רק-לפי-שם, ובסוף `**kwargs`. רוב הפונקציות לא צריכות אף אחד מהסימנים. הוסיפו `/` או `*` כשיש סיבה: שם שאולי ישתנה, או ערכים שצריכים תווית.

## טעויות נפוצות

- **להעביר רשימה במקום שבו `*args` מצפה לפריטים.** ‏`total([1, 2])` נותן `args == ([1, 2],)`, ו-`sum` נכשל. קראו ל-`total(*[1, 2])`.
- **להסתיר שגיאות כתיב עם `**kwargs`.** אם הפונקציה רק מעבירה הלאה כמה אפשרויות ידועות, תנו להן שמות כפרמטרים שהם רק לפי שם.
- **לשכוח ש-`*args` הופך את כל מה שאחריו לרק-לפי-שם.** ב-`def log(*messages, level)`, את `level` אפשר להעביר רק כ-`level="warn"`.

## מה הלאה

הצעד הבא בסדרה: בלוקים של קוד ו-scope: למה משתנה שנוצר בתוך `if` עדיין קיים אחריו, ואילו בלוקים כן יוצרים scope.
