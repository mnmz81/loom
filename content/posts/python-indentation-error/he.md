---
title: "הזחה ב-Python ושגיאת IndentationError"
summary: "איך Python משתמש בהזחה כדי לקבץ קוד, ארבע הודעות IndentationError שתפגשו, למה ערבוב טאבים ורווחים גורם ל-TabError, ואיך מוצאים ומתקנים."
date: 2026-10-11
tags: [python, tutorial]
series: { key: python, order: 5 }
---

ב-Python ההזחה היא חלק מהתחביר. בשפות אחרות משתמשים בסוגריים מסולסלים `{}` כדי לסמן בלוק קוד. ב-Python משתמשים ברווחים בתחילת השורה. התיעוד מתאר את זה כך: "הזחה היא הדרך של Python לקבץ הצהרות". הפוסט הזה מסביר את הכלל, את השגיאות שמופיעות כשהוא נשבר, ואיך לתקן אותן.

כל דוגמה כאן הורצה עם Python 3.13, והכללים נבדקו מול [תיעוד הניתוח הלקסיקלי](https://docs.python.org/3/reference/lexical_analysis.html#indentation) ומול [רשימת החריגות](https://docs.python.org/3/library/exceptions.html#IndentationError).

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

ההודעה מציינת את שורת הכותרת, כך שמוצאים מיד איפה חסרה ההזחה. מזיחים את גוף הבלוק. אם באמת רוצים בלוק ריק, כותבים `pass`:

```python
if 5 > 2:
    pass
```

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

`TabError` היא תת-מחלקה של `IndentationError`. לפי התיעוד, המשמעות של שורה יכולה להיות תלויה ב"ערך של טאב ברווחים". כאן, אם טאב נחשב ל-8 עמודות, 8 הרווחים של השורה השנייה מתיישרים איתו. אם טאב נחשב לעמודה אחת, הם לא מתיישרים. Python לא מנחש, וההגדרה של העורך קובעת מה רואים על המסך. הפתרון: משתמשים ברווחים בלבד. ארבעה רווחים לכל רמה הם המקובל.

כדי למצוא את השורה, אפשר להריץ את הבודק `tabnanny` שמגיע עם Python:

```bash
python3 -m tabnanny demo.py
```

```text
demo.py 3 '        y = 2'
```

הוא מדפיס את השורה הראשונה שבה הטאבים והרווחים לא חד-משמעיים.

## תפיסת השגיאה בקוד

`IndentationError` היא תת-מחלקה של `SyntaxError`, ואפשר לתפוס אותה כמו כל שגיאה אחרת. הפונקציה `compile()` בודקת קוד מקור בלי להריץ אותו:

```python
try:
    compile("if True:\nprint(1)\n", "<demo>", "exec")
except IndentationError as e:
    print(type(e).__name__, e.lineno, e.msg)
```

```text
IndentationError 2 expected an indented block after 'if' statement on line 1
```

בתוכניות רגילות כמעט לא תופסים אותה, כי השגיאה עוצרת את התוכנית לפני שהיא רצה. תראו אותה כשעורכים קובץ, כשעורך או כלי בדיקה קורא אותו, או כשקוד נבנה ממחרוזת.

## טעויות נפוצות

- **העתקת קוד מאתר.** חלק מהאתרים הופכים טאבים לרווחים, או מאבדים את ההזחה. אחרי הדבקה כדאי לבדוק את השורות.
- **ערבוב עורכים.** עורך אחד כותב טאבים ואחר כותב רווחים. קובעים הגדרה אחת לפרויקט.
- **הזחה שגויה ברווח אחד.** שורה עם 3 רווחים ליד שורות עם 4 נותנת "unindent does not match". סופרים את הרווחים, או מציגים רווחים בעורך.

רוב העורכים יכולים להציג תווי רווח ולהמיר טאבים לרווחים, וזו הדרך המהירה ביותר להימנע מכל ארבע השגיאות.

## מה הלאה

הצעד הבא בסדרה: שאר התחביר הבסיסי, ומתחילים בתנאים (`if`, `elif`, `else`).
