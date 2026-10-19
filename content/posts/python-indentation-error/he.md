---
title: "הזחה ב-Python ושגיאת IndentationError"
summary: "איך Python משתמש בהזחה כדי לקבץ קוד, ארבע הודעות IndentationError שתפגשו, למה ערבוב טאבים ורווחים גורם ל-TabError, ואיך מוצאים ומתקנים."
date: 2026-10-11
tags: [python]
series: { key: python, order: 15 }
---

ב-Python ההזחה היא חלק מהתחביר. בשפות אחרות משתמשים בסוגריים מסולסלים `{}` כדי לסמן בלוק קוד. ב-Python משתמשים ברווחים בתחילת השורה. התיעוד מתאר את זה כך: "הזחה היא הדרך של Python לקבץ הצהרות".

כל הדוגמאות הורצו עם Python 3.13 ונבדקו מול [תיעוד הניתוח הלקסיקלי](https://docs.python.org/3/reference/lexical_analysis.html#indentation) ומול [רשימת החריגות](https://docs.python.org/3/library/exceptions.html#IndentationError).

## הכלל

בלוק מתחיל בשורה שמסתיימת בנקודתיים, כמו `if`, `for`, `def` או `while`. השורות ששייכות לבלוק מוזחות יותר משורת הכותרת:

```python
if 5 > 2:
    print("five is bigger")
    print("this is still inside the if")
print("this is outside")
```

```text
five is bigger
this is still inside the if
this is outside
```

לפי התיעוד, כל שורה בבלוק "חייבת להיות מוזחת באותו אופן". ההזחה נגמרת כשהשורה חוזרת לרמה נמוכה יותר.

## שגיאה 1: unexpected indent

זה קורה כששורה מוזחת, אבל אין בלוק שאליו היא שייכת:

```python
print("hi")
    print("oops")
```

```text
  File "demo.py", line 2
    print("oops")
IndentationError: unexpected indent
```

הפתרון: מוחקים את הרווחים העודפים, כך שהשורה תתיישר עם השורה שלפניה.

## שגיאה 2: expected an indented block

הבעיה ההפוכה. שורת הכותרת נגמרת בנקודתיים, אבל השורה שאחריה לא מוזחת:

```python
if 5 > 2:
print("five is bigger")
```

```text
  File "demo.py", line 2
    print("five is bigger")
    ^^^^^
IndentationError: expected an indented block after 'if' statement on line 1
```

מזיחים את גוף הבלוק, או כותבים [`pass`](he/posts/python-if-else/) כשרוצים בלוק ריק.

## שגיאה 3: unindent does not match

שורה חוזרת לרמת הזחה שלא נפתחה בשום בלוק:

```python
if True:
        x = 1
    y = 2
```

```text
  File "demo.py", line 3
    y = 2
         ^
IndentationError: unindent does not match any outer indentation level
```

Python שומר מחסנית של רמות הזחה. הבלוק הראשון נפתח ב-8 רווחים, ולכן השורה עם 4 רווחים לא תואמת אף רמה במחסנית. צריך להתאים אותה לאחת הרמות הקודמות, כאן 0 או 8 רווחים.

## שגיאה 4: TabError

גם טאב וגם רווחים נחשבים להזחה, והרוחב של טאב תלוי בעורך. קובץ שמערבב את השניים עלול להתפרש אחרת בעורך אחר, ולכן Python 3 לא מקבל אותו:

```python
if True:
	x = 1
        y = 2
```

```text
  File "demo.py", line 3
    y = 2
TabError: inconsistent use of tabs and spaces in indentation
```

`TabError` היא תת-מחלקה של `IndentationError`. לפי התיעוד, המשמעות של שורה יכולה להיות תלויה ב"ערך של טאב ברווחים". כאן, אם טאב נחשב ל-8 עמודות, 8 הרווחים של השורה השנייה מתיישרים איתו, ואם הוא נחשב לעמודה אחת, לא. הפתרון: משתמשים ברווחים בלבד. ארבעה רווחים לכל רמה הם המקובל.

הבודק `tabnanny` שמגיע עם Python מדפיס את השורה הראשונה שבה הטאבים והרווחים לא חד-משמעיים:

```bash
python3 -m tabnanny demo.py
```

```text
demo.py 3 '        y = 2'
```

## תפיסת השגיאה בקוד

`IndentationError` היא תת-מחלקה של `SyntaxError`, ותופסים אותה כמו כל שגיאה. `compile()` בודקת קוד מקור בלי להריץ אותו:

```python
try:
    compile("if True:\nprint(1)\n", "<demo>", "exec")
except IndentationError as e:
    print(type(e).__name__, e.lineno, e.msg)
```

```text
IndentationError 2 expected an indented block after 'if' statement on line 1
```

בתוכניות רגילות כמעט לא תופסים אותה, כי היא עוצרת את התוכנית לפני שהיא רצה. היא שימושית כשכלי כמו עורך או linter קורא קובץ, או כשקוד נבנה ממחרוזת.

## טעויות נפוצות

- **העתקת קוד מאתר.** חלק מהאתרים הופכים טאבים לרווחים או מאבדים את ההזחה.
- **ערבוב עורכים.** עורך אחד כותב טאבים ואחר כותב רווחים. קובעים הגדרה אחת לפרויקט.
- **הזחה שגויה ברווח אחד.** שורה עם 3 רווחים ליד שורות עם 4 נותנת "unindent does not match".

עורך שמציג תווי רווח וממיר טאבים לרווחים מונע את כל ארבע השגיאות.

## מה הלאה

הצעד הבא בסדרה: אופרטור השארית `%`, שמופיע בתנאים כל הזמן: זוגי או אי-זוגי, כל פריט N-י, וחזרה להתחלה במעגל.
