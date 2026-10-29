---
title: "לולאות ב-Python: ‏for ו-while"
summary: "להריץ קוד שוב ושוב: for על רשימה או על range, ‏enumerate ו-zip, ‏while, ‏break ו-continue, ‏else על לולאה, והבאגים בלולאות שכולם כותבים פעם אחת."
date: 2026-10-13
tags: [python]
series: { key: python, order: 17 }
---

לולאה מריצה את אותו בלוק קוד שוב ושוב: פעם אחת לכל פריט ב[רשימה](he/posts/python-lists/), פעם אחת לכל מספר בטווח, או כל עוד תנאי מתקיים.

כל הדוגמאות הורצו עם Python 3.13 ונבדקו מול [המדריך הרשמי על בקרת זרימה](https://docs.python.org/3/tutorial/controlflow.html#for-statements) ו[התיעוד של פקודת `for`](https://docs.python.org/3/reference/compound_stmts.html#the-for-statement).

## ‏for: פריט אחד בכל פעם

לפי המדריך הרשמי, `for` ‏"iterates over the items of any sequence (a list or a string), in the order that they appear in the sequence". בכל סיבוב, משתנה הלולאה מחזיק את הפריט הבא:

```python
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(fruit, len(fruit))
print("done")
```

```text
apple 5
banana 6
cherry 6
done
```

הבלוק המוזח הוא גוף הלולאה. ‏`print("done")` לא מוזח, אז הוא רץ פעם אחת, אחרי הלולאה. מחרוזת היא רצף של תווים, אז לולאה על מחרוזת מקבלת תו אחד בכל פעם:

```python
for ch in "hey":
    print(ch.upper())
```

```text
H
E
Y
```

דפוס נפוץ הוא *צובר* (accumulator): משתנה שמתחיל ריק וגדל בכל סיבוב:

```python
scores = [90, 72, 85, 64]
total = 0
passed = []
for score in scores:
    total += score
    if score >= 70:
        passed.append(score)
print(total, passed)
```

```text
311 [90, 72, 85]
```

## ‏range(): לולאה על מספרים

‏`range()` נותן רצף של מספרים שלמים. עם ארגומנט אחד הוא מתחיל ב-0 ועוצר *לפני* הסוף, כמו בחיתוך. עם שניים בוחרים את ההתחלה. ארגומנט שלישי הוא גודל הצעד:

```python
print(list(range(5)))
print(list(range(2, 6)))
print(list(range(10, 0, -3)))

for i in range(3):
    print("attempt", i + 1)
```

```text
[0, 1, 2, 3, 4]
[2, 3, 4, 5]
[10, 7, 4, 1]
attempt 1
attempt 2
attempt 3
```

## ‏enumerate ו-zip

כשצריך גם את המיקום וגם את הפריט, משתמשים ב-`enumerate()` ולא ב-`range(len(items))`. הוא נותן זוגות של אינדקס ופריט, ו-`start` קובע מאיפה מתחילים לספור:

```python
fruits = ["apple", "banana", "cherry"]
for i, fruit in enumerate(fruits, start=1):
    print(f"{i}. {fruit}")
```

```text
1. apple
2. banana
3. cherry
```

‏`i, fruit` מפרק כל זוג, כמו ש-`x, y = point` מפרק tuple. כדי לעבור על שתי רשימות במקביל, משתמשים ב-`zip()`:

```python
names = ["Dana", "Avi", "Noa"]
ages = [31, 25, 40]
for name, age in zip(names, ages):
    print(name, age)
```

```text
Dana 31
Avi 25
Noa 40
```

‏`zip()` עוצר בסוף הרשימה הקצרה ביותר. מ-Python 3.10, ‏`zip(names, ages, strict=True)` מעלה במקום זה `ValueError` כשהאורכים שונים.

## ‏while: לולאה עד שתנאי משתנה

‏`while` בודקת את התנאי לפני כל סיבוב וחוזרת כל עוד הוא אמת, אז היא מתאימה כשלא יודעים מראש כמה סיבובים צריך:

```python
balance = 100
years = 0
while balance < 200:
    balance *= 1.1
    years += 1
print(years, round(balance, 2))
```

```text
8 214.36
```

משהו בגוף חייב לשנות את התנאי, אחרת הלולאה לא נגמרת. בטרמינל, `Ctrl+C` עוצר תוכנית תקועה.

## ‏break ו-continue

‏`break` יוצא מהלולאה מיד. ‏`continue` מדלג על שאר הסיבוב הנוכחי וממשיך לסיבוב הבא:

```python
for n in [4, 7, -1, 9, 0, 3]:
    if n < 0:
        continue
    if n == 0:
        break
    print(n)
```

```text
4
7
9
```

ל-`3` לא מגיעים, כי `break` מסיים את הלולאה ב-`0`. שניהם עובדים גם בלולאות `while`.

לולאה שעוצרת באמצע נכתבת לרוב כ-`while True` עם `break`, למשל "לשאול שוב עד שהתשובה תקינה":

```python
attempts = ["", "abc", "42"]
while True:
    answer = attempts.pop(0)
    if answer.isdigit():
        break
    print("not a number:", repr(answer))
print("got", int(answer))
```

```text
not a number: ''
not a number: 'abc'
got 42
```

בתוכנית אמיתית, `answer = input("Number: ")` היה בא במקום `attempts.pop(0)`.

## ‏else על לולאה

ללולאה יכול להיות בלוק `else`. הוא רץ כשהלולאה מסתיימת כרגיל, ומדולג כשהיא מסתיימת ב-`break`. זה מתאים לחיפושים:

```python
for n in [3, 9, 15]:
    if n % 2 == 0:
        print("found an even number:", n)
        break
else:
    print("no even numbers")
```

```text
no even numbers
```

קראו את ה-`else` כ"לא היה break". הוא מבלבל הרבה מתכנתי Python, אז משתמשים בו כשהוא מקצר את הקוד, ובמשתנה דגל כשלא.

## טעויות נפוצות

- **שינוי רשימה תוך כדי לולאה עליה.** הסרת פריטים מהרשימה שעליה רצה הלולאה גורמת לדילוג על פריטים. עוברים על עותק (`for x in items[:]`) או בונים רשימה חדשה.
- **ציפייה ש-`for` ייצור scope חדש.** משתנה הלולאה עדיין קיים אחרי הלולאה, עם הערך האחרון שלו. ‏[הפוסט על בלוקים של קוד](he/posts/python-code-blocks-scope/) מסביר למה.

## מה הלאה

הצעד הבא בסדרה: מבט מקרוב על `range()`, האובייקט שמאחורי רוב לולאות ה-`for` על מספרים.
