---
title: "pre-commit: להריץ בדיקות לפני כל commit"
summary: "להקים את מסגרת pre-commit: קובץ .pre-commit-config.yaml, pre-commit install, מה קורה כש-hook נכשל או מתקן קבצים, הרצה על כל הקבצים, עדכון גרסאות hooks ודילוג בזהירות."
date: 2026-10-19
tags: [git, dev-tools, cli]
series: { key: mac-dev-setup, order: 6 }
---

Git hook הוא סקריפט ש-Git מריץ ברגע מסוים, למשל רגע לפני commit. [pre-commit](https://pre-commit.com/) היא מסגרת שמנהלת את הסקריפטים האלה בשבילכם: רושמים את הבדיקות בקובץ אחד, משתפים אותו עם הצוות, וכל commit מריץ אותן על הקבצים שב-staging. כל הפקודות הורצו עם pre-commit 4.7.

## התקנה

```bash
uv tool install pre-commit
```

גם `brew install pre-commit` עובד. [הפוסט הקודם](he/posts/uv-tools/) מסביר את `uv tool`.

## הגדרה

יוצרים `.pre-commit-config.yaml` בשורש המאגר. `pre-commit sample-config` מדפיס נקודת פתיחה. כל רשומה היא מאגר של hooks, נעוץ ל-tag ב-`rev`:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v6.0.0
    hooks:
      - id: end-of-file-fixer
      - id: check-yaml
```

`end-of-file-fixer` דואג שכל קובץ יסתיים בשורה חדשה אחת. `check-yaml` בודק שקובצי YAML תקינים. בקטלוג ב-[pre-commit.com/hooks.html](https://pre-commit.com/hooks.html) יש הרבה יותר.

## להפעיל

ההגדרה לא עושה כלום עד שמתקינים את ה-Git hook, פעם אחת לכל שכפול:

```bash
pre-commit install
```

```text
pre-commit installed at .git/hooks/pre-commit
```

Hooks אינם חלק מהמאגר, ולכן כל חבר צוות צריך להריץ את זה אחרי clone. כתבו את זה ב-README.

## איך נראה commit עכשיו

בהרצה הראשונה כל hook מתקין לעצמו סביבה, וזה לוקח רגע. כש-hook משנה קובץ, ה-commit נעצר כדי שתראו את השינוי:

```text
fix end of files.........................................................Failed
- hook id: end-of-file-fixer
- exit code: 1
- files were modified by this hook

Fixing b.txt
```

מוסיפים את הקובץ המתוקן עם `git add` ועושים commit שוב. ההרצה השנייה עוברת. נבדקים רק הקבצים שב-commit, ו-hooks שאין להם קבצים מתאימים מדולגים.

## הרצה ידנית ועדכון

```bash
pre-commit run --all-files
pre-commit autoupdate
```

מריצים `--all-files` אחרי שמוסיפים hook חדש, כדי שגם הקבצים הקיימים ייבדקו. `autoupdate` מעדכן כל `rev` ל-tag האחרון, אז הסתכלו על ה-diff לפני שעושים commit.

## דילוג

`git commit --no-verify` מדלג על כל ה-hooks, ו-`SKIP=check-yaml git commit` מדלג על אחד לפי id. תשתמשו בהם בשעת חירום ולא כהרגל. אם ה-hooks איטיים או רועשים, אנשים מתחילים לדלג עליהם.

הבא בתור: [gitleaks](he/posts/gitleaks/), hook שכדאי להוסיף ראשון.
