---
title: "קובצי הצהרה .d.ts ב-TypeScript: ‏declaration, ‏@types ו-declare module"
summary: "מה יש בקובץ .d.ts, איך declaration: true יוצר אותו, מאיפה מגיעים הטיפוסים של חבילות (@types), ‏declare למשתנה גלובלי, ‏declare module לחבילה בלי טיפוסים, ומה skipLibCheck מדלג עליו."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 25 }
---

קובץ `.d.ts` מכיל רק טיפוסים: אין בו קוד שרץ ואין בו ערכים. ‏TypeScript קוראת אותו כדי לדעת איך נראה קוד JavaScript שהמקור שלו לא לפניה. כך היא מכירה את `fetch` (מ-`lib.dom.d.ts`), את החבילות ב-`node_modules` ומשתנים גלובליים משלכם. ההסבר המלא נמצא ב[מדריך לקובצי הצהרה](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html).

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## ‏declaration: true יוצר .d.ts

כשכותבים ספרייה ב-TypeScript ומפרסמים JavaScript, ‏[`declaration`](https://www.typescriptlang.org/tsconfig/#declaration) כותב ליד כל קובץ `.js` גם `.d.ts`, כדי שמי שמשתמש בספרייה יקבל את הטיפוסים:

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true
  },
  "include": ["src"]
}
```

```typescript
// price.ts
export interface Price {
  amount: number;
  currency: "ILS" | "USD";
}

export function formatPrice(price: Price): string {
  return `${price.amount.toFixed(2)} ${price.currency}`;
}
```

```bash
tsc
ls dist
cat dist/price.d.ts
```

```text
price.d.ts
price.js
export interface Price {
    amount: number;
    currency: "ILS" | "USD";
}
export declare function formatPrice(price: Price): string;
```

גוף הפונקציה נעלם, ונשארה רק החתימה עם `declare`: "הפונקציה הזו קיימת, והקוד שלה נמצא במקום אחר". ‏`emitDeclarationOnly` כותב רק את קובצי ה-`.d.ts`, למשל כשכלי אחר מייצר את ה-JavaScript.

## מאיפה מגיעים הטיפוסים של חבילות

לחבילה ב-npm יש טיפוסים באחת משתי דרכים:

- **בתוך החבילה.** שדה `types` ב-`package.json` שלה מצביע על `.d.ts`. ‏zod, למשל, עובדת כך, ואין מה להתקין מלבדה.
- **חבילת `@types/<name>`** מ-DefinitelyTyped, שמתקינים בנפרד: `npm install --save-dev @types/node`.

‏[לפי מסמך ה-module resolution](https://www.typescriptlang.org/docs/handbook/modules/reference.html), ‏TypeScript מחפשת קודם בחבילה עצמה ואחר כך ב-`node_modules/@types`. האפשרות [`types`](https://www.typescriptlang.org/tsconfig/#types) משפיעה רק על טיפוסים גלובליים, כמו `process` מ-`@types/node`: מ-6.0 ברירת המחדל היא `[]`, וצריך לכתוב `"types": ["node"]`, כמו שמופיע ב[פוסט על tsconfig](he/posts/typescript-tsconfig/). ‏`import` מחבילה שיש לה `@types` עובד בלי קשר לרשימה הזו.

## ‏declare: משתנה גלובלי שמגיע מבחוץ

לפעמים ערך מוגדר מחוץ לקוד שלכם: סקריפט שנטען בדף, או bundler שמחליף שם בערך. ‏`declare` מספר ל-TypeScript שהוא קיים, ולא יוצר כלום:

```typescript
// version.ts
declare const APP_VERSION: string;

console.log(APP_VERSION.toUpperCase());
```

```text
ReferenceError: APP_VERSION is not defined
```

‏`tsc` מקבל את הקוד, אבל בזמן ריצה אין מי שהגדיר את `APP_VERSION`, ולכן השגיאה. בפרויקט שמים הצהרות כאלה בקובץ כמו `globals.d.ts` בתוך `include`. קובץ `.d.ts` בלי `import` או `export` הוא גלובלי, וכל הקבצים בפרויקט רואים את מה שהוא מצהיר.

## ‏declare module לחבילה בלי טיפוסים

נניח חבילה ישנה שכתובה ב-JavaScript, בלי `@types`. כאן היא נקראת `legacy-slug` ומייצאת פונקציה אחת:

```typescript
// slug.ts
import slugify from "legacy-slug";

console.log(slugify("Hello World"));
```

```bash
tsc
```

```text
src/slug.ts(2,21): error TS7016: Could not find a declaration file for module 'legacy-slug'. '…/node_modules/legacy-slug/index.js' implicitly has an 'any' type.
  Try `npm i --save-dev @types/legacy-slug` if it exists or add a new declaration (.d.ts) file containing `declare module 'legacy-slug';`
```

השגיאה מגיעה מ-`noImplicitAny`, שדולק עם `strict`. מוסיפים קובץ `src/legacy-slug.d.ts` שמתאר רק את מה שמשתמשים בו:

```typescript
// legacy-slug.d.ts
declare module "legacy-slug" {
  export default function slugify(text: string): string;
}
```

```bash
tsc && node src/slug.ts
```

```text
hello-world
```

הגרסה הקצרה שהשגיאה מציעה, `declare module "legacy-slug";` בלי גוף, משתיקה את השגיאה, אבל כל מה שמיובא מהחבילה הופך ל-`any`.

## ‏skipLibCheck

‏[`skipLibCheck`](https://www.typescriptlang.org/tsconfig/#skipLibCheck) מדלג על בדיקת הטיפוסים של כל קובצי ה-`.d.ts`, גם אלה ב-`node_modules` וגם שלכם. הבנייה מהירה יותר, והקוד שלכם עדיין נבדק מול ההצהרות. המחיר: אם שתי ספריות מגדירות את אותו טיפוס בצורה סותרת, לא תשמעו על זה.

## טעויות נפוצות של מתחילים

- **קוד בתוך `.d.ts`.** ‏`tsc` דוחה גוף של פונקציה בקובץ הצהרה (TS1183).
- **‏`import` בראש `globals.d.ts`.** הקובץ הופך למודול, וההצהרות בו כבר לא גלובליות (TS2304 בשימוש). אם צריך `import`, עוטפים את ההצהרות ב-`declare global { }`.
- **להתקין `@types` לחבילה שכבר מגיעה עם טיפוסים.** החבילה כבר מביאה את ה-`.d.ts` שלה, ו-`@types` מיותר.

## מה הלאה

בפוסט הבא: מעבר של פרויקט JavaScript ל-TypeScript.
