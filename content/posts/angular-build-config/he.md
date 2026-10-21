---
title: "הגדרות build ב-Angular: ‏application builder, ‏configurations וערכי סביבה"
summary: "מה קורה ב-ng build: ה-builder ‏@angular/build:application ‏(esbuild ו-Vite), ה-configurations ‏production ו-development, ‏fileReplacements מול define, ‏budgets ו-source maps."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 71 }
---

`ng build` ו-`ng serve` לא בונים בעצמם: הם מריצים builder שמוגדר ב-`angular.json`, עם האפשרויות שכתובות שם. מי שמכיר את הקובץ יודע למה build של production שונה מ-development, ואיפה משנים כתובת API לפי סביבה.

כל דוגמה נבדקה עם Angular 22.2.

## ה-builder

```json
"build": {
  "builder": "@angular/build:application",
  "options": {
    "browser": "src/main.ts",
    "tsConfig": "tsconfig.app.json",
    "assets": [{ "glob": "**/*", "input": "public" }],
    "styles": ["src/styles.css"]
  },
  "defaultConfiguration": "production"
},
"serve": {
  "builder": "@angular/build:dev-server",
  "defaultConfiguration": "development"
}
```

`@angular/build:application` הוא [ברירת המחדל לכל אפליקציה חדשה](https://angular.dev/tools/cli/build-system-migration). הוא בונה עם esbuild, ושרת ה-dev משתמש ב-Vite, ש-Angular משתמש בו [רק כשרת פיתוח](https://angular.dev/tools/cli/build-system-migration). אותו builder מטפל גם ב-SSR וב-[prerendering](he/posts/angular-ssg/). ‏`browser` הוא נקודת הכניסה, ו-`public` מועתק כמו שהוא לתיקיית הפלט.

## ‏production ו-development

```json
"configurations": {
  "production": {
    "budgets": [
      { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
      { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
    ],
    "outputHashing": "all"
  },
  "development": {
    "optimization": false,
    "extractLicenses": false,
    "sourceMap": true
  }
}
```

configuration דורס את `options`. ‏`ng build` משתמש ב-`production` (ה-`defaultConfiguration` של `build`), ו-`ng serve` ב-`development`. אותה אפליקציה בשני המצבים:

```text
ng build
main-XW2B5EJE.js    | main          | 190.97 kB |                52.13 kB

ng build --configuration development
main.js             | main          |  1.35 MB |
```

ב-production הקוד עובר minify, ושם הקובץ מקבל hash (`outputHashing`), כך שגרסה חדשה לא נתקעת ב-cache של הדפדפן. ב-development אין אופטימיזציה, ולצד `main.js` נוצר `main.js.map`. אפשר להעביר כמה configurations מופרדות בפסיק, [והאחרונה גוברת](https://angular.dev/tools/cli/environments).

## ערכי סביבה: fileReplacements ו-define

```bash
ng generate environments
```

```text
CREATE src/environments/environment.ts (31 bytes)
CREATE src/environments/environment.development.ts (31 bytes)
UPDATE angular.json (2143 bytes)
```

הפקודה מוסיפה ל-`development` ‏`fileReplacements`, שמחליף את `environment.ts` ב-`environment.development.ts` בזמן ה-build ([התיעוד](https://angular.dev/tools/cli/environments)). דרך שנייה היא האפשרות [`define`](https://angular.dev/tools/cli/build-system-migration), שמחליפה מזהה גלובלי בערך קבוע. ב-`options` הוספנו `"define": { "APP_VERSION": "'1.4.0'" }`. ‏string צריך גרשיים בתוך הערך:

```typescript
import { Component } from '@angular/core';
import { environment } from '../environments/environment';

declare const APP_VERSION: string;

@Component({
  selector: 'app-root',
  template: `<p>API: {{ apiUrl }} · version {{ version }}</p>`,
})
export class App {
  protected readonly apiUrl = environment.apiUrl;
  protected readonly version = APP_VERSION;
}
```

ב-bundle של `ng build` נמצאו `api.example.com` ו-`1.4.0`, וב-build של development ‏`localhost:3000`. ה-`declare const` רק מודיע ל-TypeScript שהמזהה קיים. ‏`fileReplacements` מתאים לאובייקט שלם של הגדרות לכל סביבה. ‏`define` מתאים לערך בודד, ואפשר לדרוס אותו מהשורה: `ng build --define APP_VERSION="'1.5.0'"`. בשתי הדרכים הערכים נכנסים ל-JavaScript שכל אחד יכול לקרוא, ולכן לא שמים בהם סודות.

## ‏budgets ו-source maps

ה-`budgets` ב-production מגבילים את הגודל: מעל `maximumWarning` ה-build מזהיר, ומעל `maximumError` הוא נכשל. ‏[גודל ה-bundle](he/posts/angular-bundle-size/) מקבל פוסט משלו.

`sourceMap` ‏[כבוי כברירת מחדל](https://angular.dev/reference/configs/workspace-config#source-map-configuration) ודולק ב-development. כדי לשלוח maps לכלי דיווח שגיאות בלי לחשוף אותם בדפדפן, יש `"sourceMap": { "scripts": true, "hidden": true }`: הקבצים נוצרים, אבל ה-bundle לא מפנה אליהם.

### בגרסאות קודמות

פרויקטים ישנים בונים עם ה-builder של Webpack, שבו נקודת הכניסה נקראת `main` ויש `index` חובה:

```json
"builder": "@angular-devkit/build-angular:browser",
"options": {
  "outputPath": "dist/ng-template",
  "index": "src/index.html",
  "main": "src/main.ts"
}
```

ב-Angular 22 הוא עדיין עובד, אבל מדפיס בכל build:

```text
The "@angular-devkit/build-angular:browser" builder is deprecated as part of Angular's Webpack support deprecation. Use "@angular/build:application" instead.
```

הפלט שלו נכתב ישר ל-`dist/ng-template`, בלי תיקיית `browser/`. המעבר: `ng update @angular/cli --name use-application-builder`.

## טעויות נפוצות של מתחילים

- **לשים API key ב-`environment.ts`.** הקובץ נכנס ל-bundle, וכל מי שפותח את האתר יכול לקרוא אותו.
- **לשכוח גרשיים ב-`define`.** הערך נכנס לקוד כמו שהוא, ועם `"APP_VERSION": "1.4.0"` ה-build נכשל: `Invalid define value (must be an entity name or JS literal): 1.4.0`.
- **לבדוק ביצועים על `ng serve`.** זה build של development, בלי אופטימיזציה. מודדים על `ng build`.

## מה הלאה

בפוסט הבא: פריסת האפליקציה ל-GitHub Pages עם GitHub Actions, ‏`baseHref` ו-404 לניתוב בצד הלקוח.
