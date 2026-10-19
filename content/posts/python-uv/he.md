---
title: "uv: מנהל חבילות ופרויקטים מהיר ל-Python"
summary: "מה זה uv ואיך משתמשים בו: זרימת עבודה של פרויקט עם uv init, uv add ו-uv run, קובצי .venv, pyproject.toml ו-uv.lock, ו-uv venv ו-uv pip למי שרגיל ל-pip."
date: 2026-10-11
tags: [python]
series: { key: python, order: 23 }
---

uv הוא כלי של Astral, שנכתב ב-Rust, ועושה את מה ש-pip עושה ויותר: "מנהל חבילות Python מהיר במיוחד", לפי התיעוד. הוא מתקין חבילות, יוצר סביבות וירטואליות ואפילו מתקין גרסאות של Python.

כל הפקודות הורצו עם uv 0.11 ו-Python 3.13 ונבדקו מול [התיעוד של uv](https://docs.astral.sh/uv/).

## שתי דרכים לעבוד עם uv

1. **זרימת עבודה של פרויקט:** `uv init`, `uv add`, `uv run`. uv שומר בשבילכם על התאמה בין התלויות לסביבה. זו הדרך המומלצת לפרויקטים חדשים.
2. **זרימת עבודה בסגנון pip:** `uv venv` ו-`uv pip install`. התיעוד מתאר את זה כ"תחליף ישיר לפקודות הנפוצות של pip, ‏pip-tools ו-virtualenv" לפרויקטים שעדיין לא עברו.

## זרימת עבודה של פרויקט

יוצרים פרויקט:

```bash
uv init uv-demo --python 3.13
cd uv-demo
```

`uv init` יוצר `pyproject.toml`, `main.py`, `README.md`, קובץ `.python-version` ומאגר git. אחר כך מוסיפים תלות:

```bash
uv add requests
```

```text
+ certifi==2026.7.22
+ charset-normalizer==3.5.2
+ idna==3.20
+ requests==2.34.2
+ urllib3==2.8.0
```

uv מוסיף את התלות ל-`pyproject.toml`:

```toml
dependencies = [
    "requests>=2.34.2",
]
```

והוא מעדכן את `uv.lock`, קובץ נעילה שהתיעוד מתאר כ"מידע מדויק על התלויות של הפרויקט", על כל הפלטפורמות. החבילות מותקנות ב-`.venv`.

מריצים קוד בסביבה של הפרויקט בעזרת `uv run`:

```bash
uv run python -c "import requests; print(requests.__version__)"
```

```text
2.34.2
```

לא צריך להפעיל את `.venv` בעצמכם: לפני כל `uv run`, uv בודק שקובץ הנעילה תואם ל-`pyproject.toml` ושהסביבה תואמת לקובץ הנעילה. ל-git נכנסים `pyproject.toml` ו-`uv.lock`, אבל לא `.venv`: הוא ספציפי למחשב, אפשר לבנות אותו מחדש מקובץ הנעילה, ו-`uv init` כבר מוסיף אותו ל-`.gitignore`.

## זרימת עבודה בסגנון pip

אם יש לכם תיקייה בלי פרויקט, `uv venv` יוצר סביבה וירטואלית ב-`.venv` בתיקייה הנוכחית:

```bash
uv venv --python 3.13
uv pip install six
uv pip list
```

```text
Using CPython 3.13.14
Creating virtual environment at: .venv
+ six==1.17.0
Package Version
------- -------
six     1.17.0
```

`uv pip install` מוצא בעצמו את ה-`.venv` הקרוב, בלי הפעלה: הוא בודק קודם `VIRTUAL_ENV`, אחר כך `CONDA_PREFIX`, ואז `.venv` בתיקייה הנוכחית או מעליה.

`uv pip` אינו pip. הפקודות שלו "לא מיישמות במדויק את הממשקים וההתנהגות" של pip, ו-uv לא מסתמך על pip ולא מפעיל אותו. ברוב הפקודות היומיומיות התוצאה זהה, והמהירות גבוהה בהרבה.

## מתי להשתמש במה

- **פרויקט קיים עם `requirements.txt`:** `uv pip install -r requirements.txt` עובד, ואפשר לעבור לזרימת הפרויקט בהמשך.
- **ניסוי מהיר:** `uv venv` ו-`uv pip install` מספיקים.

## טעויות נפוצות

- **עריכה ידנית של `uv.lock`.** משנים תלויות עם `uv add` ו-`uv remove`, ו-uv מעדכן את קובץ הנעילה.
- **ערבוב `uv pip` ו-`pip` באותה סביבה.** בוחרים אחד לכל פרויקט, כדי שלא יהיו שתי רשימות שונות לאותן חבילות.

## מה הלאה

כאן הסדרה נגמרת בינתיים. בהמשך: קריאה וכתיבה של קבצים, מודולים ומחלקות.
