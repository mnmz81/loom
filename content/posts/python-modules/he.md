---
title: "מודולים ב-Python: import והקבצים שלכם"
summary: "מודול הוא קובץ שנטען עם import. ארבע צורות הייבוא, כתיבת מודול משלכם, איפה Python מחפשת אותו, ומה המשמעות של if __name__ == '__main__'."
date: 2026-10-19
tags: [python]
series: { key: python, order: 30 }
---

תוכנית שגדלה מעבר לכמה עשרות שורות קל יותר לקרוא כשהיא מפוצלת לקבצים. ב-Python כל קובץ הוא **מודול** (module): קובץ `.py` שקבצים אחרים יכולים לטעון ממנו שמות (פונקציות, קבועים, מחלקות) עם `import`. הספרייה הסטנדרטית היא אוסף גדול של מודולים מוכנים, כמו `math`, ‏`random` ו-`datetime`.

כל דוגמה הורצה עם Python 3.13, ונבדקה מול [הפרק על מודולים במדריך הרשמי](https://docs.python.org/3/tutorial/modules.html) ו[התיעוד של `import`](https://docs.python.org/3/reference/import.html).

## דרכים לייבא

‏`import math` טוען את המודול ונותן לכם שם אחד, `math`. נכנסים פנימה עם נקודה:

```python
import math

print(math.sqrt(16), math.floor(2.7), math.pi)
```

```text
4.0 2 3.141592653589793
```

‏`from math import sqrt` מעתיק שם אחד לקובץ שלכם, ולכן כותבים `sqrt(16)` בלי קידומת. ‏`import math as m` נותן למודול שם אחר, וזה נפוץ בשמות ארוכים. שתי הצורות כאן תקינות:

```python
from math import sqrt, ceil
import math as m

print(sqrt(9), ceil(2.1), m.pi)
```

```text
3.0 3 3.141592653589793
```

יש צורה רביעית, `from math import *`, שזורקת לקובץ את כל השמות הציבוריים. כדאי להימנע ממנה: אי אפשר לדעת מאיפה שם הגיע, והיא עלולה להחליף בשקט שם שהגדרתם ([הסתרת שמות](he/posts/python-scope-and-naming/)).

משתמשים ב-`import math` כשמשתמשים בהרבה שמות מהמודול, וב-`from math import sqrt` כשמשתמשים באחד או בשניים.

## כתיבת מודול משלכם

כל קובץ `.py` הוא מודול. שימו את זה בקובץ בשם `shapes.py`:

```python
import math

PI_APPROX = 3.14

def circle_area(radius):
    return math.pi * radius ** 2

def square_area(side):
    return side ** 2

print("shapes loaded")
```

בקובץ אחר באותה **תיקייה**, `main.py`, מייבאים אותו לפי שם הקובץ בלי `.py`:

```python
import shapes
from shapes import square_area
import shapes as sh

print(shapes.circle_area(1))
print(square_area(3))
print(sh.PI_APPROX)
```

מריצים מאותה תיקייה:

```bash
python main.py
```

```text
shapes loaded
3.141592653589793
9
3.14
```

‏`shapes loaded` מופיע פעם אחת, אף שהקובץ יובא שלוש פעמים. Python מריצה את הקוד של מודול בפעם הראשונה שמייבאים אותו ושומרת את התוצאה, כך שה-`import shapes` הבא משתמש במה שכבר נטען. כל מה שברמה העליונה של המודול רץ בזמן הייבוא: משפטי `def` יוצרים את הפונקציות, וה-`print` מדפיס.

## איפה Python מחפשת מודול

כשכותבים `import shapes`, Python מחפשת לפי הסדר: מודולים מובנים בתוך המפרש, ואז התיקיות ב-`sys.path`. הערך הראשון ב-`sys.path` הוא התיקייה של הסקריפט שהרצתם, ולכן `shapes.py` ליד `main.py` נמצא. השאר הן התיקיות של הספרייה הסטנדרטית והחבילות המותקנות ([פוסט על pip](he/posts/python-pip/)).

```python
import sys

print(type(sys.path), len(sys.path) > 1)
```

```text
<class 'list'> True
```

אם המודול לא נמצא, מקבלים `ModuleNotFoundError`. אם המודול קיים אבל חסר בו השם, מקבלים `ImportError`:

```python
import nothing_here
```

```text
ModuleNotFoundError: No module named 'nothing_here'
```

```python
from math import cube
```

```text
ImportError: cannot import name 'cube' from 'math' (unknown location)
```

מכיוון שתיקיית הסקריפט באה ראשונה, קובץ בשם של מודול סטנדרטי מסתיר את האמיתי. קובץ בשם `random.py` או `math.py` ליד הסקריפט שובר את `import random` בסקריפט הזה. בוחרים שמות שלא מתנגשים.

## `if __name__ == "__main__"`

לכל מודול יש `__name__`. כשמריצים קובץ ישירות (`python tool.py`), Python קובעת את ה-`__name__` שלו ל-`"__main__"`. כשקובץ אחר מייבא אותו, ה-`__name__` הוא שם המודול. כך קובץ אחד יכול לשמש גם כסקריפט וגם כמודול:

```python
def double(n):
    return n * 2

if __name__ == "__main__":
    print("running directly:", double(4))
```

שומרים כ-`tool.py` ומריצים:

```bash
python tool.py
python -c "import tool; print(tool.double(5), tool.__name__)"
```

```text
running directly: 8
10 tool
```

כשמריצים ישירות, בלוק ה-`if` מתבצע. כשמייבאים, הוא לא, ולכן לייבוא של `tool` אין תופעות לוואי. מה שצריך לרוץ רק כסקריפט, כמו קריאה ל-`main()` או הדגמה קצרה, שמים תחת ה-`if` הזה. מודול שמיובא בלעדיו היה מריץ את הקוד הזה בכל ייבוא, כמו ה-`print` ב-`shapes.py`.

## טעויות נפוצות

- **הרצה מתיקייה לא נכונה.** ‏`python src/main.py` מכניס ל-`sys.path` את `src/` ולא את התיקייה הנוכחית, ולכן מודול שנמצא מחוץ ל-`src/` לא נמצא.
- **קובץ בשם של מודול.** ‏`random.py`, ‏`math.py` ו-`test.py` מסתירים מודולים סטנדרטיים. משנים את שם הקובץ.
- **ציפייה ששינויים יילקחו.** מודול שכבר יובא לא נטען מחדש בזמן שהתוכנית רצה. מפעילים את התוכנית מחדש.
- **ייבוא שם שאין במודול.** ‏`ImportError: cannot import name` בדרך כלל אומר שיש שגיאת כתיב, או שהקובץ הוא לא זה שחשבתם. מדפיסים את `shapes.__file__` כדי לראות איזה קובץ נטען.

## מה הלאה

הפוסט הבא: חבילות (packages), תיקיות של מודולים, והקובץ `__init__.py` שהופך תיקייה לניתנת לייבוא.
