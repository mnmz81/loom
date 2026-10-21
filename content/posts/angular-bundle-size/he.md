---
title: "גודל ה-bundle ב-Angular: budgets, טעינה עצלה וניתוח עם stats-json"
summary: "איך קוראים את טבלת הגדלים של ng build, כמה טעינה עצלה חוסכת ב-bundle ההתחלתי, budgets ב-angular.json שמכשילים build, ואיך מגלים איזו חבילה תופסת מקום עם --stats-json."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 74 }
---

כל קילובייט ב-bundle ההתחלתי נטען, מפוענח ורץ לפני שהמשתמש רואה משהו. ה-CLI מודד את הגודל בכל build, יכול להכשיל build שעובר גבול, ומייצר קובץ שמראה ממה כל קובץ בנוי.

כל דוגמה נבדקה עם Angular 22.2.

## טבלת הגדלים

אפליקציה עם שני routes, ‏`Home` ו-`Settings`. ‏`Settings` משתמש ב-`ReactiveFormsModule`, ושתיהן נטענות מראש (`component:` ב-routes):

```text
Initial chunk files | Names         |  Raw size | Estimated transfer size
main-YWYNTS7H.js    | main          | 248.96 kB |                66.56 kB
styles-5INURTSO.css | styles        |   0 bytes |                 0 bytes
                    | Initial total | 248.96 kB |                66.56 kB
```

‏`Initial chunk files` הם הקבצים שהדפדפן טוען כדי להפעיל את האפליקציה. ‏`Raw size` הוא הגודל על הדיסק, ו-`Estimated transfer size` הוא הערכה של הגודל אחרי דחיסה ברשת.

## טעינה עצלה מוציאה קוד מההתחלה

אותה אפליקציה, כש-`Settings` נטען [בטעינה עצלה](he/posts/angular-lazy-loading/):

```typescript
import { Routes } from '@angular/router';
import { Home } from './home';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'settings', loadComponent: () => import('./settings').then((m) => m.Settings) },
];
```

```text
Initial chunk files | Names         |  Raw size | Estimated transfer size
chunk-SSTZNX7T.js   | -             | 133.97 kB |                39.83 kB
main-SKNWJIPD.js    | main          |  88.21 kB |                22.47 kB
styles-5INURTSO.css | styles        |   0 bytes |                 0 bytes
                    | Initial total | 222.18 kB |                62.31 kB
Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-POAADIU2.js   | settings      |  28.68 kB |                 6.97 kB
```

ה-bundle ההתחלתי ירד מ-248.96 ל-222.18 kB, ונוסף `Lazy chunk files`: קובץ `settings` שנטען רק כשמנווטים אליו. רוב 28.68 ה-kB שלו הם `@angular/forms`, כפי שיתברר בהמשך. ‏[`@defer`](he/posts/angular-defer/) עושה את אותו דבר בתוך תבנית: כש-`<app-settings />` עטוף ב-`@defer`, הקומפוננטה והתלויות שלה עוברות ל-chunk עצל משלהן.

## ‏budgets: גבול שמכשיל את ה-build

ב-`angular.json`, תחת `configurations.production` של ה-build, יש `budgets`. פרויקט חדש מגיע עם גבול ל-`initial` ‏(500kB אזהרה, 1MB שגיאה) ול-`anyComponentStyle`. כאן הגבולות הוקטנו, ונוסף גבול ל-chunk העצל לפי השם שלו:

```json
"budgets": [
  { "type": "initial", "maximumWarning": "200kB", "maximumError": "210kB" },
  { "type": "bundle", "name": "settings", "maximumWarning": "20kB", "maximumError": "50kB" }
]
```

```text
Application bundle generation failed. [1.396 seconds]
▲ [WARNING] bundle initial exceeded maximum budget. Budget 200.00 kB was not met by 22.18 kB with a total of 222.18 kB.
▲ [WARNING] settings exceeded maximum budget. Budget 20.00 kB was not met by 8.68 kB with a total of 28.68 kB.
✘ [ERROR] bundle initial exceeded maximum budget. Budget 210.00 kB was not met by 12.18 kB with a total of 222.18 kB.
```

אזהרה רק מודפסת. שגיאה מכשילה את ה-build, ו-`ng build` יוצא עם קוד 1, כך ש-CI נעצר. הגבול נמדד לפי `Raw size`, לא לפי הגודל הדחוס. ‏`name` הוא השם מעמודת `Names`, לא שם הקובץ עם ה-hash. סוגים נוספים (`allScript`, ‏`any` ועוד) מופיעים ב-[תיעוד ה-budgets](https://angular.dev/tools/cli/build#configuring-size-budgets).

## ממה כל קובץ בנוי

הטבלה אומרת כמה, לא מה. ‏`ng build --stats-json` כותב את ה-metafile של esbuild, ולפי [תיעוד הפקודה](https://angular.dev/cli/build) אפשר לפתוח אותו ב-[esbuild analyzer](https://esbuild.github.io/analyze/), שמציג כל קובץ כמפה של החבילות שבו. בגרסה 22.2 שם הקובץ הוא `dist/<project>/browser-stats.json` (התיעוד עדיין קורא לו `stats.json`).

את אותו מידע אפשר לסכם בסקריפט קצר:

```javascript
// top-packages.mjs: bytes per npm package in each JS file of the build
import { readFileSync } from 'node:fs';

const { outputs } = JSON.parse(readFileSync('dist/ng-template/browser-stats.json', 'utf8'));
for (const [file, out] of Object.entries(outputs)) {
  if (!file.endsWith('.js')) continue;
  const sizes = {};
  for (const [input, { bytesInOutput }] of Object.entries(out.inputs)) {
    const pkg = input.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1] ?? 'your code';
    sizes[pkg] = (sizes[pkg] ?? 0) + bytesInOutput;
  }
  const top = Object.entries(sizes).sort((a, b) => b[1] - a[1]).slice(0, 3);
  console.log(file, top.map(([p, b]) => `${p} ${(b / 1000).toFixed(1)} kB`).join(', '));
}
```

```text
main-SKNWJIPD.js @angular/router 74.5 kB, @angular/platform-browser 12.1 kB, your code 0.7 kB
chunk-POAADIU2.js @angular/forms 27.9 kB, your code 0.4 kB
chunk-SSTZNX7T.js @angular/core 108.9 kB, rxjs 16.0 kB, @angular/common 5.7 kB
```

עכשיו רואים ש-`@angular/forms` כולו נמצא ב-chunk העצל, ושבקוד ההתחלתי הנתח הגדול הוא `@angular/core` והראוטר. ספרייה כבדה שמופיעה ב-`main` היא המועמדת הראשונה להעברה ל-route עצל או ל-`@defer`.

## טעויות נפוצות של מתחילים

- **להגדיל את ה-budget כדי שה-build יעבור.** קודם בודקים מה גדל עם `--stats-json`, ורק אחר כך מחליטים אם הגבול צריך לזוז.
- **לייבא route עצל גם בצורה רגילה.** ‏`import { Settings } from './settings'` בכל מקום אחר שנטען מראש מחזיר את הקוד ל-bundle ההתחלתי.
- **להשוות `Raw size` ל-`Estimated transfer size`.** ה-budget נמדד לפי הראשון.

## מה הלאה

בפוסט הבא: אבטחה ב-Angular. ‏sanitization של `[innerHTML]`, ‏`DomSanitizer`, ‏CSP, ‏Trusted Types ו-XSRF.
