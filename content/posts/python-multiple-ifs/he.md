---
title: "כמה משפטי if ברצף"
summary: "כמה משפטי if נפרדים ברצף נבדקים כולם, בניגוד לשרשרת if/elif שנעצרת בהתאמה הראשונה. מתי להשתמש בכל אחד, והבאגים שנובעים מבלבול ביניהם."
date: 2026-10-19
tags: [python]
series: { key: python, order: 13 }
---

שרשרת `if`/`elif`/`else` ([פוסט על תנאים](he/posts/python-if-else/)) בוחרת ענף אחד. אבל אפשר גם לכתוב כמה משפטי `if` נפרדים אחד אחרי השני. הם נראים דומים ומתנהגים שונה מאוד.

כל דוגמה הורצה עם Python 3.13, ונבדקה מול [החלק על משפטי `if` במדריך הרשמי](https://docs.python.org/3/tutorial/controlflow.html#if-statements) ו[התיעוד של `if`](https://docs.python.org/3/reference/compound_stmts.html#the-if-statement).

## כל if נבדק

כל `if` פותח החלטה חדשה ועצמאית. Python בודקת את התנאי שלו בלי קשר למה שה-`if` הקודמים עשו:

```python
age = 70
has_card = True

if age >= 65:
    print("senior discount")
if has_card:
    print("member discount")
if age < 18:
    print("child ticket")
```

```text
senior discount
member discount
```

שניים מתוך שלושת התנאים נכונים, ולכן מודפסות שתי הודעות. יכולים לרוץ אפס בלוקים, אחד או כולם.

## אותו קלט עם elif

אם מחליפים את ה-`if` השני והשלישי ב-`elif`, השרשרת נעצרת בתנאי הנכון הראשון:

```python
if age >= 65:
    print("senior discount")
elif has_card:
    print("member discount")
elif age < 18:
    print("child ticket")
```

```text
senior discount
```

‏`has_card` נכון, אבל Python אפילו לא מסתכלת עליו, כי הענף הראשון כבר רץ. זה כל ההבדל:

| | משפטי `if` נפרדים | שרשרת `if` / `elif` |
|---|---|---|
| תנאים שנבדקים | כולם | עד התנאי הנכון הראשון |
| בלוקים שיכולים לרוץ | אפס, חלק או כולם | לכל היותר אחד |
| מתאים ל | שאלות בלתי תלויות | בחירה אחת מתוך כמה |

## שאלות בלתי תלויות: if נפרדים

משתמשים ב-`if` נפרדים כשכל תנאי הוא שאלה בפני עצמה, ואפשר שכמה תשובות יהיו "כן" יחד. בדיקת סיסמה מתאימה לזה, כי כל כלל הוא בעיה נפרדת שצריך לדווח עליה:

```python
password = "abc"
problems = []

if len(password) < 8:
    problems.append("shorter than 8 characters")
if not any(ch.isdigit() for ch in password):
    problems.append("no digit")
if password.lower() == password:
    problems.append("no uppercase letter")

print(problems)
```

```text
['shorter than 8 characters', 'no digit', 'no uppercase letter']
```

עם `elif` היינו מקבלים רק את הבעיה הראשונה, והמשתמש היה מתקן אותן אחת-אחת.

## בחירה אחת: elif

משתמשים ב-`elif` כשהתנאים שוללים זה את זה, כמו טווחי הציונים. עם `if` נפרדים, הבדיקות המאוחרות רצות גם אחרי התאמה, והתוצאה נדרסת:

```python
score = 95

if score >= 90:
    grade = "A"
if score >= 80:
    grade = "B"
if score >= 70:
    grade = "C"
print(grade)
```

```text
C
```

‏`95` עובר את שלוש הבדיקות, וההשמה האחרונה מנצחת. אם מחליפים את ה-`if` השני והשלישי ב-`elif`, התוצאה היא `"A"`.

## הסדר חשוב כשהבלוקים משנים משתנה

משפטי `if` נפרדים רצים מלמעלה למטה, ולכן בלוק יכול לשנות משהו שתנאי מאוחר יותר בודק:

```python
price = 100
is_member = True
coupon = True

if is_member:
    price = price * 0.9
if coupon:
    price = price - 15
if price < 80:
    print("free shipping")
print(price)
```

```text
free shipping
75.0
```

הנחת החבר מורידה את `100` ל-`90.0`, הקופון מוריד ל-`75.0`, ורק אז ה-`if` האחרון רואה מחיר מתחת ל-80. אם מחליפים בין שני ה-`if` הראשונים, המחיר הסופי משתנה (`100 - 15 = 85`, ואז `76.5`), כך שהסדר הוא חלק מהתוכנית.

## טעויות נפוצות

- **`if` נפרד איפה שהתכוונתם ל-`elif`.** ציונים, טווחים ושאלות "איזה גודל" דורשים `elif`. התסמין: למשתנה יש את הערך של הבדיקה האחרונה שהתאימה.
- **`elif` איפה שהתכוונתם ל-`if` נפרד.** התסמין: כלל אחד אף פעם לא מופעל, כי כלל קודם כבר התאים.
- **`else` ששייך רק ל-`if` האחרון.** ב-`if a: ... if b: ... else: ...` ה-`else` משויך ל-`if b`, לא לשניהם. כדי לטפל ב"אף אחד מהם", כותבים שרשרת אחת, או `if not (a or b):`.

## מה הלאה

הפוסט הבא: האופרטורים הלוגיים `and`, `or` ו-`not`, שמחברים כמה תנאים ל-`if` אחד.
