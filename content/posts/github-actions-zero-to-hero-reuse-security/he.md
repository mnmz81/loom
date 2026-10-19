---
title: "GitHub Actions מאפס לגיבור: שימוש חוזר, אבטחה ודיבאג"
summary: "reusable workflows ו-composite actions, קבוצות concurrency, הרגלי האבטחה ששומרים על workflow מלהפוך לדלת אחורית, דיבאג של הרצה שנכשלה, וכמה Actions עולה."
date: 2026-10-13
tags: [github, ci-cd]
series: { key: devops, order: 43 }
---

[ה-pipeline של הפריסה](he/posts/github-actions-zero-to-hero-secrets-deploy/) כבר רץ. נשאר לשמור על הרבה workflows קצרים, בטוחים וקלים לתיקון.

## שימוש חוזר: reusable workflows ו-composite actions

כשכמה ריפוזיטוריז, או כמה workflows באותו ריפוזיטורי, חוזרים על אותם jobs, מחלצים אותם.

**reusable workflow** הוא workflow שלם עם `on: workflow_call`. מי שקורא לו משתמש בו כ-job:

```yaml
# .github/workflows/node-ci.yml (the reusable one)
on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: '24'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: ${{ inputs.node-version }}
          cache: npm
      - run: npm ci && npm test
```

```yaml
# .github/workflows/ci.yml (the caller)
on: [pull_request]

jobs:
  ci:
    uses: ./.github/workflows/node-ci.yml
    with:
      node-version: '24'
```

מריפוזיטורי אחר משתמשים ב-`owner/repo/.github/workflows/node-ci.yml@v1`. סודות לא מועברים אוטומטית: מפרטים אותם תחת `secrets:`, או משתמשים ב-`secrets: inherit`.

**composite action** קטן יותר: כמה צעדים שארוזים כצעד אחד, לשימוש בתוך job. יוצרים `action.yml` בתיקייה, למשל `.github/actions/setup/`:

```yaml
name: Setup
description: Install Node and dependencies
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v7
      with:
        node-version: 24
        cache: npm
    - run: npm ci
      shell: bash
```

ואז כל job משתמש בו עם `uses: ./.github/actions/setup` (אחרי `actions/checkout`). שימו לב שצעדי `run` ב-composite action חייבים לציין `shell`.

## Concurrency

דוחפים שלושה commits ברצף, ושלוש הרצות מתחילות, אבל בדרך כלל רק האחרונה חשובה:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

הרצות באותה `group` לא חופפות: הרצה חדשה מבטלת את זו שרצה באותו ענף. לפריסות משתמשים ב-`cancel-in-progress: false`, כדי שפריסה לא תיקטע באמצע והבאה תחכה.

## הרגלי אבטחה

workflow מריץ קוד עם גישה לריפוזיטורי ולסודות, ולכן מתייחסים אליו כמו לקוד production ([מדריך האבטחה](https://docs.github.com/en/actions/reference/security/secure-use)). מעבר [להרשאות מינימליות, OIDC וסביבות עם מאשרים](he/posts/github-actions-zero-to-hero-secrets-deploy/):

- **נועצים actions של צד שלישי ל-SHA של commit.** אפשר להזיז תגית כמו `@v4` לקוד חדש: `uses: some-org/some-action@<40-character-sha> # v4.2.0`. ‏Dependabot יכול לעדכן את הנעיצות.
- **אף פעם לא מכניסים קלט לא מהימן ישירות לסקריפט `run`.** כותרת PR או שם ענף נכתבים על ידי מי שפתח את ה-PR. זה חור של script injection:

```yaml
# Dangerous: the title becomes part of the shell script
- run: echo "PR title is ${{ github.event.pull_request.title }}"

# Safe: pass it through an environment variable
- run: echo "PR title is $TITLE"
  env:
    TITLE: ${{ github.event.pull_request.title }}
```

- **זהירות רבה עם `pull_request_target`.** הוא רץ עם הסודות של ריפוזיטורי הבסיס ועם טוקן כתיבה, גם ל-PRs מ-forks. אף פעם לא עושים בו checkout לקוד של ה-PR ומריצים אותו.
- **בלי self-hosted runners בריפוזיטוריז ציבוריים:** כל אחד יכול לפתוח PR שמריץ קוד על המכונה שלכם.
- **שומרים על actions מעודכנים.** מוסיפים Dependabot ל-ecosystem ‏`github-actions`, כך שעדכונים מגיעים כ-PRs:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

## ארגז הכלים לדיבאג

כשהרצה נכשלת:

1. פותחים את הלוג של הצעד שנכשל. השגיאה בדרך כלל ב-20 השורות האחרונות. ‏`gh run view <run-id> --log-failed` מציג רק את החלקים שנכשלו.
2. בודקים את ה-**annotations** בראש סיכום ההרצה. ‏linters וכלי בדיקות מדווחים שם הרבה פעמים על שגיאות, עם קובץ ושורה.
3. מריצים מחדש עם יותר לוגים: **Re-run jobs → Enable debug logging**, או `gh run rerun <run-id> --debug`. סוד או משתנה בשם `ACTIONS_STEP_DEBUG` עם הערך `true` מפעיל את זה בכל ההרצות.
4. מדפיסים את מה שלא בטוחים בו. צעד עם `env: { EVENT: "${{ toJSON(github.event) }}" }` ו-`run: echo "$EVENT"` מדפיס את כל מידע האירוע (דרך משתנה סביבה, מאותה סיבה).
5. משחזרים מקומית. ה-runner הוא פשוט לינוקס: מריצים את אותן פקודות בקונטיינר, או עם כלי הקהילה [act](https://github.com/nektos/act) שמריץ workflows ב-Docker עם כמה הבדלים מה-runners האמיתיים.

החשודים הרגילים: `actions/checkout` חסר, נתיב יחסי לתיקייה הלא נכונה, סוד שלא זמין (PRs מ-forks, או סוד בסביבה שה-job לא משתמש בה), `permissions` הדוק מדי (`Resource not accessible by integration`), מפתח מטמון שאף פעם לא משתנה, והזחה של YAML.

## עלות ומגבלות

runners סטנדרטיים של GitHub הם בחינם לריפוזיטוריז ציבוריים. ריפוזיטוריז פרטיים מקבלים מכסה חודשית של דקות ואחסון שתלויה בתוכנית, ודקות של macOS ו-Windows נספרות יותר מלינוקס. מכסות משתנות, אז בודקים ב[עמוד החיוב של Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions). קבוצות concurrency, מסנני `paths`, מטמון ומגבלות זמן גם מורידים את החשבון.

## לאן ממשיכים

כדי שזה ייקלט, מוסיפים workflow לפרויקט שלכם: בדיקות בכל PR, ‏artifact של build, ו-job של פריסה מאחורי סביבה.

‏[התיעוד של Actions](https://docs.github.com/en/actions) ו[מדריך התחביר של workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) הם הקריאה הבאה הטובה ביותר. לצד של הריפוזיטורי (pull requests, הגנת ענפים שדורשת את הבדיקות שלכם), ראו [GitHub מאפס לגיבור](he/posts/github-zero-to-hero/); לארוז בקונטיינר, [Docker מאפס לגיבור](he/posts/docker-zero-to-hero/); להריץ בקנה מידה, [Kubernetes מאפס לגיבור](he/posts/kubernetes-zero-to-hero/).
