---
title: "מבנה פרויקט Angular: מה כל קובץ עושה"
summary: "סיור בקבצים ש-ng new יוצר ב-Angular 22: ‏main.ts, ‏app.config.ts, הקומפוננטה הראשית בשמות בלי ‎.component, ‏app.routes.ts, ‏angular.json, קובצי tsconfig ו-public."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 3 }
---

[בפוסט הקודם](he/posts/angular-install-ng-new/) `ng new my-app` יצר פרויקט. רוב הקבצים בו לא משתנים כמעט אף פעם, אבל כדאי לדעת מה כל אחד עושה לפני שמתחילים לכתוב קוד.

כל קובץ כאן נוצר ב-`ng new` של Angular CLI 22.2, בלי שינוי.

## העץ

```text
my-app/
├── angular.json
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── public/
│   └── favicon.ico
└── src/
    ├── index.html
    ├── main.ts
    ├── styles.css
    └── app/
        ├── app.config.ts
        ├── app.routes.ts
        ├── app.ts
        ├── app.html
        ├── app.css
        └── app.spec.ts
```

את `node_modules/` ו-`package-lock.json` יוצר npm, ואת `.angular/` (מטמון של ה-build) יוצר ה-CLI. שלושתם לא נערכים ביד, ו-`.gitignore` כבר מחריג את `node_modules` ואת `.angular/cache`. ‏[התיעוד של מבנה הפרויקט](https://angular.dev/reference/configs/file-structure) מתאר כל קובץ.

## ‏src/main.ts

נקודת הכניסה: הקוד הראשון שרץ בדפדפן.

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```

‏[`bootstrapApplication`](https://angular.dev/api/platform-browser/bootstrapApplication) מקבל קומפוננטה ראשית ותצורה, ומרנדר את הקומפוננטה במקום התגית שלה ב-`index.html`. ב-`src/index.html` יש `<app-root></app-root>`, וזה בדיוק ה-`selector` של `App`. ה-CLI מוסיף בזמן ה-build את תגיות ה-`<script>` וה-`<link>`, ולכן אין צורך לכתוב אותן ב-`index.html`.

## ‏app.config.ts

```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
```

כאן נרשמים ה-providers של כל האפליקציה: שירותים ויכולות כמו ראוטר, ‏HttpClient או אנימציות. ‏[`provideBrowserGlobalErrorListeners`](https://angular.dev/api/core/provideBrowserGlobalErrorListeners) מעביר שגיאות שאף אחד לא תפס (האירועים `error` ו-`unhandledrejection` של `window`) ל-`ErrorHandler` של Angular. ‏`provideRouter` מפעיל את הראוטר עם הנתיבים מ-`app.routes.ts`. מה זה provider בדיוק מוסבר ברמה 4.

## הקומפוננטה הראשית

```typescript
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('my-app');
}
```

הקומפוננטה מחולקת לשלושה קבצים: הקוד ב-`app.ts`, התבנית ב-`app.html` והעיצוב ב-`app.css`. ‏`app.html` הוא עמוד פתיחה לדוגמה, ושורה בראשו אומרת שהוא placeholder. מוחקים את כולו חוץ מ-`<router-outlet />` שבסופו, המקום שבו הראוטר מציג עמודים. ‏`app.spec.ts` בודק שהקומפוננטה נוצרת ושה-`<h1>` מציג `Hello, my-app`.

שמות הקבצים והמחלקה הם בלי סיומת: `app.ts` ולא `app.component.ts`, ‏`App` ולא `AppComponent`. זו ברירת המחדל של `ng new` מגרסה 20 ([מדריך הסגנון](https://angular.dev/style-guide) מראה את הסגנון הזה, למשל `UserProfile` בקובץ `user-profile.ts`). הדגל `--file-name-style-guide=2016` מחזיר את השמות הישנים.

## ‏app.routes.ts

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [];
```

רשימת הנתיבים של האפליקציה, ריקה בהתחלה. ראוטינג מקבל רמה שלמה (רמה 5).

## ‏angular.json

ההגדרות של ה-CLI: איך לבנות, להריץ ולבדוק כל פרויקט ב-workspace. החלק החשוב הוא ה-target ‏`build`:

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
}
```

‏`browser` הוא נקודת הכניסה, ‏`assets` מעתיק את כל מה שב-`public/` כמו שהוא, ו-`styles` מוסיף את `src/styles.css`, העיצוב הגלובלי של כל האפליקציה. ל-`build` יש שתי configurations: ‏`production` (ברירת המחדל של `ng build`, עם `budgets` שמזהירים כשהקוד גדל מעל 500kB) ו-`development` (בלי אופטימיזציה, עם source maps), ש-`ng serve` משתמש בה. ה-targets ‏`serve` ו-`test` מוגדרים באותו קובץ. ‏[התיעוד של angular.json](https://angular.dev/reference/configs/workspace-config) מפרט כל אפשרות.

## קובצי tsconfig

‏`tsconfig.json` הוא הבסיס, ושני האחרים יורשים ממנו: `tsconfig.app.json` לקוד האפליקציה (כל `src/**/*.ts` חוץ מ-`*.spec.ts`), ו-`tsconfig.spec.json` לבדיקות (עם הטיפוסים של `vitest/globals`). קטע מהבסיס:

```json
"compilerOptions": {
  "noImplicitOverride": true,
  "noPropertyAccessFromIndexSignature": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "experimentalDecorators": true,
  "target": "ES2022",
  "module": "preserve"
},
"angularCompilerOptions": {
  "strictInjectionParameters": true,
  "strictInputAccessModifiers": true
}
```

אין כאן `"strict": true`, כי [מ-TypeScript 6.0](he/posts/typescript-tsconfig/) הוא פועל כברירת מחדל. גם `strictTemplates`, בדיקת הטיפוסים המחמירה של התבניות, חסר מאותה סיבה: לפי [התיעוד](https://angular.dev/reference/configs/angular-compiler-options) ברירת המחדל שלו היא `true`. פרויקט של Angular 21 עוד כתב את שניהם במפורש.

## ‏public/

קבצים שמוגשים כמו שהם: תמונות, פונטים, `favicon.ico`. קובץ `public/logo.svg` זמין בכתובת `logo.svg`, בלי `public/` בנתיב.

### בגרסאות קודמות

‏`ng new` של Angular 14 יצר עוד כמה קבצים (מתוך הרצת `--dry-run`, מקוצר):

```text
CREATE v14-app/karma.conf.js (1424 bytes)
CREATE v14-app/src/favicon.ico (948 bytes)
CREATE v14-app/src/polyfills.ts (2338 bytes)
CREATE v14-app/src/test.ts (749 bytes)
CREATE v14-app/src/assets/.gitkeep (0 bytes)
CREATE v14-app/src/environments/environment.prod.ts (51 bytes)
CREATE v14-app/src/environments/environment.ts (658 bytes)
CREATE v14-app/src/app/app.module.ts (314 bytes)
CREATE v14-app/src/app/app.component.ts (211 bytes)
```

‏`polyfills.ts` טען את zone.js, ‏`environments/` החזיק הגדרות שונות ל-development ול-production, וקבצים סטטיים ישבו ב-`src/assets/` במקום ב-`public/`. ב-Angular 19 כבר לא היו `polyfills.ts` ו-`environments/` ‏(zone.js עבר לרשימת `polyfills` ב-`angular.json`), ו-`ng generate environments` עדיין [יוצר את התיקייה](https://angular.dev/tools/cli/environments) למי שצריך. שמות הקבצים עם `.component` נשארו עד גרסה 19.

ופרויקט מבוסס NgModule, כפי ש-Angular 19 יצר עם `--standalone=false`:

```typescript
// main.ts
import { platformBrowser } from '@angular/platform-browser';
import { AppModule } from './app/app.module';

platformBrowser().bootstrapModule(AppModule, {
  ngZoneEventCoalescing: true,
})
  .catch(err => console.error(err));

// app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

במקום `bootstrapApplication` ו-`app.config.ts`, ‏`bootstrapModule` מקבל מודול: `declarations` רושם את הקומפוננטות, ‏`imports` מביא מודולים אחרים, ו-`bootstrap` קובע מה הקומפוננטה הראשית.

## טעויות נפוצות של מתחילים

- **לכתוב תגיות `<script>` ב-`index.html`.** ה-CLI מוסיף את הקוד בעצמו; ספריות ועיצוב גלובלי נכנסים דרך `angular.json` או `import`.
- **לכתוב `public/` בנתיב לתמונה.** הנתיב הוא `logo.svg`, לא `public/logo.svg`.
- **לחפש `app.module.ts` או `environments/` בפרויקט חדש.** הם לא נוצרים יותר.

## מה הלאה

בפוסט הבא: קומפוננטה ראשונה עם `ng generate component`, ואיך משתמשים בה בתוך קומפוננטה אחרת.
