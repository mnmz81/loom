---
title: "if, elif, else: תנאים ב-Python"
summary: "איך Python מחליטה איזה קוד להריץ: if, else ו-elif, אופרטורי ההשוואה, ערכים אמיתיים ושקריים, הביטוי המותנה (x if C else y) והצצה ראשונה ל-match."
date: 2026-10-13
tags: [python, tutorial]
series: { key: python, order: 15 }
---

עד עכשיו כל שורה בתוכניות שלנו רצה, מלמעלה למטה. תוכניות אמיתיות מקבלות החלטות: מציגות הודעה אחרת לקטין, מסרבות לסיסמה ריקה, נותנות ציון לפי ניקוד. ב-Python זה התפקיד של משפט `if`. הפוסט הזה מכסה את `if`, `else` ו-`elif`, את אופרטורי ההשוואה שכותבים בתוך תנאי, ואת הביטוי המותנה שנכתב בשורה אחת.

כל דוגמה כאן הורצה עם Python 3.13. ההתנהגות נבדקה מול [הפרק על `if` במדריך הרשמי](https://docs.python.org/3/tutorial/controlflow.html#if-statements), [התיעוד של השוואות](https://docs.python.org/3/reference/expressions.html#comparisons) ו[התיעוד של ביטויים מותנים](https://docs.python.org/3/reference/expressions.html#conditional-expressions).

## משפט if

ל-`if` יש תנאי, נקודתיים ובלוק מוזח. הבלוק רץ רק כשהתנאי אמיתי:

```python
temperature = 31
if temperature > 30:
    print("Hot")
    print("Drink water")
print("Done")
```

```text
Hot
Drink water
Done
```

שתי השורות המוזחות שייכות ל-`if`. ‏`print("Done")` חוזרת לקצה השורה, ולכן היא רצה בכל מקרה. ההזחה היא הדרך של Python לדעת איפה הבלוק נגמר, כמו שמוסבר ב[פוסט על הזחה](he/posts/python-indentation-error/).

## else: הענף השני

`else` רץ כשהתנאי שקרי. אין לו תנאי משלו:

```python
age = 15
if age >= 18:
    print("You can vote")
else:
    print("Too young to vote")
```

```text
Too young to vote
```

בדיוק אחד משני הבלוקים רץ. אף פעם לא שניהם, ואף פעם לא אף אחד.

## elif: יותר משתי אפשרויות

`elif` הוא קיצור של "else if". אפשר לכתוב כמה שצריך, וה-`else` בסוף אופציונלי:

```python
score = 85
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "F"
print(grade)
```

```text
B
```

Python בודקת את התנאים מלמעלה ומריצה את הבלוק **הראשון** שהתנאי שלו אמיתי. השאר מדולגים, גם אם גם הם אמיתיים. בגלל זה הסדר חשוב. כאן הבדיקות בסדר הלא נכון:

```python
score = 95
if score >= 80:
    print("B")
elif score >= 90:
    print("A")
```

```text
B
```

95 הוא לפחות 80, אז הענף הראשון מנצח ו-`score >= 90` לא נבדק בכלל. שמים את התנאי הצר ביותר ראשון.

התיעוד מציין ששרשרת של `if`/`elif`/`elif` היא התחליף של Python למשפטי `switch` או `case` בשפות אחרות.

## אופרטורי השוואה

תנאי הוא בדרך כלל השוואה. כל השוואה מחזירה `True` או `False`:

| אופרטור | משמעות |
|---|---|
| `==` | שווה |
| `!=` | שונה |
| `<` | קטן מ- |
| `<=` | קטן או שווה |
| `>` | גדול מ- |
| `>=` | גדול או שווה |

```python
print(5 == 5, 5 != 3, 3 < 5, 5 <= 5, 7 > 9, 7 >= 7)
print("a" == "A", "apple" < "banana", 1 == 1.0)
```

```text
True True True True False True
False True True
```

מחרוזות מושוות תו אחרי תו, ואות גדולה ואות קטנה הן תווים שונים. ‏`1 == 1.0` הוא `True`, כי מספרים מושווים לפי הערך גם בין `int` ל-`float`.

אפשר לשרשר השוואות. לפי התיעוד, `x < y <= z` שקול ל-`x < y and y <= z`, חוץ מזה ש-`y` מחושב פעם אחת בלבד:

```python
age = 25
print(18 <= age < 65)
```

```text
True
```

עוד שני אופרטורים מופיעים בתנאים כל הזמן. ‏`in` בודק שייכות, ו-`is` בודק זהות. משתמשים ב-`is` רק עם `None`:

```python
fruit = "apple"
print(fruit in ["apple", "pear"], "z" in "pizza", "x" not in "pizza")

value = None
if value is None:
    print("no value")
```

```text
True True True
no value
```

## ערכים אמיתיים ושקריים

תנאי לא חייב להיות `True` או `False`. Python מקבלת כל ערך. התיעוד מפרט מה נחשב שקרי: `False`, `None`, אפס מכל טיפוס מספרי, ומחרוזות ואוספים ריקים. כל השאר נחשב אמיתי:

```python
name = ""
if name:
    print("Hello", name)
else:
    print("No name given")

items = [1, 2]
if items:
    print(len(items), "items")
```

```text
No name given
2 items
```

את `if name:` קוראים "אם יש שם". זה קצר יותר מ-`if name != "":`, וזה הסגנון המקובל ב-Python. ‏[הפוסט על המרת טיפוסים](he/posts/python-type-conversion/) מרחיב על `bool()` ועל אמיתיות של ערכים.

## תנאים מקוננים

בלוק יכול להכיל `if` נוסף:

```python
age = 20
has_ticket = True
if age >= 18:
    if has_ticket:
        print("Come in")
    else:
        print("Buy a ticket")
else:
    print("Adults only")
```

```text
Come in
```

קינון עובד, אבל כל רמה דוחפת את הקוד עוד ימינה בעורך. לעיתים קרובות `and` נותן גרסה שטוחה יותר, וזה הנושא של [הפוסט הבא](he/posts/python-logical-operators/).

בלוק לא יכול להיות ריק. כשצריך שומר מקום, כותבים `pass`, משפט שלא עושה כלום:

```python
x = 3
if x > 0:
    pass
print("ok")
```

```text
ok
```

## הביטוי המותנה

כשכל מה שצריך זה לבחור בין שני ערכים, יש צורה של שורה אחת. התיעוד קורא לה ביטוי מותנה (conditional expression), ש"לפעמים נקרא אופרטור טרנרי":

```python
age = 20
status = "adult" if age >= 18 else "minor"
print(status)

n = 1
print(f"{n} item{'' if n == 1 else 's'}")
```

```text
adult
1 item
```

קוראים את זה "`adult` אם התנאי אמיתי, אחרת `minor`". קודם מחושב התנאי, ואחר כך רק אחד משני הערכים. מכיוון שזה ביטוי, הוא נכנס בתוך השמה, קריאה לפונקציה או f-string. כדאי לשמור אותו לבחירות קצרות: אם אחד הצדדים ארוך מכמה מילים, `if`/`else` רגיל קריא יותר.

## כשיש הרבה ערכים: match

כשמשווים ערך אחד מול הרבה קבועים, Python 3.10 הוסיפה את משפט `match`:

```python
def describe(command):
    match command:
        case "start" | "go":
            return "Starting"
        case "stop":
            return "Stopping"
        case _:
            return "Unknown command"

print(describe("go"), describe("stop"), describe("jump"))
```

```text
Starting Stopping Unknown command
```

רק ה-`case` הראשון שמתאים רץ. ‏`|` פירושו "או", ו-`_` מתאים לכל דבר, כמו `else`. ‏`match` יודע לעשות הרבה יותר (פירוק רשימות ואובייקטים), כמו שמראה [המדריך הרשמי על `match`](https://docs.python.org/3/tutorial/controlflow.html#match-statements). כשיש רק כמה תנאים, `if`/`elif` עדיין פשוט יותר.

## טעויות נפוצות

- **`=` במקום `==`.** ‏`if x = 5:` הוא `SyntaxError`. ‏Python אפילו מציעה את התיקון: `Maybe you meant '==' or ':=' instead of '='?`
- **שכחת הנקודתיים.** ‏`if x == 5` בלי `:` נותן `SyntaxError: expected ':'`.
- **בלוק ריק.** ‏`if` בלי שום דבר מוזח מתחתיו נותן `IndentationError: expected an indented block after 'if' statement`. משתמשים ב-`pass` כשומר מקום.
- **סדר לא נכון בשרשרת `elif`.** רק הענף האמיתי הראשון רץ, אז שמים תנאים ספציפיים לפני כלליים.
- **השוואה של טקסט למספר.** ‏`5 == "5"` הוא `False`, לא שגיאה. ממירים את הערך מ-`input()` לפני ההשוואה.
- **השוואת float עם `==`.** ‏`0.1 + 0.2 == 0.3` הוא `False`. משתמשים ב-`math.isclose()` במקום.

## מה הלאה

הצעד הבא בסדרה: האופרטורים הלוגיים `and`, `or` ו-`not`, שמחברים כמה תנאים לתנאי אחד.
