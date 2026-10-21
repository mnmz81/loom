---
title: "SSG ב-Angular: ‏prerendering ו-outputMode: 'static'"
summary: "איך Angular יוצר HTML לכל route בזמן ה-build: ‏outputMode: 'static', ‏RenderMode.Prerender, ‏getPrerenderParams ל-routes עם פרמטרים, מה יוצא ב-dist, ודוגמה אמיתית מהבלוג הזה."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 67 }
---

ב-[SSR](he/posts/angular-ssr-hydration/) שרת Node מרנדר כל עמוד בזמן הבקשה. ב-SSG ‏(Static Site Generation, או prerendering) הרינדור קורה פעם אחת, ב-build: לכל route נוצר קובץ HTML, ואת התיקייה מעלים לכל אחסון סטטי, בלי שרת. הבלוג הזה בנוי כך.

כל דוגמה נבדקה עם Angular 22.2.

## ‏outputMode: 'static'

`ng add @angular/ssr` מוסיף לפרויקט קיים את קובצי השרת:

```text
CREATE src/main.server.ts (292 bytes)
CREATE src/app/app.config.server.ts (426 bytes)
CREATE src/app/app.routes.server.ts (166 bytes)
CREATE src/server.ts (1609 bytes)
UPDATE angular.json (2147 bytes)
UPDATE tsconfig.app.json (416 bytes)
UPDATE package.json (1021 bytes)
UPDATE src/app/app.config.ts (406 bytes)
```

הפקודה כותבת ב-`angular.json` את `"outputMode": "server"`, שמייצר גם אפליקציית שרת. לאתר סטטי מחליפים ל-`static`:

```json
"build": {
  "builder": "@angular/build:application",
  "options": {
    "browser": "src/main.ts",
    "server": "src/main.server.ts",
    "outputMode": "static",
    "ssr": {
      "entry": "src/server.ts"
    }
  }
}
```

לפי תיאור האפשרות ב-builder, ‏`static` מייצר "build לאתר סטטי, לפריסה בכל שירות אחסון סטטי", ו-`server` נחוץ רק לרינדור היברידי או ל-API. ‏`main.server.ts` עדיין נחוץ: בעזרתו Angular מרנדר את העמודים בזמן ה-build.

## ‏server routes ו-getPrerenderParams

הקובץ `app.routes.server.ts` קובע [לכל route איך לרנדר אותו](https://angular.dev/guide/ssr): ‏`RenderMode.Prerender` ב-build, ‏`RenderMode.Server` בכל בקשה, ו-`RenderMode.Client` בדפדפן בלבד. ל-route עם פרמטר, כמו `posts/:slug`, ‏Angular לא יכול לנחש אילו ערכים קיימים, ולכן `getPrerenderParams` מחזירה אותם:

```typescript
import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { PostStore } from './post-store';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'posts/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const slugs = inject(PostStore).slugs();
      return slugs.map((slug) => ({ slug }));
    },
  },
  { path: '**', renderMode: RenderMode.Prerender },
];
```

כל אובייקט במערך הוא עמוד אחד: ‏`{ slug: 'signals' }` הופך ל-`/posts/signals`. הפונקציה רצה בזמן ה-build, ו-`inject` עובד בה רק [לפני ה-`await` הראשון](https://angular.dev/guide/ssr). ה-route ‏`**` מרנדר מראש את כל שאר ה-routes שאין בהם פרמטרים. בדוגמה `PostStore` מחזיר שני slugs, ו-`Post` מקבל את `slug` כ-input בעזרת `withComponentInputBinding` ([פרמטרים של route](he/posts/angular-route-params/)).

## מה יוצא מה-build

```text
Prerendered 3 static routes.
Application bundle generation complete. [2.481 seconds]
```

```text
dist/ng-template/3rdpartylicenses.txt
dist/ng-template/browser/favicon.ico
dist/ng-template/browser/index.csr.html
dist/ng-template/browser/index.html
dist/ng-template/browser/main-MHOOVQS5.js
dist/ng-template/browser/posts/hello-angular/index.html
dist/ng-template/browser/posts/signals/index.html
dist/ng-template/browser/styles-5INURTSO.css
dist/ng-template/prerendered-routes.json
```

לכל route יש `index.html` משלו, עם התוכן כבר בתוכו (`<h1>Post: signals</h1>`), כך ששרת סטטי מגיש את `/posts/signals/` בלי קוד. ‏`index.csr.html` הוא מעטפת ריקה (`<app-root></app-root>`) לעמודים שלא רונדרו מראש, ו-`prerendered-routes.json` מפרט את מה שנוצר. אין תיקיית `server/`: את התיקייה `browser/` מעלים כמו שהיא.

## דוגמה אמיתית: הבלוג הזה

[Loom](https://mnmz81.github.io/loom/) נבנה עם `"outputMode": "static"`, וזה קטע מה-`app.routes.server.ts` שלו:

```typescript
export const serverRoutes: ServerRoute[] = [
  {
    path: ':lang/posts/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => entryParams(readIndexes(), 'post'),
  },
  // Unknown `/<lang>/...` paths render the not-found page in the browser (GitHub Pages serves 404.html).
  { path: ':lang/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender },
];
```

לפני `ng build` סקריפט הופך את קובצי ה-Markdown לקובצי JSON. ‏`readIndexes` קורא אותם עם `readFileSync`, כי `getPrerenderParams` רצה ב-Node, ו-`entryParams` מחזיר `{ lang, slug }` לכל פוסט בכל שפה. כתובת לא מוכרת מתחת לשפה מרונדרת בדפדפן, דרך דף ה-404 של GitHub Pages ([הפריסה בפוסט 72](he/posts/angular-deploy-github-pages/)).

### בגרסאות קודמות

לפני server routes הגדירו prerendering ב-`angular.json`, ורשימת ה-routes עם פרמטרים ישבה בקובץ טקסט:

```json
"prerender": {
  "routesFile": "routes.txt",
  "discoverRoutes": true
}
```

האפשרות `prerender` עדיין קיימת ב-schema של `@angular/build:application`, אבל ב-`ng add @angular/ssr` של היום מקבלים server routes.

## טעויות נפוצות של מתחילים

- **לשכוח את `getPrerenderParams`.** ה-build נכשל עם `The 'posts/:slug' route uses prerendering and includes parameters, but 'getPrerenderParams' is missing.`
- **לקרוא ל-`inject` אחרי `await`.** ההקשר של ה-injection כבר לא קיים שם. קוראים לכל ה-`inject` בתחילת הפונקציה.
- **להעלות את `dist/<app>` במקום `dist/<app>/browser`.** הקבצים שהדפדפן צריך נמצאים רק ב-`browser/`.

## מה הלאה

בפוסט הבא: תרגום האפליקציה עם i18n המובנה של Angular, ‏`@angular/localize` ו-build לכל שפה.
