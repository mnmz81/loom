---
title: "פריסת Angular ל-GitHub Pages עם GitHub Actions"
summary: "איך מעלים אפליקציית Angular ל-GitHub Pages: ‏baseHref לאתר בתת-תיקייה, ‏404.html לניתוב בצד הלקוח, workflow שבונה ומעלה את dist/<app>/browser, ו-angular-cli-ghpages כחלופה."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 72 }
---

GitHub Pages מגיש קבצים סטטיים ישר מה-repository, בחינם, וזה מספיק לאפליקציית Angular בלי שרת. אתר של repository יושב בכתובת `https://<user>.github.io/<repo>/`, ומהתת-תיקייה הזו נובעות שתי ההגדרות שבפוסט. הבלוג הזה, [Loom](https://mnmz81.github.io/loom/), נפרס בדיוק כך.

כל דוגמה נבדקה עם Angular 22.2. גרסאות ה-actions הן העדכניות באוקטובר 2026.

## ‏baseHref

האפליקציה לא יושבת בשורש הדומיין אלא ב-`/my-app/`. התגית `<base href>` ב-`index.html` אומרת לדפדפן ול-Router מאיפה לחשב כתובות יחסיות. עם ברירת המחדל, `/`, הדפדפן מבקש את `main.js` משורש הדומיין, מקבל 404, ונשאר עמוד ריק.

```bash
ng build --base-href /my-app/
```

```text
<base href="/my-app/">
```

זו השורה ב-`dist/<app>/browser/index.html` אחרי ה-build. אפשר גם לקבע את הערך ב-`angular.json`, כמו בבלוג, שם `"baseHref": "/loom/"` יושב ב-configuration ‏`production`, ו-`ng serve` נשאר על `/`. הערך חייב להסתיים ב-`/`: עם `/my-app` הדפדפן מחשב כתובות יחסיות מ-`/`.

## ‏404 לניתוב בצד הלקוח

ב-[routing](he/posts/angular-routing/) הכתובת `/my-app/about` לא קיימת כקובץ. שרת רגיל [מוגדר להחזיר `index.html`](https://angular.dev/tools/cli/deployment) לכל כתובת לא מוכרת, אבל ב-GitHub Pages אין הגדרות שרת. מה שיש: [דף 404 מותאם](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site). מעתיקים את `index.html` ל-`404.html`, ‏Angular נטען גם בכתובת לא מוכרת, וה-Router קורא את הכתובת ומציג את העמוד הנכון.

```bash
curl -sI https://mnmz81.github.io/loom/en/does-not-exist
```

```text
HTTP/2 404
server: GitHub.com
content-type: text/html; charset=utf-8
```

הקוד שחוזר הוא 404 גם כשהעמוד מוצג כמו שצריך, ומנועי חיפוש רואים 404. אתר שעבר [prerendering](he/posts/angular-ssg/) עוקף את זה: לכל route יש `index.html` משלו שחוזר עם 200, ו-`404.html` משמש רק לכתובות שבאמת לא קיימות. כך זה בבלוג: סקריפט אחרי ה-build מעתיק את דף ה-404 שרונדר מראש ל-`404.html`.

## ‏workflow ב-GitHub Actions

ב-**Settings ← Pages** בוחרים **GitHub Actions** כ-Source ‏([התיעוד](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)), ומוסיפים את `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx ng build --base-href /my-app/
      - run: cp dist/my-app/browser/index.html dist/my-app/browser/404.html
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist/my-app/browser

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

- ה-job ‏`build` בונה ומעלה רק את `dist/my-app/browser` כ-artifact. ‏`deploy` מחכה לו (`needs`) ומפרסם.
- ‏[`deploy-pages`](https://github.com/actions/deploy-pages) צריך את ההרשאות `pages: write` ו-`id-token: write`, ואת ה-environment ‏`github-pages`.
- `concurrency` עם `cancel-in-progress: false` מונע משתי פריסות לרוץ יחד, בלי לבטל פריסה שכבר התחילה.
- מגרסה 4, ‏`upload-pages-artifact` לא כולל קבצים שמתחילים בנקודה. מגרסה 5 יש לכך `include-hidden-files: true`.

ה-workflow של הבלוג בנוי באותה צורה, עם הרצת טסטים לפני ה-build.

## חלופה: angular-cli-ghpages

```bash
ng add angular-cli-ghpages
ng deploy --base-href=/my-app/
```

לפי [ה-README](https://github.com/angular-schule/angular-cli-ghpages), ‏`ng deploy` בונה ב-production ודוחף את התוצאה ל-branch ‏`gh-pages`, ויוצר `404.html` כברירת מחדל. כאן ה-Source ב-Settings הוא ה-branch, לא GitHub Actions. זה נוח לפריסה מהמחשב, ו-workflow נוח יותר כשרוצים טסטים ופריסה אוטומטית בכל push.

## טעויות נפוצות של מתחילים

- **לשכוח את `baseHref`.** העמוד עולה ריק, וב-Console רואים 404 על `main-*.js` משורש הדומיין.
- **להעלות את `dist/my-app` במקום `dist/my-app/browser`.** ‏`index.html` נמצא בתוך `browser/`, ו-GitHub Pages מחזיר 404 בשורש.
- **לשכוח את `permissions`.** בלי `pages: write` ו-`id-token: write`, ה-job ‏`deploy` נכשל.

## מה הלאה

בפוסט הבא: מדידת ביצועים עם Angular DevTools, ואיך מוצאים קומפוננטות שמרנדרות יותר מדי.
