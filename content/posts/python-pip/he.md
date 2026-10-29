---
title: "pip: התקנת חבילות ב-Python"
summary: "איך pip מתקין חבילות צד שלישי מ-PyPI: התקנה, נעיצת גרסאות, רשימה, הצגת פרטים, שמירה ל-requirements.txt, הסרה, ולמה כדאי להשתמש ב-python -m pip ובסביבה וירטואלית."
date: 2026-10-11
tags: [python]
series: { key: python, order: 32 }
---

Python מגיע עם ספרייה סטנדרטית גדולה, אבל רוב הפרויקטים משתמשים גם בחבילות של צד שלישי: לקוח HTTP, מסגרת בדיקות, ספריית נתונים. pip מתקין אותן: הוא מוריד חבילות מ-Python Package Index (pypi.org) ומניח אותן במקום ש-Python יכול לייבא.

כל פקודה כאן הורצה עם Python 3.13 ו-pip 26.1, והשימוש נבדק מול [המדריך של pip](https://pip.pypa.io/en/stable/user_guide/).

## משתמשים ב-python -m pip

pip הוא גם פקודה בפני עצמה, אבל התיעוד ממליץ להריץ אותו דרך המפרש:

```bash
python3 -m pip --version
```

`python3 -m pip` משתמש ב-pip ששייך בדיוק ל-Python הזה, וזה חשוב כשיש כמה גרסאות. במחשב שלי `pip` בכלל לא ב-PATH, ו-`python3 -m pip` עובד.

## קודם כל סביבה וירטואלית

סביבה וירטואלית היא תיקייה עם חבילות Python משלה, כך שהתקנה בתוכה לא נוגעת בפרויקטים אחרים. מדריך האריזה של Python ממליץ "להשתמש בסביבה וירטואלית בעבודה עם חבילות של צד שלישי":

```bash
python3 -m venv .venv
source .venv/bin/activate
```

ב-Windows מפעילים עם `.venv\Scripts\activate`. אחרי ההפעלה, `python` ו-`pip` מצביעים על הסביבה.

## התקנת חבילה

```bash
python -m pip install requests
python -c "import requests; print(requests.__version__)"
```

```text
2.34.2
```

שם הייבוא ושם החבילה יכולים להיות שונים, ואצלכם הגרסה עשויה להיות חדשה יותר.

אפשר לנעול גרסה או לקבוע מינימום:

```bash
python -m pip install "requests==2.34.2"
python -m pip install "requests>=2.30"
```

## לראות מה מותקן

```bash
python -m pip list
python -m pip show requests
```

`list` מדפיס את כל החבילות בסביבה, ו-`show` מפרט חבילה אחת, כולל מה היא דורשת ואיפה היא מותקנת:

```text
Name: requests
Version: 2.34.2
License: Apache-2.0
Location: .../.venv/lib/python3.13/site-packages
Requires: certifi, charset_normalizer, idna, urllib3
Required-by:
```

`pip list --outdated` מראה אילו חבילות יש להן גרסה חדשה יותר.

## שמירת הרשימה: requirements.txt

`freeze` מדפיס את כל החבילות המותקנות עם הגרסה המדויקת, ושמירה שלו לקובץ מאפשרת לבנות את אותה סביבה מחדש:

```bash
python -m pip freeze > requirements.txt
```

```text
certifi==2026.7.22
charset-normalizer==3.5.2
idna==3.20
requests==2.34.2
urllib3==2.8.0
```

כדי להתקין מהקובץ בסביבה חדשה, משתמשים ב-`-r`:

```bash
python -m pip install -r requirements.txt
```

התיעוד מתאר קובץ requirements כ"רשימה של ארגומנטים של pip install שמונחת בקובץ". `freeze` כולל גם את התלויות של התלויות, ולכן `certifi` ו-`urllib3` מופיעות, למרות שהתקנתם רק את `requests`.

## שדרוג והסרה

```bash
python -m pip install --upgrade requests
python -m pip uninstall requests
```

`uninstall` מבקש אישור, ו-`-y` מדלג עליו.

## טעויות נפוצות

- **התקנה למפרש הלא נכון.** אם `pip install` מצליח אבל `import` נכשל, ה-`pip` שהרצתם שייך ל-Python אחר.
- **התקנה ב-Python של המערכת.** ב-macOS וב-Linux מערכת ההפעלה משתמשת בו בעצמה.

## מה הלאה

הצעד הבא בסדרה: uv, כלי מהיר יותר שמנהל גם את הפרויקט ואת הסביבה הוירטואלית.
