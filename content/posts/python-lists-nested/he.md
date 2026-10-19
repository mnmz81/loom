---
title: "אינדקסים ברשימות, IndexError ורשימות מקוננות"
summary: "למה האינדקס הוא בעצם היסט (offset), למה מקבלים IndexError, איך נשארים בתוך הגבולות, בניית רשימה עם append() בלולאה, ורשימות בתוך רשימות."
date: 2026-10-19
tags: [python]
series: { key: python, order: 11 }
---

ה[פוסט על רשימות](he/posts/python-lists/) הראה את היסודות. כאן נסביר מה בעצם המספר שבתוך הסוגריים המרובעים, מהי השגיאה שהוא גורם לה הכי הרבה, ומה עושים כשרשימה מחזיקה רשימות אחרות.

כל דוגמה הורצה עם Python 3.13. ההתנהגות נבדקה מול [החלק על רשימות במדריך הרשמי](https://docs.python.org/3/tutorial/introduction.html#lists) ו[התיעוד של פעולות משותפות לרצפים](https://docs.python.org/3/library/stdtypes.html#common-sequence-operations).

## האינדקס הוא היסט

האינדקס הוא לא המקום של הפריט בתור. הוא ה**היסט** (offset): כמה צעדים צריך לזוז מתחילת הרשימה. הפריט הראשון רחוק 0 צעדים, ולכן האינדקס שלו הוא `0`:

```python
letters = ["a", "b", "c", "d"]
for offset in range(len(letters)):
    print(offset, letters[offset])
```

```text
0 a
1 b
2 c
3 d
```

לרשימה באורך `n` יש את האינדקסים `0` עד `n - 1`. אינדקס שלילי סופר מהסוף: ‏`-1` הוא צעד אחד אחורה מהסוף, ולכן `letters[-1]` הוא הפריט האחרון.

## IndexError

אינדקס מחוץ לטווח הזה גורם ל-`IndexError`:

```python
print(letters[4])
```

```text
IndexError: list index out of range
```

```python
print(letters[-5])
```

```text
IndexError: list index out of range
```

‏`letters[4]` נכשל כי ההיסטים התקינים נגמרים ב-3. לרשימה ריקה אין אף אינדקס תקין, ולכן `[][0]` ו-`[][-1]` תמיד נכשלים. בגלל זה "הפריט האחרון" ברשימה שאולי ריקה הוא באג קלאסי.

כדי להישאר בתוך הגבולות, בודקים קודם את האורך, או תופסים את השגיאה ([פוסט על חריגות](he/posts/python-exceptions/)):

```python
queue = []
if queue:
    print("next:", queue[0])
else:
    print("queue is empty")

try:
    print(queue[0])
except IndexError:
    print("nothing at offset 0")
```

```text
queue is empty
nothing at offset 0
```

רשימה ריקה נחשבת ל"שקר" בתנאי, ולכן `if queue:` נקרא "אם יש פריטים ברשימה". חיתוך אף פעם לא נכשל: ‏`queue[:1]` הוא `[]` כשהרשימה ריקה.

## בניית רשימה עם append()

‏`append()` משנה את הרשימה במקום ומחזירה `None`. דפוס נפוץ הוא להתחיל מרשימה ריקה ולהוסיף פריט בכל סיבוב של [לולאה](he/posts/python-loops/):

```python
squares = []
for n in range(1, 6):
    squares.append(n * n)
print(squares)
```

```text
[1, 4, 9, 16, 25]
```

הפריט החדש נוחת בהיסט `len(squares)`, אחד אחרי הפריט האחרון הקודם. זה המקום היחיד שאי אפשר להגיע אליו באינדקס: ‏`squares[5] = 36` הוא `IndexError`, ו-`squares.append(36)` עובד.

מכיוון ש-`append()` מחזירה `None`, הטעות הנפוצה הזו מאבדת את הרשימה:

```python
squares = squares.append(36)
print(squares)
```

```text
None
```

## רשימות בתוך רשימות

פריט ברשימה יכול להיות כל ערך, גם רשימה אחרת. רשימה של רשימות היא טבלה: הרשימה החיצונית מחזיקה את השורות, וכל רשימה פנימית היא שורה אחת:

```python
grid = [
    [1, 2, 3],
    [4, 5, 6],
]
print(len(grid), len(grid[0]))
print(grid[1])
print(grid[1][2])
```

```text
2 3
[4, 5, 6]
6
```

‏`grid[1]` היא השורה השנייה, שהיא בעצמה רשימה, ולכן `grid[1][2]` לוקח את ההיסט 2 בתוכה: קודם שורה, אחר כך עמודה. האינדקס יכול להיכשל בכל אחת משתי הרמות:

```python
print(grid[2][0])
```

```text
IndexError: list index out of range
```

```python
print(grid[0][3])
```

```text
IndexError: list index out of range
```

משנים פריט באותם שני אינדקסים: ‏`grid[0][1] = 20`.

כדי לעבור על כל הפריטים משתמשים בלולאה בתוך לולאה. הלולאה החיצונית נותנת כל שורה, והפנימית נותנת כל פריט בשורה:

```python
total = 0
for row in grid:
    for value in row:
        total += value
    print(row, sum(row))
print(total)
```

```text
[1, 2, 3] 6
[4, 5, 6] 15
21
```

כדי לבנות טבלה, מוסיפים שורה בכל סיבוב. חשוב ליצור רשימה פנימית **חדשה** בכל סיבוב:

```python
table = []
for i in range(1, 4):
    row = []
    for j in range(1, 4):
        row.append(i * j)
    table.append(row)
print(table)
```

```text
[[1, 2, 3], [2, 4, 6], [3, 6, 9]]
```

## מלכודת השורה החוזרת

‏`[0] * 3` היא דרך טובה ליצור `[0, 0, 0]`. אבל כפל של רשימה של רשימות לא מעתיק כלום: כל השורות הן אותה רשימה:

```python
bad = [[0] * 3] * 2
bad[0][0] = 9
print(bad)

good = [[0] * 3 for _ in range(2)]
good[0][0] = 9
print(good)
```

```text
[[9, 0, 0], [9, 0, 0]]
[[9, 0, 0], [0, 0, 0]]
```

ב-`bad` יש שני שמות לאותה שורה ([שני שמות, רשימה אחת](he/posts/python-lists/)). ה-`for` שבתוך הסוגריים, שנקרא *list comprehension*, בונה שורה חדשה בכל פעם, ולכן שינוי באחת לא נוגע בשנייה.

## טעויות נפוצות

- **שימוש ב-`len(items)` כאינדקס.** ההיסט האחרון הוא `len(items) - 1`, או `-1`.
- **שורה ועמודה בסדר הפוך.** ‏`grid[row][column]`: האינדקס הראשון בוחר את הרשימה הפנימית.
- **הוספה לרשימה שעוברים עליה בלולאה.** הלולאה ממשיכה למצוא פריטים חדשים. בונים רשימה שנייה במקום.

## מה הלאה

בפוסט הבא: תנאים עם `if`, ‏`elif` ו-`else`, שמחליטים מה להריץ לפי ערכים כמו `len(queue) > 0`.
