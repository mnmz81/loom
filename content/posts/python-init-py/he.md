---
title: "חבילות ו-__init__.py ב-Python"
summary: "חבילה היא תיקייה של מודולים. מה עושה __init__.py, האם עדיין צריך אותו, איך משתמשים בו כדי לחשוף ייבוא נקי, ייבוא יחסי ו-__all__."
date: 2026-10-19
tags: [python]
series: { key: python, order: 31 }
---

[מודול](he/posts/python-modules/) הוא קובץ אחד. כשבפרויקט יש הרבה מודולים קשורים, שמים אותם בתיקייה. תיקייה של מודולים שאפשר לייבא נקראת **חבילה** (package).

כל דוגמה הורצה עם Python 3.13, ונבדקה מול [החלק על חבילות במדריך הרשמי](https://docs.python.org/3/tutorial/modules.html#packages) ו[התיעוד של מערכת הייבוא](https://docs.python.org/3/reference/import.html#packages).

## חבילה היא תיקייה

נניח תיקייה `geometry/` ליד `main.py`:

```text
main.py
geometry/
    __init__.py
    shapes.py
    units.py
```

‏`shapes.py` ו-`units.py` הם מודולים רגילים:

```python
# geometry/shapes.py
import math


def circle_area(radius):
    return math.pi * radius ** 2


def square_area(side):
    return side ** 2
```

מייבאים מודול מחבילה עם נקודות, `package.module`:

```python
# main.py
import geometry.shapes
from geometry import shapes
from geometry.shapes import circle_area

print(geometry.shapes.square_area(3), shapes.square_area(3))
```

שלוש הצורות עובדות. ‏`from geometry import shapes` היא הקריאה ביותר כשמשתמשים בכמה שמות מהמודול.

## מה עושה `__init__.py`

‏`__init__.py` הוא קובץ ש-Python מריצה **פעם אחת, כשהחבילה מיובאת לראשונה**. השמות שבו הופכים לשמות של החבילה עצמה. הוא יכול להיות ריק, ולעיתים קרובות הוא כזה. הקובץ גם מסמן לכלים שהתיקייה היא חבילה רגילה.

אין חובה מוחלטת להשתמש בו: מ-Python 3.3 תיקייה בלי `__init__.py` עדיין ניתנת לייבוא, כ*חבילת מרחב שמות* (namespace package). אבל חבילה כזו לא יכולה להריץ קוד בזמן הייבוא, וכלים, מריצי בדיקות וכלי אריזה מצפים בדרך כלל לקובץ. מוסיפים `__init__.py` ריק לכל חבילה שכותבים.

## חשיפת ייבוא נקי

כאן `__init__.py` מוכיח את עצמו. אם מייבאים שמות בתוכו, המשתמשים יכולים לכתוב `from geometry import circle_area` בלי לדעת באיזה קובץ הפונקציה נמצאת:

```python
# geometry/__init__.py
print("geometry package loaded")

from .shapes import circle_area, square_area

__all__ = ["circle_area", "square_area"]
__version__ = "1.0"
```

```python
# main.py
import geometry
from geometry import circle_area

print(geometry.square_area(3), geometry.__version__)
print(round(circle_area(1), 2))
```

```bash
python main.py
```

```text
geometry package loaded
9 1.0
3.14
```

‏`geometry package loaded` הודפס פעם אחת, בייבוא הראשון. הנקודה בתחילת `from .shapes import ...` היא **ייבוא יחסי**: "מהמודול `shapes` באותה חבילה". נקודה אחת פירושה החבילה הנוכחית, שתי נקודות (`..`) החבילה שמעליה. ייבוא יחסי ממשיך לעבוד גם אם משנים את שם החבילה.

## ייבוא יחסי בתוך החבילה

אותו תחביר עם נקודות עובד בכל מודול בחבילה. ‏`units.py` יכול להשתמש ב-`shapes.py`:

```python
# geometry/units.py
from .shapes import square_area


def square_in_cm2(side_m):
    return square_area(side_m * 100)
```

```bash
python -c "from geometry.units import square_in_cm2; print(square_in_cm2(2))"
```

```text
geometry package loaded
40000
```

ייבוא של `geometry.units` מייבא קודם את `geometry`, ולכן שורת החבילה מודפסת שוב. ייבוא יחסי עובד רק כשהקובץ מיובא כחלק מחבילה. אם מריצים את הקובץ ישירות, הוא נכשל:

```bash
python geometry/units.py
```

```text
ImportError: attempted relative import with no known parent package
```

קוד שנמצא בתוך חבילה מריצים מבחוץ, או עם `import`, או עם `python -m geometry.units` מהתיקייה שמכילה את `geometry/`.

## `__all__`

‏`__all__` היא רשימה של השמות ש-`from geometry import *` מייבא. בלעדיה, `*` לוקח כל שם ציבורי (שלא מתחיל ב-`_`). הגדרה שלה הופכת את הממשק הציבורי לברור. המדריך אומר ש-`import *` בדרך כלל לא מומלץ, ולכן `__all__` בעיקר מתעדת מה החבילה מציעה.

## טעויות נפוצות

- **ייבוא בלי נקודה בתוך החבילה.** ‏`from shapes import square_area` ב-`units.py` עובד רק אם `geometry/` עצמה נמצאת בנתיב החיפוש. כותבים `from .shapes import ...`.
- **קוד כבד ב-`__init__.py`.** הוא רץ בכל ייבוא של החבילה, גם כשהמשתמש צריך מודול קטן אחד. משאירים בו ייבואים וקבועים.
- **חבילה ומודול באותו שם.** תיקייה `geometry/` וקובץ `geometry.py` באותו מקום מתנגשים. משנים שם של אחד מהם.
- **שגיאת כתיב בשם התיקייה.** שם חבילה חייב להיות מזהה תקין: את `my-package/` אי אפשר לייבא, את `my_package/` אפשר.

## מה הלאה

הפוסט הבא: pip, הכלי שמתקין חבילות שאנשים אחרים כתבו.
