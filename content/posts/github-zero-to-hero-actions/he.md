---
title: "GitHub מאפס לגיבור: Actions, ‏Pages ו-releases"
summary: "חלק 4 במדריך ל-GitHub: ‏workflow ראשון ב-Actions, ‏secrets והרשאות, פרסום אתר עם GitHub Pages, ‏releases עם הערות אוטומטיות, Codespaces ו-Copilot."
date: 2026-10-09
tags: [github, git]
series: { key: devops, order: 23 }
---

את ה-pull requests מ[חלק 2](he/posts/github-zero-to-hero-pull-requests/) מישהו צריך לבדוק, וספר המתכונים עדיין לא אתר. ‏GitHub יכול לעשות את שניהם.

## Actions: מניחים ל-GitHub להריץ את הבדיקות

**‏GitHub Actions** מריץ אוטומציה בתגובה למה שקורה בריפוזיטורי:

![אירוע push או pull_request מפעיל workflow, קובץ YAML ב-.github/workflows. ה-workflow מכיל jobs. ל-job בשם test יש צעדים של checkout, npm ci ו-npm test. ל-job בשם deploy, שזקוק ל-test, יש צעדים של checkout, build ו-deploy-pages. כל job רץ על runner.](/images/github-zero-to-hero/actions-anatomy.svg)

- **Workflow** הוא קובץ YAML ב-`.github/workflows/`. בריפוזיטורי יכולים להיות הרבה.
- **Event** מפעיל אותו: push, ‏pull request, לוח זמנים, או כפתור ידני.
- ב-workflow יש **jobs**. הם רצים במקביל, אלא אם אחד מצהיר `needs: other-job`.
- כל job רץ על **runner**, מכונה חדשה (GitHub מארח כאלה ל-Linux, ל-macOS ול-Windows).
- job הוא רשימת **steps**: פקודת shell ‏(`run:`) או **action** לשימוש חוזר (`uses:`) מה-[Marketplace](https://github.com/marketplace?type=actions).

workflow ראשון לפרויקט שלנו, שמור בתור `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
```

בכל pull request ו-push ל-`main` הוא מרים מכונת Ubuntu חדשה, מוריד את הקוד, מתקין Node 24 ואת התלויות, ומריץ את הבדיקות. פותחים PR, ונקודה צהובה הופכת לוי ירוק או ל-X אדום. הלשונית **Actions** מראה את הלוגים של כל הרצה.

```bash
gh run list --limit 5     # הרצות אחרונות
gh run watch              # לעקוב אחרי הרצה בזמן אמת
```

- **נותנים לרובוט להיות קפדן** (בדיקות, lint, טיפוסים) כדי שבני אדם ידברו על עיצוב.
- **Secrets:** שומרים סיסמאות וטוקנים ב-**Settings → Secrets and variables → Actions** ומשתמשים בהם בתור `${{ secrets.MY_TOKEN }}`. לעולם לא כותבים אותם ב-YAML.
- **הרשאות:** המפתח `permissions:` מגביל מה הטוקן האוטומטי רשאי לעשות. מתחילים מ-`contents: read` ומוסיפים רק מה ש-job צריך.
- **‏PRs מ-forks** לא מקבלים את ה-secrets שלנו.
- **מקבעים גרסאות** של actions (`@v5`), כדי ש-workflow לא ישתנה מתחת לרגליים.
- לשימוש החינמי יש מגבלות שתלויות בתוכנית ובשאלה אם הריפוזיטורי ציבורי; בודקים את דף התמחור לפני בניות כבדות.

ל-matrix, מטמון, סביבות, פריסה עם OIDC ואבטחת workflows, ראו [GitHub Actions מאפס לגיבור](he/posts/github-actions-zero-to-hero/).

## Pages: מפרסמים אתר מריפוזיטורי

**‏GitHub Pages** מגיש קבצים סטטיים (HTML, CSS, JS) בחינם בכתובת `https://<user>.github.io/<repo>/`. הבלוג הזה מתפרסם כך. יש שני מקורות פרסום, שבוחרים ב-**Settings → Pages**:

- **מענף:** Pages מגיש תיקייה (השורש או `/docs`) של ענף שנבחר. הכי פשוט ל-HTML שכתוב ביד או לאתרי Jekyll.
- **מ-GitHub Actions:** ‏workflow בונה את האתר כפי שנגדיר ומעלה את התוצאה. הכי מתאים כשיש שלב build (הבלוג הזה הוא אפליקציית Angular שנבנית, נבדקת ועוברת prerender קודם).

דרך ה-Actions בונה, מעלה את הפלט בתור Pages artifact ופורסת אותו. הליבה של ה-workflow של הבלוג הזה:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write

steps:
  - uses: actions/checkout@v5
  # ... התקנה ובנייה ...
  - uses: actions/configure-pages@v5
  - uses: actions/upload-pages-artifact@v4
    with:
      path: dist
  - uses: actions/deploy-pages@v4
```

כל מיזוג ל-`main` מפרסם מחדש את האתר, כך שפרסום הופך ל"למזג PR". שתי מלכודות: אתר שמוגש מ-`/<repo>/` צריך נתיב בסיס נכון בקישורים, ו-pushes שנעשים על ידי workflow עם `GITHUB_TOKEN` ברירת המחדל לא מפעילים בניית Pages נוספת.

## Releases ו-tags

**Tag** נותן שם ל-commit אחד, ו-**release** הוא tag עם הערות וקבצים להורדה, שמוצג בדף הראשי של הריפוזיטורי.

```bash
git tag -a v1.0 -m "First release"
git push --tags
gh release create v1.0 --generate-notes
```

הדגל `--generate-notes` בונה את ה-changelog מה-PRs שמוזגו מאז ה-release הקודם, עוד סיבה לכותרות טובות ל-PRs. גרסאות כמו `v1.4.2` בדרך כלל עוקבות אחרי [semantic versioning](https://semver.org): מעלים את המספר הראשון לשינויים שוברים, את השני לפיצ׳רים, ואת השלישי לתיקונים. כמו ב-commits וב-PRs, קטן ותכוף עדיף על גדול ונדיר.

## Codespaces ו-Copilot

- **‏Codespaces** נותן סביבת פיתוח בענן, בדפדפן או ב-VS Code, עם הריפוזיטורי והכלים שלו מוכנים. נוח לקליטת אנשים חדשים בצוות או לתיקון מהיר ממחשב שאול. לוחצים `.` בכל דף ריפוזיטורי לעורך אינטרנט קל, לעריכה בלבד.
- **‏GitHub Copilot** הוא עוזר ה-AI של GitHub. הוא משלים קוד, עונה על שאלות על ריפוזיטורי, ויכול לקחת issue ולפתוח PR לביקורת. תוכניות ומגבלות משתנות לעתים קרובות, אז בודקים את דף התמחור של GitHub. בכל מקרה, ממזגים רק מה שהבנו.

כדי שהלולאה תיכנס לידיים, עושים אותה פעם אחת באמת: ‏fork לפרויקט קוד פתוח קטן, תיקון שגיאת כתיב בתיעוד שלו, ופתיחת PR. ‏[דף העזר שלי ל-Git](he/posts/git-commands/) מכסה את הצד של Git. כדי לארוז אפליקציה כך שתרוץ אותו דבר בכל מקום (וגם על ה-runners של Actions), ראו [Docker מאפס לגיבור](he/posts/docker-zero-to-hero/). ה-[Docs](https://docs.github.com) של GitHub והקורסים החינמיים ב-[skills.github.com](https://skills.github.com) הם המשך טוב.
