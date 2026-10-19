---
title: "GitHub Actions מאפס לגיבור: jobs, ביטויים, matrix ומטמון"
summary: "ה-workflow גדל: אפשרויות של job, ‏jobs שמחכים זה לזה, ביטויים והקשרים, העברת ערכים בין צעדים ובין jobs, ‏matrix, מטמון ו-artifacts."
date: 2026-10-13
tags: [github, ci-cd]
series: { key: devops, order: 16 }
---

[בחלק הראשון](he/posts/github-actions-zero-to-hero/) רץ job אחד, `test`, בכל push ו-pull request. ב-pipeline אמיתי יש כמה jobs, תנאים, וקבצים שעוברים ביניהם.

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

- ‏`timeout-minutes` עוצר job תקוע. מגדירים אותו בכל מקום: ברירת המחדל היא 360 דקות, ובדיקה תקועה תנצל את כולן בשמחה.
- ‏`defaults.run.working-directory` מריץ כל צעד `run` בתת-תיקייה, שימושי ב-monorepo.
- ‏`env` ברמת ה-job נראה לכל הצעדים (אפשר גם ברמת workflow או צעד).
- ‏`name` על צעד הוא מה שהלוג מציג במקום הפקודה.
- ‏`run: |` הוא מחרוזת של כמה שורות. כולן רצות באותו shell, ובלינוקס זה Bash שעוצר בפקודה הראשונה שנכשלת.

כל job מתחיל על מכונה נקייה, ולכן קבצים מ-job אחד לא קיימים בבא אלא אם מעבירים אותם כ-artifact (בהמשך). על runners של GitHub מותקנים מראש הרבה כלים (Git, ‏Docker, ‏Node, ‏Python ועוד); ‏[ריפוזיטורי האימג'ים של ה-runners](https://github.com/actions/runner-images) מפרט אותם.

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

‏`build` מתחיל רק אחרי ש-`lint` וגם `test` מצליחים; אם אחד נכשל, הוא מדולג. זה pipeline: בדיקות במקביל, אחר כך build, ואחר כך פריסה.

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

כברירת מחדל צעד רץ רק אם כל הצעדים שלפניו הצליחו. פונקציות הסטטוס משנות את זה: `failure()` רץ רק אחרי כישלון, `always()` בכל מקרה, ו-`cancelled()` אם ההרצה בוטלה. יש גם `contains()`, ‏`startsWith()`, ‏`format()`, ‏`toJSON()` ו-`hashFiles()` ([התיעוד של ביטויים](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions)).

## העברת מידע בין צעדים ובין jobs

צעד לא יכול להגדיר משתנה shell לצעד הבא, כי כל צעד רץ בתהליך משלו. במקום זה צעדים כותבים לקבצים מיוחדים ([workflow commands](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands)):

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
- ‏`$GITHUB_STEP_SUMMARY`: Markdown שמופיע בעמוד הסיכום של ההרצה, מצוין לתוצאות בדיקות.

GitHub גם מגדירה בכל job משתנים כמו `GITHUB_SHA`, ‏`GITHUB_REF_NAME` ו-`GITHUB_REPOSITORY`.

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

כברירת מחדל, כשצירוף אחד נכשל GitHub מבטלת את השאר (`fail-fast: true`); ‏`false` נותן לכולם לסיים, וכך רואים את התמונה המלאה. ‏`include` מוסיף צירופים, ‏`exclude` מוריד, ו-`max-parallel` מגביל כמה ירוצו בבת אחת.

## מטמון ו-artifacts

שניהם שומרים קבצים, והם פותרים בעיות שונות:

![משמאל: הרצה 41 שומרת מטמון עם מפתח שהוא hash של package-lock.json, והרצה 42 משחזרת אותו, כך ש-npm ci מהיר. מימין: job של build מעלה את dist/ כ-artifact שנשמר עם ההרצה, job של deploy באותה הרצה מוריד אותו, ואנשים יכולים להוריד אותו מעמוד ההרצה.](/images/github-actions-zero-to-hero/cache-vs-artifacts.svg)

**מטמון** (cache) הוא אופטימיזציה: הוא מאיץ את ההרצה *הבאה*. הדרך הקלה היא האפשרות `cache` של actions ההתקנה (‏`cache: npm` ב-workflow הראשון). לכל דבר אחר משתמשים ב-[`actions/cache`](https://github.com/actions/cache) ישירות:

```yaml
- uses: actions/cache@v6
  with:
    path: ~/.cache/pip
    key: pip-${{ runner.os }}-${{ hashFiles('requirements.txt') }}
    restore-keys: |
      pip-${{ runner.os }}-
```

ה-`key` משתנה כש-`requirements.txt` משתנה, אז רשימת תלויות חדשה מקבלת מטמון חדש; ‏`restore-keys` נופל חזרה למטמון החדש ביותר עם הקידומת. מטמון יכול להימחק בכל רגע, ולכן ה-workflow חייב לעבוד גם בלעדיו.

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
