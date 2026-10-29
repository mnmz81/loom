---
title: "pytest: בדיקות לקוד Python"
summary: "כותבים בדיקה כפונקציה רגילה עם assert, מריצים עם pytest, קוראים כישלון, בודקים שגיאות עם pytest.raises, מריצים בדיקה אחת עם כמה קלטים עם parametrize, ומשתפים הכנה עם fixtures."
date: 2026-10-19
tags: [python]
series: { key: python, order: 34 }
---

בדיקה (test) היא תוכנית קטנה שקוראת לקוד שלכם ובודקת את התוצאה. כשתשנו את הקוד בהמשך, הרצת הבדיקות תגיד לכם בתוך שניות אם משהו נשבר. ‏`pytest` הוא הכלי הפופולרי ביותר לזה: בדיקות הן פונקציות רגילות, והבדיקה עצמה היא ה-`assert` של Python.

כל דוגמה הורצה עם Python 3.13 ו-pytest 9.1, ונבדקה מול [התיעוד של pytest](https://docs.pytest.org/en/stable/). pytest הוא לא חלק מ-Python, ולכן מתקינים אותו קודם ב[סביבה הווירטואלית](he/posts/python-pip/):

```bash
python -m pip install pytest
```

## הבדיקה הראשונה

הנה הקוד שנבדוק, ב-`cart.py`:

```python
def total(prices, discount=0):
    if not 0 <= discount <= 1:
        raise ValueError("discount must be between 0 and 1")
    return round(sum(prices) * (1 - discount), 2)


def is_even(n):
    return n % 2 == 0
```

הבדיקות נכתבות ב-`test_cart.py`, באותה תיקייה. pytest מוצא בדיקות לפי שם: קבצים בשם `test_*.py` או `*_test.py`, ובתוכם פונקציות ששמן מתחיל ב-`test`. כל בדיקה קוראת לקוד ומשתמשת ב-`assert`, שלא עושה כלום כשהתנאי נכון ומכשיל את הבדיקה כשהוא שקרי:

```python
from cart import total


def test_total_sums_prices():
    assert total([10, 20, 5]) == 35


def test_total_with_discount():
    assert total([100], discount=0.25) == 75


def test_empty_cart_is_zero():
    assert total([]) == 0
```

מריצים `pytest` באותה תיקייה:

```bash
pytest
```

```text
collected 3 items

test_cart.py ...                                                         [100%]

============================== 3 passed in 0.01s ===============================
```

כל נקודה היא בדיקה שעברה. (הפלט קוצר לשורות החשובות. הגרסה המלאה מציגה גם את הפלטפורמה והגרסאות.)

## לקרוא כישלון

משנים את הערך הצפוי בבדיקה השנייה לערך שגוי, `== 80`, ומריצים שוב:

```text
test_cart.py .F.                                                         [100%]

=================================== FAILURES ===================================
___________________________ test_total_with_discount ___________________________

    def test_total_with_discount():
>       assert total([100], discount=0.25) == 80
E       assert 75.0 == 80
E        +  where 75.0 = total([100], discount=0.25)

test_cart.py:11: AssertionError
=========================== short test summary info ============================
FAILED test_cart.py::test_total_with_discount - assert 75.0 == 80
========================= 1 failed, 2 passed in 0.02s ==========================
```

האות `F` מסמנת את הבדיקה שנכשלה. pytest משכתב `assert` רגיל כדי להציג את הערכים משני הצדדים, ולכן לא צריך `print` או `assertEqual` מיוחד. השורה שמתחילה ב-`>` היא השורה שנכשלה, ו-`where 75.0 = total(...)` מראה מה הקריאה החזירה.

משווים מספרים עשרוניים עם `pytest.approx`, כי `0.1 + 0.2 == 0.3` הוא שקר ב-Python: ‏`assert 0.1 + 0.2 == pytest.approx(0.3)`.

## לבדוק שנזרקת שגיאה

לפעמים ההתנהגות הנכונה היא חריגה ([פוסט על חריגות](he/posts/python-exceptions/)). ‏`pytest.raises` עובר כשהבלוק זורק אותה, ונכשל כשלא. ‏`match` בודק את ההודעה עם ביטוי רגולרי:

```python
import pytest


def test_bad_discount_raises():
    with pytest.raises(ValueError, match="between 0 and 1"):
        total([10], discount=2)
```

## בדיקה אחת, הרבה קלטים

בדיקות שנבדלות רק בערכים יכולות לחלוק פונקציה אחת עם `@pytest.mark.parametrize`. היא מריצה את הפונקציה פעם אחת לכל שורה, וכל שורה מדווחת כבדיקה נפרדת:

```python
from cart import is_even


@pytest.mark.parametrize("n, expected", [(2, True), (7, False), (0, True)])
def test_is_even(n, expected):
    assert is_even(n) is expected
```

```bash
pytest -v -k even
```

```text
test_cart.py::test_is_even[2-True] PASSED                                [ 33%]
test_cart.py::test_is_even[7-False] PASSED                               [ 66%]
test_cart.py::test_is_even[0-True] PASSED                                [100%]

======================= 3 passed, 4 deselected in 0.01s ========================
```

‏`-v` מציג כל בדיקה בשמה, ו-`-k even` מריץ רק בדיקות ששמן מכיל `even`. ‏`-x` עוצר בכישלון הראשון, ו-`--lf` מריץ מחדש רק את הבדיקות שנכשלו בפעם הקודמת.

## Fixtures: הכנה משותפת

‏*fixture* היא פונקציה שמכינה משהו שבדיקה צריכה. מסמנים אותה עם `@pytest.fixture`, מוסיפים את שמה כפרמטר לכל בדיקה, ו-pytest קורא לה ומעביר את התוצאה:

```python
@pytest.fixture
def prices():
    return [10, 20, 5]


def test_sum(prices):
    assert sum(prices) == 35


def test_append_does_not_leak(prices):
    prices.append(100)
    assert len(prices) == 4


def test_each_test_gets_fresh_copy(prices):
    assert len(prices) == 3
```

כל בדיקה מקבלת תוצאה **חדשה**, ולכן ה-`append` בבדיקה השנייה לא משפיע על השלישית. ל-pytest יש גם fixtures מובנים. ‏`tmp_path` נותן תיקייה זמנית חדשה (`pathlib.Path`) לבדיקות שכותבות קבצים.

## טעויות נפוצות

- **בדיקה שאף פעם לא רצה.** הקובץ לא נקרא `test_*.py`, או ששם הפונקציה לא מתחיל ב-`test`. ‏`pytest` מדווח `collected 0 items`.
- **בדיקה בלי `assert`.** היא עוברת בלי קשר למה שהקוד עושה. כל בדיקה צריכה לבדוק משהו.
- **בדיקות שתלויות זו בזו.** בדיקה שצריכה שבדיקה אחרת תרוץ לפניה נכשלת כשמריצים אותה לבד עם `-k`. נותנים לכל בדיקה הכנה משלה, עם fixture.
- **‏`ModuleNotFoundError` על הקוד שלכם.** זה קורה כשהבדיקות עוברות לתיקיית `tests/` ואי אפשר לייבא את הקוד משם. [דף השיטות המומלצות](https://docs.pytest.org/en/stable/explanation/goodpractices.html) בתיעוד מסביר אילו מבנים עובדים.

## מה הלאה

הפוסט הבא: pydantic, שבודק את הנתונים שהפונקציות שלכם מקבלות, ואפשר לבדוק אותו עם pytest.
