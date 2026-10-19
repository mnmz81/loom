---
title: "uv לכלים, סקריפטים וגרסאות Python"
summary: "להשתמש ב-uv מחוץ לפרויקט: להריץ כלי פעם אחת עם uvx, להתקין כלי CLI עם uv tool install, לנהל גרסאות Python עם uv python ולהריץ סקריפט בקובץ אחד עם תלויות בתוכו."
date: 2026-10-19
tags: [python, dev-tools, cli]
series: { key: mac-dev-setup, order: 4 }
---

[פייתון צעד אחר צעד: uv](he/posts/python-uv/) מכסה פרויקטים: `uv init`, `uv add`, `uv run`. הפוסט הזה מכסה את שאר uv, החלקים שמשתמשים בהם בלי שום פרויקט. כל הפקודות הורצו עם uv 0.11 ונבדקו מול [התיעוד של uv](https://docs.astral.sh/uv/).

```bash
brew install uv
```

## להריץ כלי פעם אחת: uvx

`uvx` הוא קיצור של `uv tool run`. הוא מריץ כלי Python בסביבה זמנית עם cache, ולא מתקין כלום באופן קבוע:

```bash
uvx ruff --version
```

```text
ruff 0.17.1
```

מתאים לכלים שפונים אליהם מדי פעם. בהרצה הראשונה הכלי יורד, ובאלה שאחריה משתמשים ב-cache.

## להתקין כלי: uv tool install

כלים שמשתמשים בהם כל יום מתקינים, כדי שהפקודה תמיד תהיה ב-`PATH`. לכל כלי סביבה מבודדת משלו, כך שכלים לא שוברים זה את זה ולא את הפרויקטים שלכם:

```bash
uv tool install pre-commit
uv tool list
uv tool upgrade --all
uv tool uninstall pre-commit
```

```text
pre-commit v4.7.0
- pre-commit
```

זה מחליף את `pip install` של כלי שורת פקודה, ואת `pipx`. הסביבות יושבות תחת `uv tool dir`.

## גרסאות Python: uv python

```bash
uv python install 3.12
uv python list --only-installed
uv run --python 3.12 python -V
```

```text
Python 3.12.13
```

uv מוריד בעצמו גרסאות Python, אז אין צורך ב-Homebrew או במנהל גרסאות נפרד בשביל Python. `--python` בוחר גרסה להרצה אחת.

## סקריפט בקובץ אחד

סקריפט יכול להצהיר על התלויות שלו בהערה בראש הקובץ, בפורמט inline הסטנדרטי. uv קורא אותה ובונה את הסביבה תוך כדי:

```python
# /// script
# requires-python = ">=3.12"
# dependencies = ["requests"]
# ///
import requests
print(requests.__version__)
```

```bash
uv run script.py
```

```text
2.34.2
```

`uv init --script script.py` יוצר את הכותרת, ו-`uv add --script script.py rich` מוסיף לה תלות. קובץ אחד, בלי `requirements.txt` ובלי סביבה וירטואלית לזכור.

הבא בתור: [OrbStack](he/posts/orbstack/).
