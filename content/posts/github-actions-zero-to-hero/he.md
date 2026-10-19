---
title: "GitHub Actions מאפס לגיבור: ה-workflow הראשון ואירועים"
summary: "מה זה GitHub Actions, החלקים של workflow, ‏workflow ראשון של CI לפרויקט Node, קריאת הרצות עם gh, והאירועים שמפעילים workflow: ‏push, ‏pull_request, הפעלה ידנית ותזמון."
date: 2026-10-13
updated: 2026-10-19
tags: [github, ci-cd]
series: { key: devops, order: 40 }
---

לכל פרויקט יש מטלות שצריכות לקרות בכל שינוי: בדיקות, עיצוב קוד, בנייה, פרסום, פריסה. ידנית זה עובד עד שמישהו שוכח. ‏**GitHub Actions** הוא האוטומציה המובנית של GitHub: מתארים את המטלות בקובץ YAML בתוך הריפוזיטורי, ו-GitHub מריץ אותן על מכונות משלו בכל פעם שמשהו קורה. ‏[GitHub מאפס לגיבור](he/posts/github-zero-to-hero/) הציג את Actions בפרק אחד; הסדרה הזאת, בארבעה פוסטים, הולכת עד הסוף.

כל מפתח, פקודה וגרסת action נבדקו מול [התיעוד של GitHub Actions](https://docs.github.com/en/actions) ומול עמודי הגרסאות של ה-actions באוקטובר 2026. גרסאות משתנות: בודקים בעמוד של כל action מה הגרסה הראשית העדכנית.

## מה זה GitHub Actions

GitHub Actions היא פלטפורמת **CI/CD**. ‏**אינטגרציה רציפה** (CI) פירושה שכל שינוי נבנה ונבדק אוטומטית, כך שבעיות צצות תוך דקות, על ה-pull request, לפני שמשהו ממוזג. ‏**מסירה/פריסה רציפה** (CD) פירושה שגם התוצאה הבדוקה משוחררת או נפרסת אוטומטית.

Actions לא מוגבלת ל-CI/CD. ‏workflow יכול לתייג issues חדשים, לסגור ישנים, לפרסם release כשדוחפים תגית, או להריץ דוח כל יום שני. כל דבר שאפשר לכתוב כסקריפט ולהפעיל מאירוע בריפוזיטורי מתאים.

### החלקים של workflow

![אירוע כמו push, ‏pull_request, ‏schedule או workflow_dispatch מפעיל קובץ workflow ב-.github/workflows. ב-workflow יש שני jobs, ‏test ו-build, וכל אחד רץ על runner משלו מסוג ubuntu-latest. כל job הוא רשימת צעדים: שורות uses מריצות actions כמו actions/checkout, ושורות run מריצות פקודות shell כמו npm ci.](/images/github-actions-zero-to-hero/workflow-anatomy.svg)

- **workflow** הוא קובץ YAML בתיקייה `.github/workflows/`. בריפוזיטורי יכולים להיות כמה שצריך.
- **אירוע** (event) מפעיל אותו: push, ‏pull request, תזמון, כפתור, ועוד עשרות.
- ל-workflow יש **job** אחד או יותר. ‏jobs רצים במקביל, אלא אם אחד מהם מצהיר על `needs`.
- כל job רץ על **runner**: מכונה וירטואלית נקייה ש-GitHub יוצרת בשביל ה-job וזורקת אחריו.
- job הוא רשימת **צעדים** (steps). צעד מריץ פקודת shell ‏(`run:`) או משתמש ב-**action** ‏(`uses:`), רכיב לשימוש חוזר שמישהו ארז, כמו `actions/checkout`.

## ה-workflow הראשון

ניקח פרויקט Node עם `package.json`, ‏`package-lock.json` וסקריפט `npm test`. יוצרים את `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
```

- ‏`name` הוא מה שרואים בלשונית **Actions**.
- ‏`on` מפרט את האירועים: כל pull request, ו-push ל-`main`.
- ‏`permissions` מגביל מה הטוקן האוטומטי יכול לעשות. קריאה בלבד היא נקודת ההתחלה הנכונה (השאר בפרק על [הרשאות](he/posts/github-actions-zero-to-hero-secrets-deploy/)).
- ‏`jobs.test` הוא job אחד, עם המזהה `test`.
- ‏`runs-on: ubuntu-latest` בוחר runner לינוקס שמתארח ב-GitHub. יש גם `windows-latest` ו-`macos-latest`.
- ‏`actions/checkout` משכפל את הריפוזיטורי ל-runner. בלעדיו ה-runner הוא מכונה ריקה.
- ‏`actions/setup-node` מתקין Node 24, ו-`cache: npm` שומר את תיקיית ההורדות של npm במטמון בין הרצות.
- שני צעדי ה-`run` הם פקודות shell רגילות.

עושים commit ו-push. לשונית **Actions** מציגה את ההרצה עם לוג חי לכל צעד. ב-pull request התוצאה מופיעה כבדיקה: נקודה צהובה בזמן ההרצה, ואחר כך וי ירוק או איקס אדום.

### קריאת הרצה מהטרמינל

‏[ה-CLI ‏`gh`](https://cli.github.com/) עושה את אותו הדבר מהטרמינל:

```bash
gh run list --limit 5          # recent runs and their status
gh run watch                   # follow a run live
gh run view <run-id> --log-failed   # only the logs of the failed steps
gh run rerun <run-id> --failed      # run the failed jobs again
```

## אירועים: מתי workflow רץ

המפתח `on` קובע מתי workflow מתחיל. ‏[מדריך האירועים](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) מפרט את כולם. אלה שתשתמשו בהם הכי הרבה:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'package*.json'
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]
        default: staging
  schedule:
    - cron: '30 5 * * 1-5'
      timezone: 'Asia/Jerusalem'
```

- **`push`** עם `branches` רץ רק לענפים האלה. ‏`paths` מצמצם עוד: כאן, רק כשקבצים תחת `src/` או קובצי החבילה משתנים. ‏`branches-ignore` ו-`paths-ignore` עושים את ההפך. גם דחיפת תגית יכולה להפעיל אותו, עם `tags: ['v*']`.
- **`pull_request`** רץ כש-PR נפתח, מתעדכן ב-commits חדשים, או נפתח מחדש. ‏`branches` מסנן לפי ענף ה*יעד* של ה-PR.
- **`workflow_dispatch`** מוסיף כפתור **Run workflow** בלשונית Actions, עם קלטים אופציונליים (עד 25). מהטרמינל: `gh workflow run ci.yml -f environment=production`.
- **`schedule`** משתמש בתחביר cron. דקות, שעות, יום בחודש, חודש, יום בשבוע: `30 5 * * 1-5` הוא 05:30 בימים שני עד שישי. תזמונים רצים לפי UTC, אלא אם מוסיפים `timezone`.

בתזמונים יש כמה הפתעות. הרצות מתוזמנות משתמשות ב-commit האחרון בענף ברירת המחדל, המרווח הקצר ביותר הוא 5 דקות, הרצות יכולות להתעכב בעומס גבוה ולכן לא סומכים על דקה מדויקת, ובריפוזיטוריז ציבוריים workflows מתוזמנים מושבתים אחרי 60 יום בלי פעילות.

עוד אירועים שימושיים: `release` ‏(פורסם), `workflow_call` ‏(workflow אחר קורא לזה, ראו [reusable workflows](he/posts/github-actions-zero-to-hero-reuse-security/)), `workflow_run` ‏(אחרי ש-workflow אחר מסתיים), ו-`issues` או `issue_comment` לאוטומציה של הריפוזיטורי.
