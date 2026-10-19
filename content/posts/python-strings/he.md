---
title: "מחרוזות ב-Python: חיתוך, מתודות ומניפולציה"
summary: "מחרוזות ב-Python: גרשיים ותווי בריחה, מחרוזות raw ומחרוזות בשלושה גרשיים, אינדקסים וחיתוך, שינוי בלתי אפשרי, והמתודות הנפוצות לשינוי, פיצול וחיפוש טקסט."
date: 2026-10-11
tags: [python]
series: { key: python, order: 4 }
---

מחרוזת (`str`) היא טקסט. ל-Python יש הרבה כלים לעבודה עם טקסט, ורובם מובנים כמתודות על המחרוזת עצמה.

כל דוגמת קוד כאן הורצה עם Python 3.13, וההתנהגות נבדקה מול [המדריך הרשמי](https://docs.python.org/3/tutorial/introduction.html) ומול [התיעוד של מתודות המחרוזות](https://docs.python.org/3/library/stdtypes.html#string-methods).

## כתיבת מחרוזות

גרשיים בודדים וכפולים נותנים את אותה תוצאה. כדי לשים גרש בתוך מחרוזת, בורחים ממנו עם לוכסן הפוך או משתמשים בסוג הגרש השני:

```python
print('He said "hi"')
print("It's fine")
print("Tab\there")
```

```text
He said "hi"
It's fine
Tab	here
```

מחרוזת raw, עם `r` לפני הגרשיים, שומרת את הלוכסנים הפוכים כמו שהם. זה שימושי לנתיבים של Windows ולביטויים רגולריים:

```python
print(r"C:\new\folder")
```

```text
C:\new\folder
```

שלושה גרשיים (`"""` או `'''`) מאפשרים שבירת שורה:

```python
print("""multi
line""")
```

```text
multi
line
```

שני literals של מחרוזת שכתובים אחד ליד השני מתחברים אוטומטית. זה עובד רק בין literals, לא בין משתנים.

## אינדקסים וחיתוך

לכל תו יש אינדקס. הראשון הוא `0`, ואינדקסים שליליים סופרים מהסוף:

```python
s = "Hello, World"
print(s[0], s[-1])
```

```text
H d
```

חיתוך `s[start:end]` לוקח תווים מ-`start` עד `end`, בלי לכלול את `end`:

```python
print(s[0:5])
print(s[7:])
print(s[::-1])
```

```text
Hello
World
dlroW ,olleH
```

`s[::-1]` לוקח כל תו בצעד של -1, וזה הופך את המחרוזת.

`len()` מחזירה את מספר התווים:

```python
print(len(s))
```

```text
12
```

## מחרוזות אינן ניתנות לשינוי

אפשר לקרוא תו, אבל אי אפשר לשנות תו במקום:

```python
t = "immutable"
t[0] = "I"
```

```text
TypeError: 'str' object does not support item assignment
```

גם מתודות לא משנות את המחרוזת המקורית. הן מחזירות מחרוזת חדשה, ולכן צריך לשמור את התוצאה (`s = s.upper()`):

```python
s = "Hello, World"
s.upper()
print(s)
print(s.upper())
```

```text
Hello, World
HELLO, WORLD
```

## שינוי טקסט

```python
print(s.lower(), s.upper())
print(s.replace("World", "Python"))
print("hello world".title(), "hello".capitalize())
print("  padded  ".strip() + "|")
print("ab" * 3)
```

```text
hello, world HELLO, WORLD
Hello, Python
Hello World Hello
padded|
ababab
```

- `replace(old, new)` מחליפה את כל ההופעות.
- `strip()` מסירה רווחים משני הקצוות. `lstrip()` ו-`rstrip()` עובדות בצד אחד.
- `*` משכפל מחרוזת.

## פיצול וחיבור

`split()` הופכת מחרוזת לרשימה, ו-`join()` עושה את ההפך, ומשתמשת במחרוזת שעליה היא נקראת כמפריד:

```python
print("a,b,c".split(","))
print("-".join(["2026", "10", "11"]))
```

```text
['a', 'b', 'c']
2026-10-11
```

## חיפוש

`find()` מחזירה את האינדקס של ההופעה הראשונה, או `-1` אם אין כזו. `index()` מחזירה את אותו אינדקס, אבל כשאין התאמה היא זורקת שגיאה:

```python
print(s.find("World"), s.find("xyz"))
print(s.count("l"))
print(s.startswith("Hell"), s.endswith("!"))
```

```text
7 -1
3
True False
```

```python
s.index("xyz")
```

```text
ValueError: substring not found
```

משתמשים ב-`find()` כשזה רגיל שהערך חסר, וב-`index()` כשהיעדר שלו הוא שגיאה.

## ריפוד ובדיקת תוכן

```python
print("42".zfill(5), "7".rjust(3, "0"))
print("abc".isalpha(), "123".isdigit())
```

```text
00042 007
True True
```

`zfill()` ו-`rjust()` ממלאים עד רוחב מסוים. הארגומנט השני של `rjust()` הוא תו המילוי, אם לא רוצים רווחים.

## מה הלאה

בפוסט הבא: f-strings, שמכניסים ערכים ופורמט של מספרים לתוך מחרוזת.
