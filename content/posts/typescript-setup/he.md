---
title: "התקנת TypeScript: ‏tsc, הרצה ישירה ב-Node.js ו-tsx"
summary: "מתקינים TypeScript, כותבים tsconfig.json מינימלי, בודקים עם tsc ומריצים קבצי .ts ישירות ב-Node.js. מה Node לא יודע להריץ, איך erasableSyntaxOnly תופס את זה, ומתי צריך tsx."
date: 2026-10-20
tags: [typescript, dev-tools]
series: { key: typescript, order: 2 }
---

בפרויקט TypeScript יש שני שלבים נפרדים: **בדיקה** (`tsc` מוצא שגיאות טיפוסים) ו**הרצה** (Node.js מריץ את הקוד). הכלים פה עושים כל אחד מהם בנפרד, וחשוב לדעת מי עושה מה.

כל פקודה הורצה עם TypeScript 6.0.3 ו-7.0.2, ‏Node.js 24.21 ו-tsx 4.23.

## התקנה

מתקינים את TypeScript כתלות פיתוח של הפרויקט, ולא גלובלית, כדי שכל מי שעובד עליו יקבל אותה גרסה:

```bash
npm install --save-dev typescript@6
npx tsc --version
```

```text
Version 6.0.3
```

‏`typescript` בלי גרסה מתקין היום את 7.0 (`Version 7.0.2`), הקומפיילר החדש שכתוב ב-Go. הסדרה עובדת עם 6.0, כי כלים שבנויים על הקומפיילר, כמו Angular 22, עדיין דורשים אותה. כל הדוגמאות נבדקו גם ב-7.0, וההבדלים מפורטים ב[פוסט על TypeScript 7](he/posts/typescript-7-native/).

## ‏tsconfig.json

הקובץ הזה אומר ל-`tsc` איך לבדוק את הקוד. זו התצורה ש-[התיעוד של Node.js](https://nodejs.org/api/typescript.html) ממליץ עליה כשמריצים `.ts` ישירות:

```json
{
  "compilerOptions": {
    "noEmit": true,
    "target": "esnext",
    "module": "nodenext",
    "rewriteRelativeImportExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true
  }
}
```

- `noEmit`: ‏`tsc` רק בודק ולא כותב קבצי `.js`, כי Node מריץ את ה-`.ts` עצמו.
- `module: "nodenext"`: הקוד נבדק לפי הכללים של Node.js ל-`import` ו-`export`.
- `erasableSyntaxOnly` ו-`verbatimModuleSyntax`: שגיאה על כל דבר ש-Node לא יודע להריץ (פירוט בהמשך).

ב-`package.json` מוסיפים `"type": "module"`, כדי ש-Node יתייחס לקבצים כ-ES modules. את `strict` לא צריך לכתוב: מ-TypeScript 6.0 הוא דולק כברירת מחדל. ‏`npx tsc --init` יוצר קובץ מלא יותר עם הערות, והפוסט הבא עובר על האפשרויות.

## בדיקה עם tsc

```typescript
// hello.ts
function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet("Dana"));
console.log(greet(42));
```

```bash
npx tsc
```

```text
hello.ts(7,19): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

בלי שמות קבצים, ‏`tsc` בודק את כל הפרויקט לפי `tsconfig.json`.

## הרצה ישירה ב-Node.js

```bash
node hello.ts
```

```text
Hello, Dana!
Hello, 42!
```

Node.js מוחק את הטיפוסים ומריץ את מה שנשאר. השיטה נקראת type stripping: היא דולקת כברירת מחדל מ-Node 22.18 ו-23.6, ויציבה מ-24.12. היא לא בודקת טיפוסים, ולכן `greet(42)` רץ בלי שום אזהרה. גם את `tsconfig.json` היא לא קוראת. שני כללים נובעים מזה:

- ב-`import` חייבים לכתוב סיומת: `"./user.ts"` ולא `"./user"`.
- ייבוא של טיפוס בלבד נכתב `import type { User }`. בלי `type`, ‏Node מחפש ערך בשם `User` ונכשל בזמן ריצה. ‏`verbatimModuleSyntax` תופס את זה ב-`tsc` עם שגיאה TS1484.

### מה Node לא יודע להריץ

מחיקה עובדת רק על תחביר שאפשר להסיר ולקבל JavaScript תקין. ‏`enum` מייצר קוד בזמן ריצה, ולכן נכשל:

```typescript
// status.ts
enum Status {
  Active,
  Blocked,
}

console.log(Status.Blocked);
```

```text
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode
```

אותו דבר קורה ל-`namespace` עם קוד, ל-parameter properties במחלקות (`constructor(public x: number)`) ול-`import x = require(...)`.

## ‏erasableSyntaxOnly

בלי האפשרות הזו, `status.ts` עובר את `tsc` בלי שגיאה ונכשל רק כשמריצים. איתה, ‏`tsc` מדווח מראש גם על זה:

```bash
npx tsc
```

```text
status.ts(2,6): error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

## ‏tsx

[tsx](https://tsx.is/) הוא כלי שמריץ TypeScript עם תמיכה מלאה בתחביר, כולל `enum`:

```bash
npm install --save-dev tsx
npx tsx status.ts
```

```text
1
```

גם tsx לא בודק טיפוסים. הוא שימושי כשהקוד משתמש בתחביר ש-Node לא מריץ, או ב-`paths` מתוך `tsconfig.json`.

## איזה כלי מתי

| מה צריך | הכלי |
|---|---|
| למצוא שגיאות טיפוסים | `npx tsc` |
| להריץ קוד שכולו תחביר מחיק | `node file.ts` |
| להריץ קוד עם `enum`, ‏`namespace` או `paths` | `npx tsx file.ts` |
| להפיק קבצי `.js` להפצה | `tsc` בלי `noEmit`, עם `outDir` |

### בגרסאות קודמות

לפני type stripping, ‏Node הריץ רק JavaScript. היו שתי דרכים: לקמפל עם `tsc` לתיקיית `dist` ולהריץ את ה-`.js`, או להריץ דרך ts-node, שקימפל בזמן ההרצה. ב-Node 22.6 עד 22.17 type stripping כבר היה קיים, אבל רק עם הדגל `--experimental-strip-types`. ‏`erasableSyntaxOnly` נוסף ב-TypeScript 5.8, ולכן בפרויקטים ישנים הוא בדרך כלל חסר.

## טעויות נפוצות של מתחילים

- **להריץ `node file.ts` ולחשוב שהקוד נבדק.** רק `tsc` בודק. כדאי להריץ אותו לפני כל commit, או ב-CI.
- **לייבא בלי סיומת.** ‏`import { greet } from "./hello"` נכשל ב-Node. כותבים `"./hello.ts"`.
- **להתקין את TypeScript גלובלית.** כל מחשב מקבל גרסה אחרת. ‏`npx tsc` מריץ את הגרסה של הפרויקט.

## מה הלאה

בפוסט הבא: ‏`tsconfig.json` לעומק, ומה השתנה בברירות המחדל של TypeScript 6.0.
