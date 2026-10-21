---
title: "התקנת Angular ופרויקט ראשון עם ng new"
summary: "מה צריך כדי להתחיל: Node.js, ה-Angular CLI ‏(גלובלי או דרך npx), ‏ng new עם השאלות שהוא שואל, מה גרסה 22 מייצרת, ‏ng serve ו-ng version."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 2 }
---

כדי ליצור פרויקט Angular צריך שני כלים: Node.js, שמריץ את כלי הפיתוח, וה-Angular CLI, שיוצר את הפרויקט, מריץ אותו ובונה אותו.

כל דוגמה נבדקה עם Angular CLI 22.2, ‏Node.js 24.21 ו-npm 11.19.

## ‏Node.js

‏Angular 22 [דורש](https://angular.dev/reference/versions) Node.js ‏`^22.22.3`, ‏`^24.15.0` או `^26.0.0`, כלומר גרסת LTS פעילה או גרסת LTS בתחזוקה. בודקים מה מותקן:

```bash
node -v
```

```text
v24.21.0
```

‏npm מגיע יחד עם Node.js, ואין צורך להתקין אותו בנפרד.

## התקנת ה-CLI

[ההתקנה הרגילה](https://angular.dev/tools/cli/setup-local) היא גלובלית, ואחריה הפקודה `ng` זמינה בכל תיקייה:

```bash
npm install -g @angular/cli
```

ב-Windows, ‏PowerShell חוסם כברירת מחדל הרצת סקריפטים, ו-`ng` עלול להיכשל. התיעוד ממליץ על `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`. ב-Linux וב-macOS, אם ההתקנה נכשלת על הרשאות, מריצים אותה עם `sudo`.

אפשר גם בלי התקנה גלובלית. [npx](https://docs.npmjs.com/cli/commands/npx) מוריד את החבילה ומריץ אותה פעם אחת, וכך אפשר לבחור גרסה מדויקת:

```bash
npx @angular/cli@22 new my-app
cd my-app
npx ng version
```

בתוך הפרויקט, `npx ng` מריץ את ה-CLI שמותקן ב-`node_modules` של הפרויקט, באותה גרסה שכתובה ב-`package.json`. בהמשך הפוסט כתוב `ng`, וכל פקודה עובדת גם עם `npx ng`.

## ‏ng new

‏`ng new my-app` שואל שלוש שאלות (בהרצה הראשונה של ה-CLI יש לפניהן עוד שאלה: האם לשתף נתוני שימוש עם צוות Angular). כך זה נראה, עם התשובות שבחרתי:

```text
✔ Which stylesheet system would you like to use? CSS
✔ Do you want to enable Server-Side Rendering (SSR) and Static Site Generation (SSG/Prerendering)? No
✔ Which AI tools should Angular integrate with? None
CREATE my-app/angular.json (1903 bytes)
CREATE my-app/package.json (782 bytes)
CREATE my-app/tsconfig.json (908 bytes)
CREATE my-app/src/main.ts (222 bytes)
CREATE my-app/src/index.html (291 bytes)
CREATE my-app/src/styles.css (80 bytes)
CREATE my-app/src/app/app.ts (289 bytes)
CREATE my-app/src/app/app.html (20144 bytes)
CREATE my-app/src/app/app.css (0 bytes)
CREATE my-app/src/app/app.spec.ts (680 bytes)
CREATE my-app/src/app/app.config.ts (312 bytes)
CREATE my-app/src/app/app.routes.ts (77 bytes)
CREATE my-app/public/favicon.ico (15086 bytes)
⠋ Installing packages (npm)...
```

(הרשימה מקוצרת: היו בה גם `README.md`, ‏`.gitignore`, ‏`tsconfig.app.json`, ‏`tsconfig.spec.json` ותיקיית `.vscode`.)

- **‏stylesheet**: ‏CSS, ‏Tailwind CSS, ‏Sass או Less. אפשר לשנות גם אחר כך.
- **‏SSR**: רינדור בשרת ויצירת עמודים סטטיים. ל-SSR יש פוסטים משלו ברמה 10, ולפרויקט ראשון עדיף No.
- **‏AI tools**: קובצי הנחיות (`CLAUDE.md`, ‏`AGENTS.md`, ‏`GEMINI.md`) והגדרת שרת MCP של Angular לכלים שבוחרים.

את אותן תשובות אפשר לתת בדגלים, בלי שאלות: `ng new my-app --style=css --ssr=false --ai-config=none`. ‏`ng new` גם מאתחל מאגר git; הדגל `--skip-git` מדלג על זה. ‏`ng new --help` מציג את כל הדגלים.

## מה גרסה 22 יוצרת

ה-`package.json` שנוצר מראה ארבע ברירות מחדל של Angular 22:

```json
"devDependencies": {
  "@angular/build": "^22.2.2",
  "@angular/cli": "^22.2.2",
  "@angular/compiler-cli": "^22.2.0",
  "jsdom": "^30.0.0",
  "prettier": "^3.8.1",
  "typescript": "~6.0.2",
  "vitest": "^5.0.0"
}
```

- **‏Standalone**: אין `app.module.ts`. הדגל `--standalone` הוא `true` כברירת מחדל, והקומפוננטות מייבאות זו את זו ישירות.
- **‏Zoneless**: אין `zone.js` בתלויות, ו-Angular מזהה שינויים בלעדיו.
- **‏OnPush**: ב-`app.ts` אין `changeDetection`, כי [OnPush הוא ברירת המחדל](https://angular.dev/best-practices/skipping-subtrees) מגרסה 22.
- **‏Vitest**: [מריץ הבדיקות של פרויקטים חדשים](https://angular.dev/guide/testing), עם jsdom שמדמה דפדפן בתוך Node.js. ‏`ng test --watch=false` מריץ את שתי הבדיקות שנוצרו ב-`app.spec.ts`:

```text
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

## ‏ng serve

```bash
cd my-app
ng serve
```

```text
Initial chunk files | Names         | Raw size
main.js             | main          | 48.05 kB |
styles.css          | styles        | 95 bytes |

                    | Initial total | 48.14 kB

Application bundle generation complete. [2.386 seconds]

Watch mode enabled. Watching for file changes...
  ➜  Local:   http://localhost:4200/
```

שרת הפיתוח בונה את האפליקציה, עוקב אחרי הקבצים, בונה מחדש בכל שמירה ומרענן את הדפדפן. ‏`--open` ‏(`-o`) פותח את הדפדפן, ו-`--port` מחליף את פורט 4200. ‏`npm start` מריץ את אותו `ng serve` דרך הסקריפט ב-`package.json`.

## ‏ng version

‏`ng version` מציג את גרסאות ה-CLI, ‏Angular ו-Node.js, ואת הגרסה המותקנת של כל חבילה לעומת מה שמבוקש ב-`package.json`:

```text
Angular CLI       : 22.2.3
Angular           : 22.2.3
Node.js           : 24.21.0
Package Manager   : npm 11.19.0

│ @angular/core             │ 22.2.3            │ ^22.2.0           │
│ typescript                │ 6.0.3             │ ~6.0.2            │
│ vitest                    │ 5.0.5             │ ^5.0.0            │
```

(הטבלה מקוצרת.) ‏`^22.2.0` הוא טווח, ולכן npm התקין את 22.2.3, הגרסה האחרונה בטווח ביום ההתקנה.

### בגרסאות קודמות

כך נראה `package.json` שנוצר ב-`ng new` של Angular 19 (מקוצר):

```json
"dependencies": {
  "@angular/core": "^19.2.0",
  "@angular/platform-browser-dynamic": "^19.2.0",
  "zone.js": "~0.15.0"
},
"devDependencies": {
  "@angular-devkit/build-angular": "^19.2.27",
  "jasmine-core": "~5.6.0",
  "karma": "~6.4.0",
  "typescript": "~5.7.2"
}
```

‏`zone.js` הופיע בתלויות וגם תחת `polyfills` ב-`angular.json`, והבדיקות רצו ב-Karma ו-Jasmine בתוך דפדפן Chrome אמיתי. הרצתי `ng new` בכל גרסה: Angular 20 עוד יצר את אותו פרויקט עם zone.js ו-Karma, ו-Angular 21 הוא הראשון שיצר פרויקט zoneless עם Vitest. ‏Karma [עדיין נתמך](https://angular.dev/guide/testing) דרך `--test-runner=karma`.

פרויקטים ישנים יותר נבנו סביב `NgModule`. ‏`ng new --standalone=false` עדיין יוצר מבנה כזה, עם `app.module.ts` ‏(`app-module.ts` בשמות של היום), והפוסט הבא מראה איך הוא נראה.

## טעויות נפוצות של מתחילים

- **להריץ `ng serve` מחוץ לתיקיית הפרויקט.** התוצאה: `Error: This command is not available when running the Angular CLI outside a workspace.` קודם `cd my-app`.
- **להריץ `ng new` בתוך פרויקט קיים.** ההפך: `Error: This command is not available when running the Angular CLI inside a workspace.` יוצרים פרויקט חדש מתיקייה שאינה פרויקט Angular.
- **גרסת Node.js ישנה מדי.** Angular 22 לא תומך ב-Node.js 20. ‏`node -v` לפני הכול.

## מה הלאה

בפוסט הבא: סיור בקבצים ש-`ng new` יצר, מ-`main.ts` ועד `angular.json`.
