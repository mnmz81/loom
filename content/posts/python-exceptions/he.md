---
title: "חריגות ב-Python: ‏try, ‏except, ‏else, ‏finally"
summary: "מה קורה כש-Python נתקלת בשגיאה בזמן ריצה: קריאת traceback, תפיסת שגיאות עם try/except, ‏else ו-finally, העלאת חריגות משלכם, ולמה except ריק הוא מלכודת."
date: 2026-10-13
updated: 2026-10-19
tags: [python]
series: { key: python, order: 28 }
---

‏`IndexError`, ‏`KeyError`, ‏`ValueError` ו-`TypeError` עצרו את התוכנית בפוסטים הקודמים, ו[הפוסט על TypeError](he/posts/python-type-errors-and-checking/) הראה `try`/`except` ראשון. המדריך הרשמי מנסח את זה כך: "Errors detected during execution are called exceptions and are not unconditionally fatal".

כל הדוגמאות הורצו עם Python 3.13 ונבדקו מול [המדריך הרשמי על שגיאות וחריגות](https://docs.python.org/3/tutorial/errors.html) ו[התיעוד של החריגות המובנות](https://docs.python.org/3/library/exceptions.html).

## קריאת traceback

כשאף אחד לא מטפל בחריגה, Python מדפיסה *traceback* ועוצרת. קוראים אותו מלמטה למעלה: השורה האחרונה אומרת מה השתבש, והשורות שמעליה אומרות איפה:

```python
def average(numbers):
    return sum(numbers) / len(numbers)

print(average([]))
```

```text
Traceback (most recent call last):
  File "app.py", line 4, in <module>
    print(average([]))
          ~~~~~~~^^^^
  File "app.py", line 2, in average
    return sum(numbers) / len(numbers)
           ~~~~~~~~~~~~~^~~~~~~~~~~~~~
ZeroDivisionError: division by zero
```

המסגרת שממש מעל השורה האחרונה היא השורה שנכשלה, בתוך `average`, ומעליה הקריאה שהובילה לשם. הסימנים `~` ו-`^` מצביעים על החלק המדויק בשורה.

## ‏try ו-except

שמים קוד שעלול להיכשל בבלוק `try`. אם קורית חריגה מהסוג שכתוב ב-`except`, ‏Python קופצת לבלוק ה-`except` במקום לעצור:

```python
text = "12a"
try:
    number = int(text)
    print("parsed", number)
except ValueError:
    print("not a whole number:", text)
print("still running")
```

```text
not a whole number: 12a
still running
```

שאר בלוק ה-`try` מדולג ברגע שקורית חריגה, אז `print("parsed", ...)` לא רץ אף פעם.

‏`except ValueError as e` נותן שם לאובייקט החריגה. ‏`str(e)` הוא ההודעה שלה:

```python
try:
    int("12a")
except ValueError as e:
    print("error:", e)
    print(type(e).__name__)
```

```text
error: invalid literal for int() with base 10: '12a'
ValueError
```

## תפיסה של כמה סוגים

ל-`try` יכולים להיות כמה בלוקים של `except`. ‏Python בודקת אותם לפי הסדר ומריצה את הראשון שמתאים. ‏`except` אחד יכול גם לקבל tuple של סוגים:

```python
def safe_ratio(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "can't divide by zero"
    except (TypeError, ValueError) as e:
        return f"bad input: {e}"

print(safe_ratio(6, 3))
print(safe_ratio(6, 0))
print(safe_ratio(6, "3"))
```

```text
2.0
can't divide by zero
bad input: unsupported operand type(s) for /: 'int' and 'str'
```

סוג חריגה תופס גם את תתי-הסוגים שלו. ‏`LookupError` תופס גם `IndexError` וגם `KeyError`, כי שניהם סוגים של שגיאות חיפוש. עץ המשפחה המלא נמצא בסוף [התיעוד של החריגות המובנות](https://docs.python.org/3/library/exceptions.html#exception-hierarchy).

## ‏else ו-finally

‏`else` רץ רק אם בלוק ה-`try` הסתיים בלי חריגה. ‏`finally` רץ בכל מקרה: אחרי הצלחה, אחרי חריגה שטופלה, ואפילו כשחריגה עולה הלאה למי שקרא לפונקציה. זה המקום לניקוי:

```python
def read_number(text):
    try:
        value = int(text)
    except ValueError:
        print("bad:", text)
    else:
        print("good:", value)
    finally:
        print("done with", repr(text))

read_number("7")
read_number("x")
```

```text
good: 7
done with '7'
bad: x
done with 'x'
```

למה `else` ולא פשוט עוד שורות בתוך ה-`try`? קוד ב-`else` לא מוגן על ידי ה-`except`, אז שגיאה לא צפויה שם לא מוסתרת. שומרים את בלוק ה-`try` קטן, רק השורה שעלולה להיכשל.

בקבצים, `with open(...)` כבר עושה את הניקוי ש-`finally` היה עושה, וסוגר את הקובץ גם כשקורית חריגה.

## העלאת חריגות משלכם

עם `raise` מעלים חריגה בעצמכם, למשל כשפונקציה מקבלת ערך שהיא לא יכולה לעבוד איתו. בוחרים את הסוג המובנה שמתאים, כדי שמי שקורא יוכל לתפוס בדיוק אותו, וכותבים הודעה שאומרת מה לא היה בסדר:

```python
def set_age(age):
    if age < 0:
        raise ValueError(f"age can't be negative: {age}")
    return age

try:
    set_age(-3)
except ValueError as e:
    print(e)
```

```text
age can't be negative: -3
```

בתוך בלוק `except`, ‏`raise` לבד מעלה מחדש את אותה חריגה, אחרי שרשמתם אותה ללוג או הוספתם פרטים. לסוגי שגיאה משלכם מגדירים מחלקה שיורשת מ-`Exception`. מחלקות הן נושא לפוסט אחר, אבל הצורה קצרה: `class OutOfStock(Exception): pass`.

## לא תופסים הכול

‏`except:` ריק או `except Exception:` תופסים כל שגיאה, כולל שגיאות הקלדה שלכם:

```python
prices = {"tea": 12}
try:
    total = prices["tea"] * quantty
except Exception:
    total = 0
print(total)
```

```text
0
```

‏`quantty` הוא שם עם שגיאת כתיב, אז השגיאה האמיתית היא `NameError`. ה-`except` הסתיר אותה, והתוכנית המשיכה עם סכום שגוי. תופסים את החריגות הספציפיות שמצפים להן (כאן, `KeyError` למוצר שלא קיים), ונותנים לכל השאר להיכשל בגלוי.

## טעויות נפוצות

- **תפיסה במקום בדיקה פשוטה.** ‏`if key in d` ברור יותר מתפיסת `KeyError` בחיפוש פשוט. משתמשים ב-`try` כשבדיקה מראש מסורבלת, כמו בפענוח מספר.
- **סדר שגוי של בלוקי `except`.** סוג רחב לפני סוג צר תופס הכול קודם. ‏`KeyError` בא לפני `LookupError`.

## מה הלאה

הצעד הבא בסדרה: המודול `random`, למספרים אקראיים ולבחירת פריטים.
