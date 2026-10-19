---
title: "gitleaks: לתפוס סודות לפני שהם מגיעים ל-GitHub"
summary: "לסרוק תיקייה או את כל היסטוריית Git אחרי מפתחות ו-tokens שדלפו עם gitleaks, לחסום אותם עם pre-commit hook, לאשר false positives, ומה עושים כשסוד כבר נדחף."
date: 2026-10-19
tags: [security, git, dev-tools]
series: { key: mac-dev-setup, order: 7 }
---

מפתח API ב-commit הופך לציבורי ברגע שדוחפים למאגר ציבורי, ובוטים סורקים commits חדשים בחיפוש אחריהם. [gitleaks](https://github.com/gitleaks/gitleaks) סורק קבצים והיסטוריית Git אחרי סודות, לפי סט חוקים מובנה. כל הפקודות הורצו עם gitleaks 8.30.

```bash
brew install gitleaks
```

## סריקה

```bash
gitleaks dir .
gitleaks git .
```

`gitleaks dir` סורק את הקבצים כפי שהם עכשיו. `gitleaks git` סורק את היסטוריית ה-commits, וזה חשוב: סוד שמחקתם ב-commit מאוחר יותר עדיין נמצא בהיסטוריה. ממצא נראה כך (`--redact` מסתיר את הסוד עצמו, ו-`--no-banner` מסיר את הלוגו):

```text
Finding:     aws_key = "REDACTED
Secret:      REDACTED
RuleID:      aws-access-token
Entropy:     3.584184
File:        a.txt
Line:        1
Fingerprint: a.txt:aws-access-token:1
```

קוד היציאה הוא 1 כשנמצא משהו, אז זה עובד בסקריפטים וב-CI.

## לחסום ברגע ה-commit

סריקה בדיעבד מאוחרת מדי. מוסיפים את gitleaks כ-hook, עם ההגדרה מ[הפוסט על pre-commit](he/posts/pre-commit/):

```yaml
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
    hooks:
      - id: gitleaks
```

אחרי `pre-commit install`, commit שמכיל סוד ב-staging נעצר:

```text
Detect hardcoded secrets.................................................Failed
- hook id: gitleaks
- exit code: 1
```

ה-hook מריץ `gitleaks git --pre-commit --staged`, ולכן הוא בודק רק את מה שעומד להיכנס ל-commit. החליפו את `rev` ב-tag של הגרסה האחרונה.

## False positives

שורה שאינה סוד אמיתי, כמו מפתח מזויף בבדיקה, אפשר לאשר בשלוש דרכים:

- הערה על השורה: `# gitleaks:allow`.
- קובץ `.gitleaksignore` עם ה-`Fingerprint` של הממצא, אחד בכל שורה.
- קובץ `.gitleaks.toml` ששומר על חוקי ברירת המחדל ומדלג על נתיבים:

```toml
[extend]
useDefault = true

[[allowlists]]
description = "docs examples"
paths = ['''docs/.*''']
```

בלי `useDefault = true` ההגדרה שלכם מחליפה את החוקים המובנים במקום להוסיף עליהם.

## סוד כבר יצא

למחוק את השורה לא מספיק. הסוד בהיסטוריה, ואולי כבר הועתק.

1. **מבטלים אותו** אצל הספק ומנפיקים חדש. זה הצעד היחיד שבאמת פותר.
2. מעבירים את החדש למשתנה סביבה או למנהל סודות.
3. רק אז מנקים את ההיסטוריה אם רוצים, למשל עם `git filter-repo`, ויודעים ש-forks ו-clones שומרים את ה-commits הישנים.

שלבו את gitleaks עם ה-secret scanning וה-push protection של GitHub, שאפשר להפעיל בהגדרות האבטחה של המאגר.
