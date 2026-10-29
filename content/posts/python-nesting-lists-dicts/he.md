---
title: "רשימות ומילונים מקוננים ב-Python"
summary: "רשימה של מילונים, מילון של רשימות או מילון של מילונים: בחירת הצורה, קריאה בטוחה של ערכים עמוקים, לולאות דרך הרמות, שינוי מבנה, מלכודת ההעתקה הרדודה, והדפסה קריאה."
date: 2026-10-29
tags: [python]
series: { key: python, order: 22 }
---

רוב הנתונים האמיתיים הם רשימות ומילונים אחד בתוך השני: תשובת JSON מ-API, קובץ הגדרות, שורות מגיליון. [הפוסט על רשימות מקוננות](he/posts/python-lists-nested/) עסק בטבלאות, ו[הפוסט על מילונים](he/posts/python-dicts/) קרא ערך מקונן אחד. הפוסט הזה עוסק בעבודה עם המבנה כולו.

כל הדוגמאות הורצו עם Python 3.13 ונבדקו מול [המדריך הרשמי על מבני נתונים](https://docs.python.org/3/tutorial/datastructures.html) ו[התיעוד של המודול `copy`](https://docs.python.org/3/library/copy.html).

## שלוש צורות לאותם נתונים

```python
# list of dicts: one dict per record
orders = [
    {"id": 7, "customer": "Dana", "items": [{"name": "pen", "qty": 3, "price": 2.5}]},
    {"id": 8, "customer": "Avi", "items": [{"name": "book", "qty": 1, "price": 40.0},
                                           {"name": "pen", "qty": 2, "price": 2.5}]},
    {"id": 9, "customer": "Dana", "items": []},
]

# dict of dicts: records by id
by_id = {o["id"]: o for o in orders}

# dict of lists: order ids per customer
by_customer = {}
for o in orders:
    by_customer.setdefault(o["customer"], []).append(o["id"])

print(by_id[8]["customer"])
print(by_customer)
```

```text
Avi
{'Dana': [7, 9], 'Avi': [8]}
```

בוחרים את הצורה לפי השאלה שתשאלו הכי הרבה:

- **רשימה של מילונים**: "לעבור על כולם". זה מה ש-API וקוראי CSV נותנים בדרך כלל.
- **מילון של מילונים**: "למצוא אחד לפי ה-id שלו". ‏`by_id[8]` הוא צעד אחד, במקום לולאה על הרשימה.
- **מילון של רשימות**: "כל מה ששייך ל-X". הקיבוץ מגיע מ-[`setdefault`](he/posts/python-dicts-deep-dive/).

‏`by_id` מחזיק את אותם מילונים כמו `orders`, לא עותקים: שנו את `by_id[8]` ו-`orders[1]` ישתנה גם הוא.

## קריאה בטוחה של ערכים עמוקים

שרשרת של `[]` קוראת מבחוץ פנימה, ונכשלת ברמה הראשונה שחסרה:

```python
order = orders[0]
print(order["items"][0]["name"])
print(order.get("shipping", {}).get("city", "no city"))
print(orders[2]["items"][0]["name"])
```

```text
pen
no city
IndexError: list index out of range
```

‏`.get("shipping", {})` מחזיר מילון ריק כשהמפתח חסר, כך של-`.get` הבא יש על מה להיקרא. לרשימות אין `get()`: בדקו את האורך או עברו על הרשימה בלולאה. השגיאה מציינת את הסוג שנכשל (`IndexError` לרשימה, `KeyError` למילון), וזה מגלה איזו רמה חסרה.

## לולאות דרך הרמות

לולאה אחת לכל רמה, וכל לולאה עובדת על מה שהקודמת נתנה לה:

```python
for order in orders:
    total = 0
    for item in order["items"]:
        total += item["qty"] * item["price"]
    print(order["id"], order["customer"], total)
```

```text
7 Dana 7.5
8 Avi 45.0
9 Dana 0
```

כשהלולאה הפנימית רק מחברת, `sum()` עם generator מחליף אותה:

```python
totals = {o["id"]: sum(i["qty"] * i["price"] for i in o["items"]) for o in orders}
print(totals)
```

```text
{7: 7.5, 8: 45.0, 9: 0}
```

## העתקה רדודה חולקת את הפנים

‏`copy()`, ‏`list()` ו-`[:]` מעתיקים רק את הרמה החיצונית. הרשימות והמילונים הפנימיים משותפים למקור ולעותק:

```python
import copy

shallow = orders.copy()
deep = copy.deepcopy(orders)

shallow[0]["customer"] = "Noa"
deep[1]["items"].clear()
print(orders[0]["customer"], len(orders[1]["items"]))
```

```text
Noa 2
```

שינוי של `shallow[0]` שינה את `orders[0]`, כי שתי הרשימות מחזיקות את אותו מילון. ‏[`copy.deepcopy()`](https://docs.python.org/3/library/copy.html#copy.deepcopy) מעתיק כל רמה, אז ריקון `deep[1]["items"]` השאיר את המקור כמו שהוא. השתמשו בו לפני שמשנים מבנה מקונן שקיבלתם ממקום אחר.

## הדפסה קריאה

‏`print()` שם הכול בשורה אחת. ‏[`json.dumps(..., indent=2)`](https://docs.python.org/3/library/json.html#json.dumps) מדפיס ערך אחד בכל שורה:

```python
import json

print(json.dumps(orders[1], indent=2))
```

```text
{
  "id": 8,
  "customer": "Avi",
  "items": [
    {
      "name": "book",
      "qty": 1,
      "price": 40.0
    },
    {
      "name": "pen",
      "qty": 2,
      "price": 2.5
    }
  ]
}
```

זה עובד רק עם טיפוסים של JSON: מילונים עם מפתחות מחרוזת, רשימות, מחרוזות, מספרים, בוליאנים ו-`None`. לכל השאר, ‏[`pprint.pprint()`](https://docs.python.org/3/library/pprint.html) מדפיס כל ערך של Python ושובר שורות ארוכות.

## טעויות נפוצות

- **לולאה על הרמה הלא נכונה.** ‏`for item in order:` עובר על המפתחות של ההזמנה (`id`, ‏`customer`, ‏`items`), לא על הפריטים שלה. כתבו `order["items"]`.
- **לצפות ש-`copy()` יגן על נתונים מקוננים.** הוא מעתיק רמה אחת. השתמשו ב-`copy.deepcopy()`.
- **שרשרת `[]` ארוכה על נתונים מבחוץ.** מפתח חסר אחד מפיל את כל השורה. השתמשו ב-`.get()` עם ברירת מחדל בכל רמה שעלולה לחסור.

## מה הלאה

הצעד הבא בסדרה: פונקציות, שנותנות שם לבלוק קוד כדי שאפשר יהיה להריץ אותו שוב עם ערכים אחרים.
