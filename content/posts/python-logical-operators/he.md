---
title: "אופרטורים לוגיים ב-Python: and, or, not"
summary: "איך and, or ו-not מחברים תנאים ב-Python: טבלאות אמת, הערכה מקוצרת, למה and ו-or מחזירים את אחד האופרנדים, סדר קדימויות, שרשור השוואות, ו-any() ו-all()."
date: 2026-10-13
tags: [python, tutorial]
series: { key: python, order: 16 }
---

השוואה אחת עונה על שאלה אחת: האם המשתמש בגיר? תנאים אמיתיים שואלים לעיתים קרובות כמה שאלות בבת אחת: האם המשתמש בגיר **וגם** יש לו כרטיס? ל-Python יש לזה שלושה אופרטורים לוגיים: `and`, `or` ו-`not`. אלה מילים, לא סימנים כמו `&&` ו-`||` בשפות אחרות.

כל דוגמה כאן הורצה עם Python 3.13. ההתנהגות נבדקה מול [התיעוד של פעולות בוליאניות](https://docs.python.org/3/reference/expressions.html#boolean-operations) ו[התיעוד של בדיקת ערך אמת](https://docs.python.org/3/library/stdtypes.html#truth-value-testing).

## שלושת האופרטורים

- ‏`a and b` אמיתי כש**שני** הצדדים אמיתיים.
- ‏`a or b` אמיתי כש**לפחות** צד אחד אמיתי.
- ‏`not a` הופך את הערך.

```python
age = 25
has_ticket = True
print(age >= 18 and has_ticket)
print(age < 12 or age > 65)
print(not has_ticket)
```

```text
True
False
False
```

אלה כל ארבעת הצירופים של שני ערכים:

```python
for a in (True, False):
    for b in (True, False):
        print(a, b, a and b, a or b)
```

```text
True True True True
True False False True
False True False True
False False False False
```

‏`and` הוא `True` רק בשורה הראשונה. ‏`or` הוא `False` רק בשורה האחרונה.

הם הופכים משפטי `if` מקוננים לשטוחים יותר. בדיקת הכרטיס מ[הפוסט הקודם](he/posts/python-if-else/) הופכת ל:

```python
age = 20
has_ticket = True
if age >= 18 and has_ticket:
    print("Come in")
```

```text
Come in
```

## הערכה מקוצרת

Python מחשבת משמאל לימין ועוצרת ברגע שהתשובה ידועה. אם הצד השמאלי של `and` שקרי, התוצאה שקרית, ולכן הצד הימני לא רץ בכלל. אם הצד השמאלי של `or` אמיתי, הצד הימני לא רץ:

```python
def check(label, result):
    print("checking", label)
    return result

print(check("a", False) and check("b", True))
print(check("c", True) or check("d", True))
```

```text
checking a
False
checking c
True
```

‏`b` ו-`d` לא נבדקו אף פעם. זה שימושי כשומר: שמים את הבדיקה הבטוחה ראשונה, והבדיקה המסוכנת רצה רק כשזה בטוח:

```python
items = []
if items and items[0] == "x":
    print("starts with x")
else:
    print("empty or not x")

count = 0
total = 10
if count != 0 and total / count > 2:
    print("big")
print("no ZeroDivisionError")
```

```text
empty or not x
no ZeroDivisionError
```

‏`items[0]` על רשימה ריקה היה מעלה `IndexError`, ו-`total / count` היה מעלה `ZeroDivisionError`. אף אחד מהם לא רץ, כי הצד השמאלי כבר שקרי.

## and ו-or מחזירים ערך, לא רק True או False

התיעוד מדויק: `x and y` מחזיר את `x` אם `x` שקרי, ואחרת את `y`. ‏`x or y` מחזיר את `x` אם `x` אמיתי, ואחרת את `y`. הם מחזירים את אחד האופרנדים, לא בהכרח `bool`:

```python
print(0 and 5, 3 and 5, 0 or 5, 3 or 5)
print("" or "guest", [] or "empty", None and 1)
print(not "", not "hi", not 0)
```

```text
0 5 5 3
guest empty None
True False True
```

‏`not` שונה: הוא תמיד מחזיר `True` או `False`.

זה הופך את `or` לנוח לערכי ברירת מחדל. תשובה ריקה מ-`input()` היא שקרית, ולכן `or` מחליף אותה. כאן המשתמש לחץ Enter בלי להקליד כלום:

```python
name = input("Name: ") or "guest"
print("Hello", name)
```

```text
Name: 
Hello guest
```

זהירות עם מספרים: `count or 10` מחליף גם `0` אמיתי. כש-`0` הוא ערך תקין, כותבים `10 if count is None else count`.

## סדר קדימויות

‏`not` נקשר הכי חזק, אחריו `and`, ואחריו `or`. שלושתם באים אחרי השוואות, ולכן `age >= 18 and has_ticket` לא צריך סוגריים:

```python
print(True or False and False)
print((True or False) and False)
print(not 1 == 2)
```

```text
True
False
True
```

השורה הראשונה היא `True or (False and False)`. כשמערבבים `and` ו-`or`, כדאי להוסיף סוגריים גם כשלא חייבים. מי שקורא את הקוד לא צריך לזכור את הטבלה.

מלכודת נפוצה היא השוואה של משתנה אחד לשני ערכים:

```python
x = 5
print(x == 3 or 4)
print(x == 3 or x == 4)
print(x in (3, 4))
```

```text
4
False
False
```

‏`x == 3 or 4` פירושו `(x == 3) or 4`. ההשוואה שקרית, אז `or` מחזיר `4`, שהוא ערך אמיתי. ‏`if` עם התנאי הזה ירוץ תמיד. חוזרים על ההשוואה, או עדיף, משתמשים ב-`in`.

## שרשור השוואות

לטווח, Python מאפשרת לשרשר השוואות במקום לחבר אותן עם `and`:

```python
x = 15
print(10 < x < 20)
print(10 < x and x < 20)
```

```text
True
True
```

שתי השורות אומרות אותו דבר. הגרסה המשורשרת קצרה יותר ונקראת כמו מתמטיקה.

דוגמה אמיתית שמשתמשת בכל מה שראינו עד עכשיו: כלל השנה המעוברת בלוח הגרגוריאני. שנה היא מעוברת אם היא מתחלקת ב-4, חוץ משנים שמתחלקות ב-100, אלא אם הן מתחלקות גם ב-400:

```python
def is_leap(year):
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)

print(is_leap(2024), is_leap(1900), is_leap(2000), is_leap(2026))
```

```text
True False True False
```

הסוגריים חשובים כאן. ‏`%` הוא אופרטור השארית, שמקבל [פוסט משלו בהמשך הסדרה](he/posts/python-modulo/).

## any() ו-all()

כשיש הרבה תנאים, הפונקציות המובנות `any()` ו-`all()` הן ה-`or` וה-`and` של אוסף שלם:

```python
scores = [72, 88, 95]
print(any(s > 90 for s in scores), all(s > 70 for s in scores))
print(all([]), any([]))
```

```text
True True
True False
```

‏`any` מחזירה `True` אם לפחות פריט אחד אמיתי. ‏`all` מחזירה `True` אם כל הפריטים אמיתיים. שימו לב למקרים הריקים: `all([])` הוא `True` ו-`any([])` הוא `False`. שתיהן עוצרות מוקדם, כמו `and` ו-`or`. ראו את התיעוד של [`any()`](https://docs.python.org/3/library/functions.html#any) ושל [`all()`](https://docs.python.org/3/library/functions.html#all).

## טעויות נפוצות

- **כתיבת `&&`, `||` או `!`.** אלה משפות אחרות. ‏Python משתמשת ב-`and`, `or` ו-`not`. ‏`!x` הוא `SyntaxError`.
- **שימוש ב-`&` ו-`|` במקום `and` ו-`or`.** ‏`&` ו-`|` הם אופרטורים על ביטים. ‏`1 & 2` הוא `0`, בעוד `1 and 2` הוא `2`. הם גם לא עוצרים מוקדם.
- **`x == 3 or 4`.** זה תמיד אמיתי. כותבים `x == 3 or x == 4`, או `x in (3, 4)`.
- **הבדיקה המסוכנת ראשונה.** ‏`items[0] == "x" and items` נכשל על רשימה ריקה. שמים את השומר לפני הבדיקה.
- **שימוש ב-`or` לברירת מחדל כש-`0` או `""` תקינים.** ‏`or` מחליף כל ערך שקרי, לא רק `None`.

## מה הלאה

הצעד הבא בסדרה: בלוקים של קוד ו-scope, שמסביר אילו משתנים נראים בתוך `if`, בתוך לולאה ובתוך פונקציה.
