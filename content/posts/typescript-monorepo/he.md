---
title: "monorepo ב-TypeScript: ‏project references ו-tsc --build"
summary: "כמה חבילות בריפו אחד: tsconfig בסיס משותף עם extends, ‏composite ו-references, בנייה לפי סדר עם tsc -b, ו-paths בלי baseUrl, שהוצא משימוש ב-TypeScript 6.0."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 28 }
---

בריפו עם כמה חבילות, `tsconfig.json` אחד שבודק הכול נהיה איטי, וכל חבילה יכולה לייבא כל קובץ מכל חבילה אחרת. ‏[Project references](https://www.typescriptlang.org/docs/handbook/project-references.html) מחלקים את הריפו לפרויקטים נפרדים, ו-`tsc` בונה אותם לפי הסדר.

כל פקודה הורצה עם TypeScript 6.0.3 ו-7.0.2, ‏Node.js 24.21 ו-npm 11.19.

## המבנה

שתי חבילות: `core` עם פונקציה, ו-`app` שמשתמשת בה.

```text
package.json          "workspaces": ["packages/*"]
tsconfig.base.json
tsconfig.json
packages/
  core/  package.json  tsconfig.json  src/index.ts
  app/   package.json  tsconfig.json  src/main.ts
```

‏[npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces/) יוצר קישור ב-`node_modules` לכל חבילה, ולכן `app` מייבאת בשם החבילה: `import { formatPrice } from "@demo/core"`. ה-`package.json` של `core` מפנה לקבצים המקומפלים:

```json
{
  "name": "@demo/core",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

## ‏extends: הגדרות משותפות

מה שזהה בכל החבילות יושב בקובץ בסיס אחד:

```json
{
  "compilerOptions": {
    "target": "es2024",
    "module": "nodenext",
    "composite": true,
    "types": []
  }
}
```

כל חבילה טוענת אותו עם `extends` ומוסיפה את התיקיות שלה. זה `packages/app/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"],
  "references": [{ "path": "../core" }]
}
```

‏[לפי התיעוד](https://www.typescriptlang.org/tsconfig/extends.html), נתיב יחסי מתפרש ביחס לקובץ שבו הוא נכתב, ולכן `rootDir` ו-`outDir` נשארים בקובץ של כל חבילה. ‏`references` לא עובר בירושה בכלל. ה-tsconfig של `core` זהה, בלי `references`.

## ‏composite ו-references

‏`references` אומר ש-`app` תלויה ב-`core`. פרויקט שמפנים אליו חייב [`composite`](https://www.typescriptlang.org/tsconfig/composite.html), שמדליק את `declaration` (כך נוצרים קבצי `.d.ts`) ומחייב שכל קובץ בפרויקט ייכלל ב-`include` או ב-`files`. ‏`app` לא קוראת את קוד המקור של `core`, אלא את `dist/index.d.ts` שלה.

ה-`tsconfig.json` בשורש לא בודק קבצים בעצמו, רק מפנה לכל הפרויקטים:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/app" }
  ]
}
```

## ‏tsc --build

‏`tsc -b` (קיצור של `--build`) מוצא את כל הפרויקטים, בודק מי לא מעודכן ובונה לפי סדר התלויות. ‏`--verbose` מסביר כל החלטה (קיצרתי את הנתיבים המלאים):

```bash
npx tsc -b --verbose
node packages/app/dist/main.js
```

```text
11:20:21 PM - Projects in this build: 
    * packages/core/tsconfig.json
    * packages/app/tsconfig.json
    * tsconfig.json

11:20:21 PM - Project 'packages/core/tsconfig.json' is out of date because output file 'packages/core/tsconfig.tsbuildinfo' does not exist

11:20:21 PM - Building project '.../packages/core/tsconfig.json'...

11:20:21 PM - Project 'packages/app/tsconfig.json' is out of date because output file 'packages/app/tsconfig.tsbuildinfo' does not exist

11:20:21 PM - Building project '.../packages/app/tsconfig.json'...

$19.99
```

אחרי שינוי בתוך הפונקציה ב-`core`, ההרצה הבאה בונה רק את `core`. ‏`app` לא נבדקת מחדש, כי קובץ ה-`.d.ts` של `core` לא השתנה:

```text
11:20:22 PM - Project 'packages/core/tsconfig.json' is out of date because output 'packages/core/tsconfig.tsbuildinfo' is older than input 'packages/core/src/index.ts'

11:20:22 PM - Building project '.../packages/core/tsconfig.json'...

11:20:22 PM - Project 'packages/app/tsconfig.json' is up to date with .d.ts files from its dependencies
```

‏`tsc -b --clean` מוחק את כל הקבצים שנבנו.

## ‏paths בלי baseUrl

‏[`paths`](https://www.typescriptlang.org/tsconfig/paths.html) נותן קיצורים לייבוא בתוך חבילה. מ-TypeScript 6.0 כותבים את הנתיב המלא בתוך `paths`, בלי `baseUrl`:

```json
{
  "compilerOptions": {
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "paths": {
      "@app/*": ["./src/app/*"]
    }
  }
}
```

‏`allowImportingTsExtensions` (שעובד רק עם `noEmit`) מאפשר סיומת `.ts` בייבוא שלא מתחיל ב-`./`. ‏`tsc` מבין עכשיו את `import { vat } from "@app/price.ts"`, אבל Node.js [לא קורא את tsconfig](https://nodejs.org/api/typescript.html#paths-aliases), ולכן `node src/main.ts` נכשל (הנתיב מקוצר):

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@app/price.ts' imported from .../src/main.ts
```

החלופה ש-Node מבין היא [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) ב-`package.json`. מ-Node 24.14 ו-25.4 אפשר להתחיל אותם ב-`#/`, ו-TypeScript 6.0 תומכת בזה עם `module: nodenext` או `moduleResolution: bundler`:

```json
{
  "type": "module",
  "imports": {
    "#/*": "./src/*"
  }
}
```

עכשיו `import { vat } from "#/app/price.ts"` עובר גם ב-`tsc` וגם ב-`node`, בלי `paths`.

### בגרסאות קודמות

עד TypeScript 5.9 נהוג היה לכתוב `"baseUrl": "./src"` ובתוך `paths` רק `"@app/*": ["app/*"]`. ב-6.0 זו שגיאה:

```text
tsconfig.json(5,5): error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
```

‏TypeScript 7.0 כבר לא תומכת ב-`baseUrl` (שגיאה TS5102). עד Node 24.14, ‏subpath imports היו צריכים שם אחרי ה-`#`, כמו `#app/*`.

## טעויות נפוצות של מתחילים

- **לשים `rootDir` ו-`outDir` בקובץ הבסיס.** הם מתפרשים ביחס לשורש הריפו, ו-`tsc -b` נכשל עם TS6059, כי הקבצים לא נמצאים תחת `rootDir`.
- **להריץ `tsc` בלי `-b` בתוך חבילה.** בלי `--build`, ‏`tsc` לא בונה את הפרויקטים שהיא תלויה בהם, ועובד מול `.d.ts` ישן או חסר.
- **לשכוח `"files": []` בשורש.** בלי זה, ה-tsconfig בשורש בודק את כל הקבצים פעם נוספת.

## מה הלאה

בפוסט הבא: בדיקות ל-TypeScript עם Vitest, כולל בדיקות לטיפוסים עצמם.
