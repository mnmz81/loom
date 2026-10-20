---
title: "interface או type ב-TypeScript?"
summary: "interface ו-type מתארים אובייקטים כמעט באותה צורה. ההבדלים: extends לעומת &, איחוד הצהרות של interface, ו-unions שרק type יודע לתאר. ומה התיעוד ממליץ."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 8 }
---

שתי דרכים לתת שם לטיפוס של אובייקט: `interface User { ... }` ו-`type User = { ... }`. ‏[התיעוד](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) אומר שכמעט כל מה ש-`interface` יודע לעשות, ‏`type` יודע גם, וההבדל העיקרי הוא שאת `interface` אפשר לפתוח מחדש ולהוסיף לו שדות.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## הרחבה: extends ו-&

```typescript
// shapes.ts
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

type Cat = Animal & { indoor: boolean };

const rex: Dog = { name: "Rex", breed: "Collie" };
const tom: Cat = { name: "Tom", indoor: true };
console.log(rex.breed, tom.indoor);
```

```text
Collie true
```

`interface` מרחיב עם `extends`, ו-`type` משלב עם `&` (intersection). התוצאה כאן זהה. ההבדל מופיע כששני החלקים לא מסכימים על שדה:

```typescript
// conflict.ts
interface Base {
  id: string;
}
interface WithNumber extends Base {
  id: number;
}

type Both = Base & { id: number };
const both: Both = { id: 1 };
```

```text
conflict.ts(5,11): error TS2430: Interface 'WithNumber' incorrectly extends interface 'Base'.
  Types of property 'id' are incompatible.
    Type 'number' is not assignable to type 'string'.
conflict.ts(10,22): error TS2322: Type 'number' is not assignable to type 'never'.
```

`extends` מדווח על הסתירה במקום שבו הוגדר הטיפוס. ‏`&` מקבל את ההגדרה בשקט, ו-`id` נהיה `never`, כי שום ערך הוא לא גם `string` וגם `number`. השגיאה מופיעה רק כשמנסים ליצור אובייקט.

## איחוד הצהרות

```typescript
// merge.ts
interface Config {
  host: string;
}
interface Config {
  port: number;
}
const config: Config = { host: "localhost" };

type Settings = { host: string };
type Settings = { port: number };
```

```text
merge.ts(8,7): error TS2741: Property 'port' is missing in type '{ host: string; }' but required in type 'Config'.
merge.ts(10,6): error TS2300: Duplicate identifier 'Settings'.
merge.ts(11,6): error TS2300: Duplicate identifier 'Settings'.
```

שתי ההצהרות של `Config` מתאחדות לטיפוס אחד עם `host` ו-`port`. ככה ספריות מאפשרות להוסיף שדות לטיפוסים שלהן, למשל ל-`Window`. ‏`type` עם אותו שם פעמיים הוא שגיאה.

## מה רק type יודע

`type` נותן שם לכל טיפוס, לא רק לאובייקט:

- union: ‏`type Id = string | number`
- tuple: ‏`type Pair = [string, number]`
- סוג של פונקציה: ‏`type Op = (a: number, b: number) => number`

את כל אלה `interface` לא יכול לתאר.

## אז מה לבחור

ההמלצה של התיעוד: "השתמשו ב-`interface` עד שתצטרכו משהו ש-`type` יודע לעשות". בפועל הרבה פרויקטים בוחרים אחד ונשארים איתו, וזה בסדר גמור.

## טעויות נפוצות של מתחילים

- **להשתמש ב-`&` כדי "לדרוס" שדה.** התוצאה היא `never` ולא דריסה. לדריסה יש `Omit` (בפוסט על utility types).
- **להצהיר על `interface` פעמיים בטעות.** אין שגיאה, השדות פשוט מתאחדים.
- **לנסות לכתוב union עם `interface`.** זה עובד רק עם `type`.

## מה הלאה

בפוסט הבא: unions ו-literal types.
