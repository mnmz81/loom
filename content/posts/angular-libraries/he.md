---
title: "ספריות Angular: ng generate library, ‏public-api.ts ו-ng-packagr"
summary: "יצירת ספריית Angular בתוך workspace, מה נכנס ל-public-api.ts, ‏build עם ng-packagr ומה יוצא ב-dist, נקודת כניסה משנית, ואיך אורזים ומפרסמים ל-npm."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 79 }
---

קומפוננטות שכמה אפליקציות צריכות עוברות לספרייה: חבילה שנבנית בנפרד ואפשר לייבא אותה בשם, באותו workspace או מ-npm.

כל דוגמה נבדקה עם Angular 22.2 ו-ng-packagr 22.2.

## יצירת ספרייה

בתוך workspace קיים:

```bash
ng generate library ui-kit
```

```text
CREATE projects/ui-kit/ng-package.json (155 bytes)
CREATE projects/ui-kit/package.json (210 bytes)
CREATE projects/ui-kit/tsconfig.lib.json (486 bytes)
CREATE projects/ui-kit/tsconfig.lib.prod.json (401 bytes)
CREATE projects/ui-kit/src/public-api.ts (70 bytes)
CREATE projects/ui-kit/src/lib/ui-kit.ts (194 bytes)
UPDATE angular.json (2659 bytes)
UPDATE package.json (816 bytes)
UPDATE tsconfig.json (1111 bytes)
```

(מקוצר: הושמטו README, ‏spec ו-tsconfig של הבדיקות.) מעבר לתיקייה `projects/ui-kit`, הפקודה הוסיפה פרויקט מסוג `library` ל-`angular.json`, את `ng-packagr` ל-`devDependencies`, ומיפוי ב-`tsconfig.json`: ‏`"ui-kit": ["./dist/ui-kit"]`. בזכות המיפוי, ‏`import ... from 'ui-kit'` באפליקציה מגיע לספרייה הבנויה.

## ‏public-api.ts

```typescript
// projects/ui-kit/src/lib/badge.ts
import { Component, input } from '@angular/core';
import { clamp } from './clamp';

@Component({
  selector: 'ui-badge',
  template: `<span class="badge">{{ label() }} ({{ shown() }})</span>`,
})
export class Badge {
  readonly label = input.required<string>();
  readonly count = input(0);
  protected shown = () => clamp(this.count(), 99);
}

// projects/ui-kit/src/public-api.ts
export { Badge } from './lib/badge';
```

לפי [המדריך](https://angular.dev/tools/libraries/creating-libraries), כל מה שמיוצא מ-`public-api.ts` הוא ה-API הציבורי של הספרייה. ‏`clamp` (פונקציה שמחזירה את הקטן מבין שני מספרים) לא מיוצא, ולכן קובץ הטיפוסים שנבנה מכיל רק את `Badge`. מה שלא נכנס לכאן אפשר לשנות בלי לשבור את מי שמשתמש בספרייה.

## ‏build עם ng-packagr

```bash
ng build ui-kit
```

```text
Building entry point 'ui-kit'
------------------------------------------------------------------------------
✔ Compiling with Angular sources in partial compilation mode.
✔ Generating FESM and DTS bundles
✔ Copying assets
✔ Writing package manifest
✔ Built ui-kit
```

(הפלט מקוצר.) ספרייה נבנית ב-builder אחר מאפליקציה, ‏`@angular/build:ng-packagr`. התוצאה ב-`dist/ui-kit`:

```text
dist/ui-kit/README.md
dist/ui-kit/fesm2022/ui-kit.mjs
dist/ui-kit/fesm2022/ui-kit.mjs.map
dist/ui-kit/package.json
dist/ui-kit/types/ui-kit.d.ts
```

‏`partial compilation mode` מגיע מ-`tsconfig.lib.prod.json`, שבו `"compilationMode": "partial"`. ה-build משתמש בו כי `production` היא ברירת המחדל של הספרייה. לפי המדריך, הפורמט הזה יציב בין גרסאות Angular ולכן בטוח לפרסום, והאפליקציה שמתקינה את הספרייה משלימה את הקומפילציה.

## שימוש באפליקציה

```typescript
import { Component } from '@angular/core';
import { Badge } from 'ui-kit';

@Component({
  selector: 'app-root',
  imports: [Badge],
  template: `<ui-badge label="Inbox" [count]="3" />`,
})
export class App {}
```

אי אפשר להשתמש בספרייה לפני שהיא נבנתה: המיפוי מצביע על `dist`, לא על קוד המקור. בזמן פיתוח, ‏`ng build ui-kit --watch` בונה אותה מחדש בכל שינוי. את הספרייה עצמה בודקים עם `ng test ui-kit`.

## נקודת כניסה משנית

נקודת כניסה משנית היא תיקייה בתוך הספרייה עם `ng-package.json` משלה, ומייבאים אותה כנתיב משנה, למשל `ui-kit/testing`:

```json
{
  "lib": {
    "entryFile": "src/public-api.ts"
  }
}
```

הקובץ הזה ב-`projects/ui-kit/testing/`, ולידו `src/public-api.ts`, מספיקים. ‏`ng build ui-kit` בונה עכשיו שתיים:

```text
Building entry point 'ui-kit'
✔ Built ui-kit
Building entry point 'ui-kit/testing'
✔ Built ui-kit/testing
```

ב-`package.json` שנבנה נוסף `"./testing"` ל-`exports`. כדי לייבא אותה באותו workspace צריך גם מיפוי `"ui-kit/*"` ב-`tsconfig.json`. כך קוד שמשמש רק בבדיקות לא נכנס למי שמייבא את `ui-kit`.

## פרסום

מפרסמים מתיקיית `dist`, לא מ-`projects`. ‏`npm pack --dry-run` מראה מה ייכנס לחבילה בלי ליצור אותה:

```bash
cd dist/ui-kit
npm pack --dry-run
```

```text
npm notice package: ui-kit@0.0.1
npm notice Tarball Contents
npm notice 1.4kB README.md
npm notice 114B fesm2022/ui-kit-testing.mjs
npm notice 239B fesm2022/ui-kit-testing.mjs.map
npm notice 1.7kB fesm2022/ui-kit.mjs
npm notice 1.4kB fesm2022/ui-kit.mjs.map
npm notice 600B package.json
npm notice 49B types/ui-kit-testing.d.ts
npm notice 581B types/ui-kit.d.ts
```

(הפלט מקוצר.) אחר כך `npm publish` מאותה תיקייה. השם והגרסה באים מ-`projects/ui-kit/package.json`, ושם גם `peerDependencies`: ‏`@angular/core` ו-`@angular/common` ‏`^22.2.0`. האפליקציה מביאה את Angular שלה, והספרייה לא מתקינה עותק שני.

## טעויות נפוצות של מתחילים

- **לייבא מ-`projects/ui-kit/src/...` במקום מ-`'ui-kit'`.** זה עוקף את ה-API הציבורי ואת ה-build, ושובר את ההפרדה.
- **לשכוח לבנות מחדש.** האפליקציה רואה את מה שיש ב-`dist`, ושינוי בקוד המקור לא מגיע אליה בלי `ng build ui-kit` או `--watch`.
- **להריץ `npm publish` מתיקיית הפרויקט.** מה שמתפרסם אז הוא קוד TypeScript לא בנוי.

## מה הלאה

בפוסט הבא: שדרוג גרסה עם `ng update`, ומה המיגרציות שלו משנות בקוד.
