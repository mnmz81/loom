---
title: "מעבר מ-JavaScript ל-TypeScript: ‏allowJs, ‏checkJs ו-JSDoc"
summary: "איך מעבירים פרויקט JavaScript ל-TypeScript קובץ אחרי קובץ: allowJs, הערת ts-check, טיפוסים ב-JSDoc, שינוי שם ל-.ts, הדלקת strict בהדרגה, ו-@ts-expect-error מול @ts-ignore."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 26 }
---

לא צריך לשנות את כל הקבצים ל-`.ts` ביום אחד. ‏TypeScript יודעת לבדוק קבצי JavaScript כמו שהם, וכך אפשר להתקדם קובץ אחרי קובץ, כשהפרויקט ממשיך לרוץ כל הזמן. [המדריך הרשמי למעבר](https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html) מתאר את אותו סדר.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2.

## ‏allowJs: קבצי JS בתוך הפרויקט

נקודת ההתחלה היא `tsconfig.json` שמכניס את קבצי ה-JavaScript הקיימים לפרויקט:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "noEmit": true,
    "module": "nodenext",
    "strict": false
  },
  "include": ["src"]
}
```

‏`allowJs` אומר ל-`tsc` לקרוא גם קבצי `.js`, כך שקובץ `.ts` חדש יכול לייבא מהם. מ-TypeScript 6.0 ‏`strict` דולק כברירת מחדל, ובקוד שנכתב בלי טיפוסים הוא מייצר מאות שגיאות בבת אחת. לכן מתחילים עם `"strict": false` ומדליקים את הבדיקות אחת-אחת בהמשך.

## ‏`// @ts-check` בקובץ אחד

עם `allowJs` בלבד, ‏`tsc` לא מדווח על שגיאות בקבצי JS. ההערה `// @ts-check` בראש קובץ מדליקה את הבדיקה רק בו. בקובץ JS כותבים את הטיפוסים בהערות [JSDoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html), ו-TypeScript בודקת לפיהן:

```javascript
// @ts-check

/**
 * @typedef {object} Item
 * @property {string} name
 * @property {number} price
 */

/**
 * @param {Item[]} items
 * @returns {number}
 */
export function total(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

total([{ name: "pen", price: "3" }]);
```

```bash
npx tsc
```

```text
src/cart.js(17,23): error TS2322: Type 'string' is not assignable to type 'number'.
```

‏`@typedef` מגדיר טיפוס (כמו `type`), ‏`@param` ו-`@returns` נותנים טיפוס לפרמטר ולערך המוחזר. הקוד עצמו נשאר JavaScript רגיל שרץ כמו שהוא.

## ‏checkJs: כל קבצי ה-JS

כשרוב הקבצים כבר עוברים, מוסיפים `"checkJs": true`. [לפי התיעוד](https://www.typescriptlang.org/tsconfig/checkJs.html) זה כמו לשים `// @ts-check` בראש כל קובץ JS בפרויקט. עכשיו גם קובץ בלי ההערה נבדק:

```javascript
export const age = parseInt(42);
```

```text
src/user.js(1,29): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

קובץ שעוד לא מוכן מוציאים מהבדיקה עם `// @ts-nocheck` בשורה הראשונה שלו. ‏[TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) שינתה את הבדיקה של קבצי JS כך שתתנהג יותר כמו בקבצי TS, ולכן קוד JS שעבר ב-6.0 יכול לקבל שגיאות חדשות.

## שינוי שם ל-.ts והדלקת strict

משנים שם לקובץ אחד: `cart.js` הופך ל-`cart.ts`. ‏`tsc` עובר בלי שגיאה, אבל בקובץ `.ts` ‏TypeScript כבר לא קוראת טיפוסים מ-JSDoc, ו-`items` הפך בשקט ל-`any`. ‏`noImplicitAny`, הבדיקה הראשונה ששווה להדליק, חושפת את זה:

```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true
  }
}
```

```text
src/cart.ts(13,23): error TS7006: Parameter 'items' implicitly has an 'any' type.
src/cart.ts(14,24): error TS7006: Parameter 'sum' implicitly has an 'any' type.
src/cart.ts(14,29): error TS7006: Parameter 'item' implicitly has an 'any' type.
```

מעבירים את הטיפוסים מה-JSDoc לתחביר של TypeScript, והשגיאה האמיתית חוזרת:

```typescript
// cart.ts
type Item = { name: string; price: number };

export function total(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

total([{ name: "pen", price: "3" }]);
```

```text
cart.ts(8,23): error TS2322: Type 'string' is not assignable to type 'number'.
```

אחרי `noImplicitAny` מגיע `strictNullChecks`, ואחריו שאר הבדיקות של [`strict`](he/posts/typescript-tsconfig/). כשכולן דולקות, מוחקים את `"strict": false` ואת השורות הבודדות, וחוזרים לברירת המחדל.

## ‏`@ts-expect-error` מול `@ts-ignore`

שתי ההערות משתיקות שגיאה בשורה שאחריהן. [ההבדל](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html#-ts-expect-error-comments): ‏`@ts-expect-error` מדווחת כשאין יותר שגיאה להשתיק, ו-`@ts-ignore` שותקת תמיד:

```typescript
// suppress.ts
// @ts-expect-error
const a: number = "one";

// @ts-ignore
const b: number = "two";

// @ts-expect-error
const c: number = 3;
```

```text
suppress.ts(8,1): error TS2578: Unused '@ts-expect-error' directive.
```

במעבר עדיף `@ts-expect-error`: כשמישהו מתקן את הקוד, ‏`tsc` מזכיר למחוק את ההערה, והיא לא נשארת בקוד לנצח.

## טעויות נפוצות של מתחילים

- **לשנות את שם כל הקבצים בבת אחת.** מקבלים מאות שגיאות ואין דרך לדעת מאיפה להתחיל. קובץ אחד בכל פעם, ו-`tsc` נקי לפני הקובץ הבא.
- **להשאיר טיפוסים ב-JSDoc אחרי שינוי השם ל-`.ts`.** בקובץ TS הם לא נבדקים. מעבירים אותם לתחביר.
- **להשתיק עם `any` או `@ts-ignore` כדי "לסגור" קובץ.** השגיאה נשארת בקוד, רק בלי סימון. ‏`@ts-expect-error` לפחות מזכירה לחזור אליה.

## מה הלאה

בפוסט הבא: איך קוראים הודעת שגיאה של `tsc`, ומה אומרים הקודים הנפוצים.
