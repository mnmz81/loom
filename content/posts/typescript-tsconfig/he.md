---
title: "‏tsconfig.json: האפשרויות שחשובות וברירות המחדל של TypeScript 6.0"
summary: "מה יש ב-tsconfig.json: אילו קבצים נבדקים, target, ‏module, ‏rootDir ו-outDir, ‏types, ומה strict מדליק. ומה השתנה בברירות המחדל של TypeScript 6.0 לעומת 5.x."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 3 }
---

‏`tsconfig.json` מסמן את שורש הפרויקט. כשמריצים `tsc` בלי שמות קבצים, הוא מחפש את הקובץ הזה ובודק לפיו. [המדריך המלא לכל אפשרות](https://www.typescriptlang.org/tsconfig/) ארוך מאוד; הפוסט הזה עובר רק על מה שמשנה בפרויקט רגיל.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2.

## קובץ התחלה

פרויקט Node שמקמפל מ-`src` ל-`dist`:

```json
{
  "compilerOptions": {
    "target": "es2024",
    "module": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"]
  },
  "include": ["src"]
}
```

- `include`: אילו קבצים בפרויקט. בלי `include` ובלי `files`, ‏`tsc` לוקח את כל קבצי ה-`.ts` בתיקייה ומתחתיה. ‏`exclude` מוציא חלק מהם.
- `target`: לאיזו גרסת JavaScript לקמפל. תחביר חדש יותר מה-target מתורגם לתחביר ישן.
- `module`: באיזו מערכת מודולים הקוד נבדק ונכתב. ‏`nodenext` לקוד שרץ ב-Node.js, ו-`preserve` (עם `moduleResolution: "bundler"`) לקוד שעובר דרך bundler כמו Vite או esbuild. ‏Angular, למשל, משתמש ב-`preserve`.

## ‏rootDir ו-outDir

‏`outDir` הוא לאן נכתבים קבצי ה-`.js`, ו-`rootDir` הוא איזו תיקייה משוכפלת לתוכו. בלי `rootDir`, ‏TypeScript 6.0 מניח שהוא התיקייה של `tsconfig.json` ומסרב:

```bash
tsc
```

```text
tsconfig.json(3,5): error TS5011: The common source directory of 'tsconfig.json' is './src'. The 'rootDir' setting must be explicitly set to this or another path to adjust your output's file layout.
  Visit https://aka.ms/ts6 for migration information.
```

הקובץ נכתב בכל זאת ל-`dist/src/index.js` ולא ל-`dist/index.js`. ‏`"rootDir": "./src"` מתקן את שניהם.

## ‏types

‏`types` קובע אילו חבילות `@types` נטענות אוטומטית. מ-6.0 ברירת המחדל היא `[]`, כלומר אף אחת. בלי `"types": ["node"]`, גם אחרי `npm install --save-dev @types/node`:

```bash
tsc
```

```text
src/index.ts(1,13): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
```

## מה strict מדליק

‏`strict` הוא קיצור לקבוצה של בדיקות: ‏`noImplicitAny`, ‏`strictNullChecks`, ‏`strictFunctionTypes`, ‏`strictBindCallApply`, ‏`strictPropertyInitialization`, ‏`strictBuiltinIteratorReturn`, ‏`noImplicitThis`, ‏`useUnknownInCatchVariables` ו-`alwaysStrict`. מ-6.0 הוא דולק כברירת מחדל. שתי הבדיקות שתופסות הכי הרבה:

```typescript
// strict.ts
function double(x) {
  return x * 2;
}

function firstChar(s: string | null) {
  return s.charAt(0);
}
```

```text
strict.ts(2,17): error TS7006: Parameter 'x' implicitly has an 'any' type.
strict.ts(7,10): error TS18047: 's' is possibly 'null'.
```

הראשונה היא `noImplicitAny`: פרמטר בלי טיפוס לא הופך בשקט ל-`any`. השנייה היא `strictNullChecks`: אי אפשר לקרוא ל-`charAt` על ערך שאולי `null`. אפשר לכבות בדיקה בודדת (`"strictNullChecks": false`) ולהשאיר את השאר.

## ‏extends

כמה פרויקטים יכולים לשתף בסיס אחד: `"extends": "./tsconfig.base.json"` טוען את הקובץ ההוא, וכל אפשרות בקובץ הנוכחי דורסת אותו. כך עובד גם ה-`tsconfig.json` ש-Angular יוצר: קובץ בסיס, ומעליו `tsconfig.app.json` ו-`tsconfig.spec.json`.

### בגרסאות קודמות

[TypeScript 6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) שינה כמה ברירות מחדל. ‏tsconfig שנכתב ל-5.x ולא ציין אותן יתנהג אחרת:

| אפשרות | עד 5.9 | מ-6.0 |
|---|---|---|
| `strict` | `false` | `true` |
| `target` | `es5` | `es2025` (השנה הנוכחית) |
| `module` | `commonjs` | `esnext` |
| `types` | כל חבילות `@types` | `[]` |
| `rootDir` | התיקייה המשותפת לכל הקבצים | התיקייה של `tsconfig.json` |

‏6.0 גם סימן כ-deprecated את `target: "es5"`, ‏`baseUrl` ו-`moduleResolution: "node"`. ב-7.0 הם כבר לא נתמכים, ואפשר להשתיק את האזהרה זמנית עם `"ignoreDeprecations": "6.0"`.

## טעויות נפוצות של מתחילים

- **להריץ `tsc file.ts` בפרויקט עם `tsconfig.json`.** מ-6.0 זו שגיאה (TS5112), כי ה-tsconfig לא נטען. מריצים `tsc` לבד.
- **לכבות את `strict` כדי שהשגיאות ייעלמו.** הן נעלמות מהמסך, לא מהקוד.
- **לשכוח `rootDir` כשמוסיפים `outDir`.** השגיאה TS5011 מלמעלה.

## מה הלאה

בפוסט הבא: הטיפוסים הבסיסיים, ומתי TypeScript מסיקה אותם לבד.
