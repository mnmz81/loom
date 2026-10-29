---
title: "מודולים ב-TypeScript: ‏import, ‏export וסיומות"
summary: "קובץ בלי import או export הוא סקריפט עם שמות גלובליים. ‏export רגיל ו-default, ‏export type ו-re-export, ומתי import צריך סיומת: nodenext מול bundler."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 15 }
---

כל קובץ TypeScript הוא מודול או סקריפט. במודול, השמות שמוגדרים בקובץ שייכים רק לו, ומשתמשים בהם בקבצים אחרים דרך `export` ו-`import`. בסקריפט, הם גלובליים.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## סקריפט מול מודול

```ts
// script.ts
const name = "Dana";
console.log(name);
```

```bash
npx tsc --noEmit script.ts
```

```text
node_modules/typescript/lib/lib.dom.d.ts(43468,15): error TS2451: Cannot redeclare block-scoped variable 'name'.
script.ts(2,7): error TS2451: Cannot redeclare block-scoped variable 'name'.
```

בקובץ אין `import` ואין `export`, ולכן TypeScript מתייחסת אליו כסקריפט, וה-`name` שלו מתנגש ב-`name` הגלובלי שמוגדר ב-`lib.dom.d.ts` (‏`window.name` של הדפדפן). שני תיקונים:

- להוסיף `export {}` לקובץ. זה הופך אותו למודול בלי לייצא כלום.
- להגדיר [`"moduleDetection": "force"`](https://www.typescriptlang.org/tsconfig/#moduleDetection) ב-`tsconfig.json`: כל קובץ נחשב מודול.

עם `"module": "nodenext"` ו-`"type": "module"` ב-`package.json` (ההגדרה [מהפוסט על ההתקנה](he/posts/typescript-setup/)), ברירת המחדל `auto` כבר מתייחסת לכל קובץ כמודול.

## ‏export ו-import

```typescript
// user.ts
export type User = { name: string; age: number };

export function greet(user: User) {
  return `Hello, ${user.name}`;
}

export default function createUser(name: string): User {
  return { name, age: 0 };
}
```

```typescript
// index.ts
export { greet, type User } from "./user.ts";
export { default as createUser } from "./user.ts";
```

```typescript
// main.ts
import { createUser, greet, type User } from "./index.ts";

const dana: User = createUser("Dana");
console.log(greet(dana));
```

```bash
npx tsc && node main.ts
```

```text
Hello, Dana
```

- **named export** ‏(`export function greet`): מייבאים בסוגריים מסולסלים ובאותו שם.
- **default export**: אחד לכל קובץ, ומי שמייבא בוחר לו שם (`import createUser from "./user.ts"`).
- **re-export** ‏(`export { ... } from`): ‏`index.ts` מייצא מחדש מה שמוגדר בקובץ אחר, כדי שאפשר יהיה לייבא הכול ממקום אחד.
- ‏`type` לפני שם (`type User`) מסמן שזה טיפוס בלבד, והוא נמחק לפני הריצה. למה Node צריך את זה, [בפוסט על ההתקנה](he/posts/typescript-setup/). עם `verbatimModuleSyntax`, ‏`export { User }` בלי `type` הוא שגיאה TS1205.

## סיומות ב-import

```typescript
// app.ts
import { greet } from "./user";

console.log(greet({ name: "Dana", age: 30 }));
```

```bash
npx tsc
```

```text
app.ts(2,23): error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './user.js'?
```

הצורך בסיומת תלוי במי שטוען את הקבצים, וזה מה ש-[`moduleResolution`](https://www.typescriptlang.org/docs/handbook/modules/reference.html) מתאר:

- **‏`nodenext`**: ‏Node לא משלים סיומות ב-`import`, ולכן גם `tsc` דורש אותה. כותבים `./user.js` (שם הקובץ אחרי הקומפילציה), או `./user.ts` עם `rewriteRelativeImportExtensions` כמו בפוסט על ההתקנה.
- **‏`bundler`**: כלי bundling (‏Vite, ‏esbuild) מוצא את הקובץ גם בלי סיומת, ו-`./user` עובר. ‏`"module": "preserve"` גורר `bundler`, וזו ההגדרה בפרויקט Angular חדש.

### בגרסאות קודמות

לפני שהיו מודולים ב-JavaScript, ב-TypeScript ארגנו קוד ב-[`namespace`](https://www.typescriptlang.org/docs/handbook/namespaces-and-modules.html): אובייקט גלובלי עם שם. בגרסאות ישנות מאוד קראו לזה "internal module" וכתבו `module` במקום `namespace`. ב-[6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) זו שגיאה:

```typescript
// legacy.ts (run with tsx)
module Geometry {
  export const PI = 3.14;
}

namespace Units {
  export const cm = 0.01;
}

console.log(Geometry.PI, Units.cm);
```

```text
legacy.ts(2,8): error TS1540: A 'namespace' declaration should not be declared using the 'module' keyword. Please use the 'namespace' keyword instead.
3.14 0.01
```

‏`namespace` עדיין עובד, אבל המדריך ממליץ על מודולים בקוד חדש, ו-`namespace` עם קוד לא רץ ב-Node בלי tsx. בקוד CommonJS תמצאו `require` ו-`module.exports`, ואת המקבילות של TypeScript: ‏`import fs = require("fs")` ו-`export =`.

## טעויות נפוצות של מתחילים

- **קובץ ניסיון בלי `import` או `export`.** משתנים כמו `name` או `status` מתנגשים בשמות גלובליים. מוסיפים `export {}`.
- **‏`import greet from "./user.ts"` כשהפונקציה היא named export.** מקבלים את ה-default, כאן `createUser`. כותבים `import { greet }`.
- **להעתיק `import` בלי סיומת מפרויקט Vite לפרויקט Node.** ב-`nodenext` זו שגיאה TS2835.

## מה הלאה

בפוסט הבא: decorators, ההבדל בין הגרסה הסטנדרטית ל-`experimentalDecorators`, ובאיזו מהן Angular משתמשת.
