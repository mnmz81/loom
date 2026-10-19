---
title: "pydantic: אימות נתונים עם type hints"
summary: "מתארים את הנתונים פעם אחת כמחלקה עם type hints, ו-pydantic בודק וממיר בשבילכם: BaseModel, ‏ValidationError, אילוצים עם Field, מודלים מקוננים והמרה בחזרה ל-dict ול-JSON."
date: 2026-10-19
tags: [python]
series: { key: python, order: 30 }
---

נתונים שמגיעים מחוץ לתוכנית, כמו בקשת JSON, קובץ הגדרות או טופס, לא אמינים. הגיל יכול להגיע כ-`"abc"`, והשם יכול להיות חסר. בדיקה ידנית של כל שדה עם משפטי `if` מתארכת מהר. ‏[pydantic](https://docs.pydantic.dev/latest/) מאפשרת לתאר את צורת הנתונים פעם אחת, עם [type hints](he/posts/python-functions/), ועושה את הבדיקה בשבילכם.

כל דוגמה הורצה עם Python 3.13 ו-pydantic 2.14. ‏pydantic היא לא חלק מ-Python: מתקינים אותה ב[סביבה הווירטואלית](he/posts/python-pip/) עם `python -m pip install pydantic`. ההתנהגות נבדקה מול [התיעוד של pydantic](https://docs.pydantic.dev/latest/concepts/models/).

## מודל

*מודל* ב-pydantic הוא מחלקה שיורשת מ-`BaseModel`, עם שורה מוערת אחת לכל שדה: השם, נקודתיים והטיפוס. (למחלקות יהיה בהמשך פוסט משלהן. בינתיים קראו את `class User(BaseModel):` כ"User הוא נתונים עם השדות האלה".)

```python
from pydantic import BaseModel


class User(BaseModel):
    name: str
    age: int
    active: bool = True


user = User(name="Dana", age=31)
print(user)
print(user.name, user.age, user.active)
```

```text
name='Dana' age=31 active=True
Dana 31 True
```

בונים מודל על ידי העברת השדות בשמם. ל-`active` יש ערך ברירת מחדל, ולכן אפשר להשמיט אותו. שדה בלי ברירת מחדל הוא חובה.

## אימות והמרה

‏pydantic בודקת כל שדה מול הטיפוס שלו. כברירת מחדל היא גם **ממירה** ערכים כשההמרה בטוחה, כמו המחרוזת `"31"` למספר `31`:

```python
user = User(name="Avi", age="31")
print(repr(user.age), type(user.age))
```

```text
31 <class 'int'>
```

כשאי אפשר להמיר ערך, מקבלים `ValidationError` שמפרט את כל הבעיות בבת אחת, לא רק את הראשונה:

```python
from pydantic import ValidationError

try:
    User(age="abc")
except ValidationError as e:
    print(e)
```

```text
2 validation errors for User
name
  Field required [type=missing, input_value={'age': 'abc'}, input_type=dict]
    For further information visit https://errors.pydantic.dev/2.14/v/missing
age
  Input should be a valid integer, unable to parse string as an integer [type=int_parsing, input_value='abc', input_type=str]
    For further information visit https://errors.pydantic.dev/2.14/v/int_parsing
```

לכל בעיה יש שם שדה, הודעה והקלט השגוי. בקוד משתמשים ב-`e.errors()`, רשימה של מילונים, כדי לבנות הודעות משלכם. ‏`ValidationError` היא [חריגה](he/posts/python-exceptions/), ולכן מטפלים בה עם `try` ו-`except`, כמו למעלה.

## אילוצים עם Field

לכללים מעבר לטיפוס, כמו "גדול מאפס" או "לפחות 2 תווים", משתמשים ב-`Field`:

```python
from pydantic import Field


class Product(BaseModel):
    title: str = Field(min_length=2)
    price: float = Field(gt=0)
    tags: list[str] = []


print(Product(title="Pen", price=2.5))
try:
    Product(title="P", price=0)
except ValidationError as e:
    for err in e.errors():
        print(err["loc"], err["msg"])
```

```text
title='Pen' price=2.5 tags=[]
('title',) String should have at least 2 characters
('price',) Input should be greater than 0
```

‏`tags: list[str] = []` נראה כמו [מלכודת ברירת המחדל הניתנת לשינוי](he/posts/python-functions/), אבל pydantic מעתיקה את ברירת המחדל לכל מודל חדש, ולכן לכל מוצר יש רשימה משלו.

## מודלים מקוננים

שדה יכול להיות מודל אחר, או רשימה של מודלים. ‏pydantic בונה את האובייקטים הפנימיים ממילונים מקוננים:

```python
class Address(BaseModel):
    city: str
    zip_code: str


class Customer(BaseModel):
    name: str
    addresses: list[Address]


customer = Customer(
    name="Noa",
    addresses=[{"city": "Haifa", "zip_code": "3303"}],
)
print(customer.addresses[0].city)
print(type(customer.addresses[0]).__name__)
```

```text
Haifa
Address
```

## מילונים ו-JSON פנימה והחוצה

‏`model_validate()` בונה מודל ממילון, ו-`model_validate_json()` בונה אחד ממחרוזת JSON. הכיוון ההפוך הוא `model_dump()` למילון ו-`model_dump_json()` למחרוזת JSON:

```python
data = {"name": "Dana", "age": "31"}
user = User.model_validate(data)
print(user.model_dump())

raw = '{"name": "Avi", "age": 25, "active": false}'
print(User.model_validate_json(raw))
print(user.model_dump_json())
```

```text
{'name': 'Dana', 'age': 31, 'active': True}
name='Avi' age=25 active=False
{"name":"Dana","age":31,"active":true}
```

זה הזרם הרגיל: מאמתים פעם אחת בקצה התוכנית, איפה שהנתונים נכנסים. אחרי זה, שאר הקוד עובד עם מודל שידוע שהשדות שלו תקינים.

## טעויות נפוצות

- **ציפייה לשגיאה איפה ש-pydantic ממירה.** ‏`age="31"` מתקבל. אם צריך טיפוס מדויק, מעבירים `strict=True` בהגדרות המודל או ב-`Field`, כפי ש[טבלת ההמרות](https://docs.pydantic.dev/latest/concepts/conversion_table/) מתארת.
- **השמה לא נבדקת כברירת מחדל.** ‏`user.age = "abc"` עוברת בלי אימות אלא אם מגדירים `validate_assignment=True` בהגדרות המודל.
- **שמות מגרסה 1.** ב-pydantic 2 הפונקציות `dict()` ו-`parse_obj()` הוצאו משימוש: משתמשים ב-`model_dump()` וב-`model_validate()`.

## מה הלאה

זה סוף הסדרה בינתיים. בהמשך: קריאה וכתיבה של קבצים, ומחלקות.
