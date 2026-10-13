---
title: "GitHub Actions מאפס לגיבור"
summary: "מדריך מעשי ל-GitHub Actions עם דיאגרמות: workflows, אירועים, jobs ו-runners, ביטויים, פלטים, matrix, מטמון ו-artifacts, סודות, סביבות, OIDC, אימג'ים של Docker ואבטחה."
date: 2026-10-13
tags: [github, ci-cd]
series: { key: devops, order: 4 }
---

לכל פרויקט יש מטלות שצריכות לקרות בכל שינוי: להריץ את הבדיקות, לבדוק עיצוב קוד, לבנות, לפרסם חבילה, לפרוס. לעשות את זה ידנית עובד עד היום שמישהו שוכח. ‏**GitHub Actions** הוא האוטומציה המובנית של GitHub: מתארים את המטלות בקובץ YAML בתוך הריפוזיטורי, ו-GitHub מריץ אותן על מכונות משלו בכל פעם שמשהו קורה.

‏[GitHub מאפס לגיבור](he/posts/github-zero-to-hero/) הציג את Actions בפרק אחד. המדריך הזה הולך עד הסוף: אירועים, jobs, ביטויים, matrix, מטמון, סודות, פריסה בלי מפתחות שמורים, בניית אימג' של Docker, והרגלי האבטחה ששומרים על workflow מלהפוך לדלת אחורית.

כל מפתח, פקודה וגרסת action נבדקו מול [התיעוד של GitHub Actions](https://docs.github.com/en/actions) ומול עמודי הגרסאות של ה-actions עצמם באוקטובר 2026. גרסאות של actions מתקדמות: בודקים בעמוד של כל action מה הגרסה הראשית העדכנית.

## מה זה GitHub Actions

GitHub Actions היא פלטפורמת **CI/CD**. ‏**אינטגרציה רציפה** (CI) פירושה שכל שינוי נבנה ונבדק אוטומטית, כך שבעיות צצות תוך דקות, על ה-pull request, לפני שמשהו ממוזג. ‏**מסירה/פריסה רציפה** (CD) פירושה שגם התוצאה הבדוקה משוחררת או נפרסת אוטומטית.

Actions לא מוגבלת ל-CI/CD. ‏workflow יכול לתייג issues חדשים, לסגור ישנים, לפרסם release כשדוחפים תגית, או להריץ דוח כל יום שני בבוקר. כל דבר שאפשר לכתוב כסקריפט ולהפעיל מאירוע בריפוזיטורי מתאים.

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

שורה אחרי שורה:

- ‏`name` הוא מה שרואים בלשונית **Actions**.
- ‏`on` מפרט את האירועים: כל pull request, ו-push ל-`main`.
- ‏`permissions` מגביל מה הטוקן האוטומטי יכול לעשות. קריאה בלבד היא נקודת ההתחלה הנכונה (עוד על זה בהמשך).
- ‏`jobs.test` הוא job אחד, עם המזהה `test`.
- ‏`runs-on: ubuntu-latest` בוחר runner לינוקס שמתארח ב-GitHub. יש גם `windows-latest` ו-`macos-latest`.
- ‏`actions/checkout` משכפל את הריפוזיטורי ל-runner. בלעדיו ה-runner הוא מכונה ריקה.
- ‏`actions/setup-node` מתקין Node 24, ו-`cache: npm` שומר את תיקיית ההורדות של npm במטמון בין הרצות.
- שני צעדי ה-`run` הם פקודות shell רגילות.

עושים commit ו-push. פותחים את לשונית **Actions**, וההרצה שם, עם לוג חי לכל צעד. ב-pull request התוצאה מופיעה כבדיקה ליד ה-commit: נקודה צהובה בזמן ההרצה, ואחר כך וי ירוק או איקס אדום.

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

כמה עובדות על תזמונים מהתיעוד, כי הן מפתיעות. הרצות מתוזמנות משתמשות ב"commit האחרון בענף ברירת המחדל". המרווח הקצר ביותר הוא כל 5 דקות. הרצות "יכולות להתעכב בתקופות של עומס גבוה", אז לא סומכים על דקה מדויקת. ובריפוזיטוריז ציבוריים, workflows מתוזמנים מושבתים אוטומטית אחרי 60 יום בלי פעילות בריפוזיטורי.

עוד אירועים שימושיים: `release` ‏(release פורסם), `workflow_call` ‏(workflow אחר קורא לזה, נגיע לזה בהמשך), `workflow_run` ‏(אחרי ש-workflow אחר מסתיים), ו-`issues` או `issue_comment` לאוטומציה של הריפוזיטורי.

## Jobs, צעדים ו-runners

job עם עוד כמה אפשרויות:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    defaults:
      run:
        working-directory: app
    env:
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v7
      - name: Install
        run: npm ci
      - name: Lint and test
        run: |
          npm run lint
          npm test
```

- ‏`timeout-minutes` עוצר job תקוע. מגדירים אותו על הכול: ברירת המחדל היא 360 דקות, ובדיקה תקועה תנצל את כולן בשמחה.
- ‏`defaults.run.working-directory` מריץ כל צעד `run` בתת-תיקייה, שימושי ב-monorepo.
- ‏`env` ברמת ה-job נראה לכל הצעדים. אפשר להגדיר אותו גם ברמת ה-workflow או ברמת צעד.
- ‏`name` על צעד הוא מה שהלוג מציג. בלעדיו הלוג מציג את הפקודה.
- ‏`run: |` הוא YAML למחרוזת של כמה שורות. כל השורות רצות באותו shell, ובלינוקס ה-shell ברירת המחדל הוא Bash עם "עצור בפקודה הראשונה שנכשלת".

כל job מתחיל על מכונה נקייה. קבצים מ-job אחד לא קיימים ב-job הבא, אלא אם מעבירים אותם כ-artifact (בהמשך). על runners שמתארחים ב-GitHub מותקנים מראש הרבה כלים (Git, ‏Docker, ‏Node, ‏Python ועוד). ‏[ריפוזיטורי האימג'ים של ה-runners](https://github.com/actions/runner-images) מפרט אותם.

### Jobs שתלויים זה בזה

jobs רצים במקביל כברירת מחדל. ‏`needs` גורם ל-job לחכות:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: npm ci && npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: npm ci && npm test

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: npm ci && npm run build
```

‏`build` מתחיל רק אחרי ש-`lint` וגם `test` מצליחים. אם אחד מהם נכשל, `build` מדולג. ככה בונים pipeline: בדיקות במקביל, אחר כך build, ואחר כך פריסה.

![lint ושלושה jobs של test מתוך matrix רצים במקביל. ‏build צריך את כולם. ‏deploy-staging צריך את build. ‏deploy-prod צריך את deploy-staging ומשתמש בסביבת production, שמחכה לאישור.](/images/github-actions-zero-to-hero/job-graph.svg)

## ביטויים והקשרים

כל מה שבתוך `${{ }}` הוא **ביטוי** (expression), ש-GitHub מחשבת לפני שהצעד רץ. ביטויים קוראים **הקשרים** (contexts), אובייקטים מלאים במידע על ההרצה:

| הקשר | מה יש בו | דוגמה |
|---|---|---|
| `github` | האירוע והריפוזיטורי | `github.ref_name`, `github.sha`, `github.actor` |
| `env` | משתני סביבה שהגדרתם | `env.NODE_ENV` |
| `vars` | משתני הגדרות מההגדרות | `vars.APP_URL` |
| `secrets` | סודות מההגדרות | `secrets.NPM_TOKEN` |
| `matrix` | הערכים הנוכחיים של ה-matrix | `matrix.node` |
| `steps` | פלטים של צעדים קודמים ב-job | `steps.version.outputs.tag` |
| `needs` | פלטים ותוצאות של jobs שה-job הזה צריך | `needs.build.outputs.image` |
| `runner` | המכונה | `runner.os` |
| `inputs` | קלטים של `workflow_dispatch` או `workflow_call` | `inputs.environment` |

השימוש הנפוץ ביותר הוא `if`, שמחליט אם job או צעד ירוצו:

```yaml
steps:
  - name: Deploy
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    run: ./deploy.sh

  - name: Upload test report
    if: failure()
    uses: actions/upload-artifact@v7
    with:
      name: test-report
      path: reports/
```

כברירת מחדל צעד רץ רק אם כל הצעדים שלפניו הצליחו. פונקציות הסטטוס משנות את זה: `failure()` רץ רק אחרי כישלון, `always()` רץ בכל מקרה, ו-`cancelled()` רץ אם ההרצה בוטלה. יש גם פונקציות עזר כמו `contains()`, ‏`startsWith()`, ‏`format()`, ‏`toJSON()` ו-`hashFiles()`. ראו את [התיעוד של ביטויים](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions).

## העברת מידע בין צעדים ובין jobs

צעד לא יכול להגדיר משתנה shell רגיל לצעד הבא, כי כל צעד רץ בתהליך משלו. במקום זה, צעדים כותבים לקבצים מיוחדים. ‏[התיעוד של workflow commands](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands) מגדיר אותם:

```yaml
jobs:
  version:
    runs-on: ubuntu-latest
    outputs:
      tag: ${{ steps.v.outputs.tag }}
    steps:
      - id: v
        run: echo "tag=build-$(date +%Y%m%d)-${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"
      - run: echo "LOG_LEVEL=debug" >> "$GITHUB_ENV"
      - run: echo "Log level is $LOG_LEVEL"
      - run: echo "### Built ${{ steps.v.outputs.tag }}" >> "$GITHUB_STEP_SUMMARY"

  use:
    needs: version
    runs-on: ubuntu-latest
    steps:
      - run: echo "The tag is ${{ needs.version.outputs.tag }}"
```

- ‏`$GITHUB_OUTPUT`: צעד עם `id` כותב `name=value`, וצעדים מאוחרים יותר קוראים `steps.<id>.outputs.<name>`.
- ‏`$GITHUB_ENV`: מגדיר משתנה סביבה לצעדים *הבאים* של ה-job.
- ‏`outputs` של job: חושף פלט של צעד ל-jobs אחרים, שקוראים אותו דרך `needs`.
- ‏`$GITHUB_STEP_SUMMARY`: Markdown שמופיע בעמוד הסיכום של ההרצה. מצוין לתוצאות בדיקות או לקישור לתצוגה מקדימה.

GitHub גם מגדירה הרבה משתנים בכל job, כמו `GITHUB_SHA`, ‏`GITHUB_REF_NAME` ו-`GITHUB_REPOSITORY`. הקטע למעלה משתמש ב-`GITHUB_SHA`.

## Matrix

**matrix** מריץ את אותו job עם ערכים שונים. כדי לבדוק ספרייה על שתי מערכות הפעלה ושלוש גרסאות Node:

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [22, 24, 26]
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm test
```

![job עם matrix של שתי מערכות הפעלה ושלוש גרסאות Node מתפצל לשישה jobs, אחד לכל צירוף, שרצים במקביל.](/images/github-actions-zero-to-hero/matrix.svg)

שתיים כפול שלוש זה שישה jobs, כולם במקביל. כברירת מחדל, כשצירוף אחד נכשל, GitHub מבטלת את השאר (`fail-fast: true`). ‏`false` נותן לכל הצירופים לסיים, וכך רואים את התמונה המלאה. ‏`include` מוסיף צירופים, ‏`exclude` מוריד צירופים, ו-`max-parallel` מגביל כמה ירוצו בבת אחת.

## מטמון ו-artifacts

שניהם שומרים קבצים, והם פותרים בעיות שונות:

![משמאל: הרצה 41 שומרת מטמון עם מפתח שהוא hash של package-lock.json, והרצה 42 משחזרת אותו, כך ש-npm ci מהיר. מימין: job של build מעלה את dist/ כ-artifact שנשמר עם ההרצה, job של deploy באותה הרצה מוריד אותו, ואנשים יכולים להוריד אותו מעמוד ההרצה.](/images/github-actions-zero-to-hero/cache-vs-artifacts.svg)

**מטמון** (cache) מאיץ את ההרצה *הבאה*. הדרך הקלה היא האפשרות `cache` של actions ההתקנה, כמו למעלה (`cache: npm`). לכל דבר אחר משתמשים ב-[`actions/cache`](https://github.com/actions/cache) ישירות:

```yaml
- uses: actions/cache@v6
  with:
    path: ~/.cache/pip
    key: pip-${{ runner.os }}-${{ hashFiles('requirements.txt') }}
    restore-keys: |
      pip-${{ runner.os }}-
```

ה-`key` משתנה בכל פעם ש-`requirements.txt` משתנה, אז רשימת תלויות חדשה מקבלת מטמון חדש. ‏`restore-keys` נופל חזרה למטמון החדש ביותר שמתחיל בקידומת. מטמון יכול להימחק בכל רגע, ולכן ה-workflow חייב לעבוד גם בלעדיו.

**artifact** הוא *תוצר* של ההרצה: build, דוח בדיקות, לוג. ‏job מעלה אותו, ו-job מאוחר יותר באותה הרצה, או אדם מעמוד ההרצה, מוריד אותו:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v7
        with:
          name: site
          path: dist/
          retention-days: 7

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: site
          path: dist/
      - run: ls dist/
```

כלל האצבע: מטמון הוא אופטימיזציה, artifact הוא תוצר.

## סודות ומשתנים

אף פעם לא כותבים סיסמה, טוקן או מפתח בקובץ workflow. שומרים אותם ב-**Settings → Secrets and variables → Actions**, או מהטרמינל:

```bash
gh secret set NPM_TOKEN              # prompts for the value
gh variable set APP_URL --body "https://staging.example.com"
```

משתמשים בהם דרך הקשרים:

```yaml
steps:
  - run: npm publish
    env:
      NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  - run: curl --fail "${{ vars.APP_URL }}/health"
```

**סודות** (secrets) מוצפנים, ו-GitHub מסתירה את הערכים שלהם בלוגים. ‏**משתנים** (variables) נועדו להגדרות לא רגישות כמו כתובות ודגלי פיצ'רים, והם מוצגים כטקסט גלוי. את שניהם אפשר להגדיר לריפוזיטורי, לסביבה, או לארגון שלם.

שני כללים מהתיעוד. סודות "לא מועברים ל-runner כשה-workflow מופעל מריפוזיטורי fork", ולכן PR של אדם זר לא יכול לקרוא אותם. ואם ערך הוא לא סוד אבל צעד מחשב משהו רגיש, מסתירים אותו עם `echo "::add-mask::$VALUE"` לפני שהוא מגיע ללוג.

## הרשאות ו-GITHUB_TOKEN

בתחילת כל job, GitHub יוצרת טוקן בשם `GITHUB_TOKEN`, שתקף רק לריפוזיטורי הזה ורק עד שה-job מסתיים. ‏actions כמו `actions/checkout` משתמשים בו אוטומטית. אפשר להעביר אותו במפורש כ-`${{ secrets.GITHUB_TOKEN }}`, למשל לפקודות `gh`:

```yaml
permissions:
  contents: read

jobs:
  label:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - run: gh pr edit "$PR" --add-label "needs-review" --repo "$GITHUB_REPOSITORY"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR: ${{ github.event.pull_request.number }}
```

המפתח `permissions` קובע מה הטוקן רשאי לעשות. ‏[מדריך האבטחה](https://docs.github.com/en/actions/reference/security/secure-use) אומר לתת "את ההרשאות המינימליות הנדרשות": קריאה בלבד בראש ה-workflow, והרשאות כתיבה רק ב-jobs שצריכים אותן. הנפוצות: `contents` ‏(קוד ו-releases), ‏`pull-requests`, ‏`issues`, ‏`packages` ‏(אימג'ים של קונטיינרים), ‏`pages`, ‏`id-token` ‏(OIDC, בהמשך). ב-pull requests מ-forks הטוקן הוא קריאה בלבד, לא משנה מה מבקשים.

## סביבות ופריסות

**סביבה** (environment, ב-Settings → Environments) מייצגת יעד פריסה כמו `staging` או `production`. יכולים להיות לה סודות ומשתנים משלה, וחוקי הגנה כמו **מאשרים נדרשים** (required reviewers): ה-job מחכה עד שמישהו מאשר.

```yaml
jobs:
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - run: ./deploy.sh
        env:
          API_KEY: ${{ secrets.PRODUCTION_API_KEY }}
```

כשההרצה מגיעה ל-job הזה, היא נעצרת עם כפתור **Review deployments**. הסוד `PRODUCTION_API_KEY` קיים רק בסביבת `production`, ולכן אף job אחר לא יכול לקרוא אותו. ה-`url` מופיע בהרצה וברשימת הפריסות של הריפוזיטורי. חוקי הגנה בריפוזיטוריז פרטיים תלויים בתוכנית שלכם. בודקים ב[תיעוד של סביבות](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

## פריסה בלי מפתחות שמורים: OIDC

הדרך הישנה לפרוס לענן היא ליצור מפתח גישה ולשמור אותו כסוד. המפתח הזה חי לנצח, עובד מכל מקום, ונמצא במרחק דליפה אחת מאסון. ‏**OIDC** ‏(OpenID Connect) מחליף אותו בהרשאות שנוצרות לכל הרצה ופגות מעצמן.

![job ב-workflow, עם permissions id-token: write, מבקש טוקן מספק ה-OIDC של GitHub ומקבל טוקן חתום שמציין את הריפוזיטורי, הענף וה-workflow. הוא מחליף את הטוקן אצל הענן, שחוק האמון שלו מתיר רק את הריפוזיטורי והענף האלה, ומקבל הרשאות זמניות שפגות בערך אחרי שעה. שום מפתח קבוע לא שמור בשום מקום.](/images/github-actions-zero-to-hero/oidc.svg)

מגדירים פעם אחת חוק אמון בענן ("טוקנים מהריפוזיטורי `me/app`, ענף `main`, רשאים לקבל את התפקיד הזה"). אחר כך ה-workflow מבקש טוקן:

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-deploy
          aws-region: eu-central-1
      - run: aws s3 sync dist/ s3://my-bucket/
```

‏AWS, ‏Azure ו-Google Cloud תומכים בזה, וגם הרבה שירותים אחרים. אם הענן שלכם תומך ב-OIDC, מעדיפים אותו על פני מפתחות שמורים. ראו את [התיעוד של OIDC](https://docs.github.com/en/actions/concepts/security/openid-connect).

## Pipeline אמיתי: בנייה ודחיפה של אימג' Docker

מחברים הכול: בכל push ל-`main`, בונים את האימג' מ[Docker מאפס לגיבור](he/posts/docker-zero-to-hero/) ודוחפים אותו ל-GitHub Container Registry ‏(`ghcr.io`), מוכן ל-[Kubernetes](he/posts/kubernetes-zero-to-hero/) או לכל שרת אחר:

```yaml
name: Docker image

on:
  push:
    branches: [main]
    tags: ['v*']

permissions:
  contents: read
  packages: write

jobs:
  image:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7

      - uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - id: meta
        uses: docker/metadata-action@v6
        with:
          images: ghcr.io/${{ github.repository }}

      - uses: docker/setup-buildx-action@v4

      - uses: docker/build-push-action@v7
        with:
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- ‏`packages: write` מאפשר ל-`GITHUB_TOKEN` לדחוף ל-`ghcr.io`. לא צריך סוד נוסף.
- ‏`docker/metadata-action` הופך את אירוע ה-Git לתגיות אימג': שם הענף ב-push ל-`main`, הגרסה בתגית כמו `v1.2.0`.
- ‏`cache-from` ו-`cache-to` עם `type=gha` שומרים את מטמון השכבות של Docker במטמון של Actions, כך ששכבות שלא השתנו לא נבנות מחדש.

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

**composite action** קטן יותר: כמה צעדים שארוזים כצעד אחד. יוצרים `action.yml` בתיקייה, למשל `.github/actions/setup/`:

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

כלל אצבע: jobs שלמים משתפים עם reusable workflow, וכמה צעדים בתוך job משתפים עם composite action.

## Concurrency ומגבלות זמן

דוחפים שלושה commits ברצף, ושלוש הרצות מתחילות. בדרך כלל רק האחרונה חשובה:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

הרצות באותה `group` לא חופפות: הרצה חדשה מבטלת את זו שרצה באותו ענף. לפריסות משתמשים ב-`cancel-in-progress: false`, כדי שפריסה לא תיקטע באמצע; הבאה מחכה במקום זה. ומוסיפים `timeout-minutes` לכל job, כמו שראינו קודם.

## הרגלי אבטחה

workflow מריץ קוד עם גישה לריפוזיטורי ולסודות, ולכן מגיע לו אותו יחס כמו לקוד production. ‏[מדריך האבטחה](https://docs.github.com/en/actions/reference/security/secure-use) מפרט הכול. העיקר:

- **הרשאות מינימליות.** ‏`permissions: contents: read` בראש הקובץ, ויותר רק איפה שצריך.
- **נועצים actions של צד שלישי ל-SHA של commit.** אפשר להזיז תגית כמו `@v4` כך שתצביע על קוד חדש. התיעוד ממליץ "לנעוץ הפניות ל-actions ל-SHA של commit", למשל `uses: some-org/some-action@<40-character-sha> # v4.2.0`. ‏Dependabot יכול לעדכן את הנעיצות.
- **אף פעם לא מכניסים קלט לא מהימן ישירות לסקריפט `run`.** כותרת PR או שם ענף נכתבים על ידי מי שפתח את ה-PR. זה חור של script injection:

```yaml
# Dangerous: the title becomes part of the shell script
- run: echo "PR title is ${{ github.event.pull_request.title }}"

# Safe: pass it through an environment variable
- run: echo "PR title is $TITLE"
  env:
    TITLE: ${{ github.event.pull_request.title }}
```

- **זהירות רבה עם `pull_request_target`.** הוא רץ עם הסודות של ריפוזיטורי הבסיס ועם טוקן כתיבה, גם ל-PRs מ-forks. התיעוד מזהיר ש"הרצת קוד לא מהימן בטריגר `pull_request_target` עלולה להוביל לפרצות אבטחה". אף פעם לא עושים בו checkout לקוד של ה-PR ומריצים אותו.
- **בלי self-hosted runners בריפוזיטוריז ציבוריים.** התיעוד אומר ש"כמעט אף פעם לא כדאי להשתמש בהם בריפוזיטוריז ציבוריים", כי כל אחד יכול לפתוח PR שמריץ קוד על המכונה שלכם.
- **מעדיפים OIDC על פני מפתחות ענן קבועים**, וסביבות עם מאשרים ל-production.
- **שומרים על actions מעודכנים.** מוסיפים Dependabot לאקוסיסטם `github-actions`, כך שעדכוני גרסה מגיעים כ-PRs:

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
4. מדפיסים את מה שלא בטוחים בו. צעד עם `env: { EVENT: "${{ toJSON(github.event) }}" }` ו-`run: echo "$EVENT"` מדפיס את כל המידע של האירוע, דרך משתנה סביבה מאותה סיבה שראינו למעלה.
5. משחזרים מקומית. ה-runner הוא פשוט לינוקס: מריצים את אותן פקודות בקונטיינר. כלי הקהילה [act](https://github.com/nektos/act) מריץ workflows מקומית ב-Docker, עם כמה הבדלים מה-runners האמיתיים.

החשודים הרגילים: `actions/checkout` חסר, נתיב יחסי לתיקייה הלא נכונה, סוד שלא זמין (PRs מ-forks, או סוד שמוגדר בסביבה שה-job לא משתמש בה), בלוק `permissions` הדוק מדי (`Resource not accessible by integration`), מפתח מטמון שאף פעם לא משתנה, והזחה של YAML.

## עלות ומגבלות

runners שמתארחים ב-GitHub הם בחינם לריפוזיטוריז ציבוריים, ב-runners הסטנדרטיים. ריפוזיטוריז פרטיים מקבלים מכסה חודשית של דקות ואחסון שתלויה בתוכנית, ודקות של macOS ו-Windows נספרות יותר מדקות של לינוקס. מחירים ומכסות משתנים, אז בודקים ב[עמוד החיוב של Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions) במקום לסמוך על מספר מפוסט בבלוג. קבוצות concurrency, מסנני `paths`, מטמון ומגבלות זמן הם גם הדרך לשמור על החשבון נמוך.

## דף העזר

| אני רוצה... | איך |
|---|---|
| להריץ על PRs ועל push ל-main | `on: { pull_request: {}, push: { branches: [main] } }` |
| להריץ רק כשקבצים מסוימים משתנים | `paths: ['src/**']` תחת `push` או `pull_request` |
| להוסיף כפתור ידני | `on: workflow_dispatch` (ואז `gh workflow run <file>`) |
| להריץ לפי תזמון | `schedule: [{ cron: '0 6 * * 1' }]` |
| ש-job יחכה לאחר | `needs: [lint, test]` |
| להריץ צעד רק ב-main | `if: github.ref == 'refs/heads/main'` |
| להריץ צעד גם אחרי כישלון | `if: always()` או `if: failure()` |
| להעביר ערך לצעדים הבאים | `echo "name=value" >> "$GITHUB_OUTPUT"` |
| לבדוק כמה גרסאות | `strategy.matrix` |
| מטמון להורדות של npm | `actions/setup-node` עם `cache: npm` |
| להעביר קבצים ל-job אחר | `actions/upload-artifact` + `actions/download-artifact` |
| לשמור סוד | `gh secret set NAME` |
| להגביל את הטוקן | `permissions: contents: read` |
| לדרוש אישור לפריסה | `environment: production` + מאשרים נדרשים |
| לבטל הרצות ישנות | `concurrency` + `cancel-in-progress: true` |
| לראות לוגים של כישלון | `gh run view <id> --log-failed` |

## מילון מונחים

- **Workflow:** קובץ YAML ב-`.github/workflows/` שמגדיר אוטומציה.
- **Event / trigger (אירוע):** מה שמפעיל workflow ‏(`push`, ‏`pull_request`, ‏`schedule`...).
- **Job:** קבוצת צעדים שרצה על runner אחד.
- **Step (צעד):** פקודה אחת (`run`) או action אחד (`uses`) ב-job.
- **Action:** צעד לשימוש חוזר, מריפוזיטורי או מה-Marketplace.
- **Runner:** המכונה שמריצה job; מתארחת ב-GitHub או self-hosted.
- **Expression / context (ביטוי / הקשר):** תחביר `${{ }}`, והאובייקטים שהוא קורא (`github`, ‏`secrets`, ‏`matrix`...).
- **Matrix:** הרצה של job אחד עם הרבה צירופי ערכים.
- **Cache (מטמון):** קבצים שנשמרים בין הרצות כדי להאיץ אותן.
- **Artifact:** קבצים שהרצה מייצרת, שמשותפים בין jobs או מורדים.
- **Secret / variable (סוד / משתנה):** ערך מוצפן / ערך הגדרות גלוי.
- **GITHUB_TOKEN:** הטוקן האוטומטי וקצר החיים של כל job.
- **Environment (סביבה):** יעד פריסה עם סודות וחוקי הגנה משלו.
- **OIDC:** הרשאות ענן קצרות חיים במקום מפתחות שמורים.
- **Reusable workflow:** ‏workflow שנקרא כ-job מ-workflows אחרים.
- **Composite action:** כמה צעדים שארוזים כ-action אחד.
- **Concurrency group:** הרצות שאסור להן לחפוף.
- **CI/CD:** בנייה ובדיקה של כל שינוי, ושחרור אוטומטי שלו.

## לאן ממשיכים

עכשיו יש לכם את כל ארגז הכלים: אירועים שמפעילים workflows, ‏jobs שרצים במקביל או לפי סדר, ביטויים ופלטים שמחברים ביניהם, matrix, מטמון ו-artifacts, סודות שנשמרים במקום הנכון, פריסות שדורשות אישור ובלי מפתחות שמורים, וההרגלים ששומרים שהכול יהיה בטוח. כדי שזה ייקלט, מוסיפים workflow לפרויקט שלכם: בדיקות בכל PR, ‏artifact של build, ו-job של פריסה מאחורי סביבה.

‏[התיעוד של Actions](https://docs.github.com/en/actions) ו[מדריך התחביר של workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) הם הקריאה הבאה הטובה ביותר. לצד של הריפוזיטורי (pull requests, הגנת ענפים שדורשת את הבדיקות שלכם), ראו [GitHub מאפס לגיבור](he/posts/github-zero-to-hero/). כדי לארוז את מה שאתם בונים בקונטיינר, ראו [Docker מאפס לגיבור](he/posts/docker-zero-to-hero/), וכדי להריץ אותו בקנה מידה, ‏[Kubernetes מאפס לגיבור](he/posts/kubernetes-zero-to-hero/).
