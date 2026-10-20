---
title: "keyof, ‏typeof ו-indexed access types ב-TypeScript"
summary: "keyof מחזיר את שמות השדות, typeof בעמדת טיפוס מחזיר את הטיפוס של משתנה, ו-T[\"prop\"] שולף טיפוס של שדה. ומה זה (typeof arr)[number] ואיך כותבים get(obj, key) בטוח."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 19 }
---

שלושה אופרטורים שבונים טיפוס מטיפוס אחר או מערך קיים, כך שאת אותו מידע כותבים פעם אחת.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## ‏keyof: שמות השדות

```typescript
// keyof.ts
type Book = { title: string; year: number; inStock: boolean };
type BookKey = keyof Book;

const sortKey: BookKey = "year";
const typo: BookKey = "yaer";
console.log(sortKey);
```

```text
keyof.ts(6,7): error TS2322: Type '"yaer"' is not assignable to type 'keyof Book'.
year
```

‏[`keyof`](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html) מחזיר union של שמות השדות: ‏`"title" | "year" | "inStock"`. כשמוסיפים שדה ל-`Book`, גם `BookKey` מתעדכן.

## ‏typeof בעמדת טיפוס

```typescript
// typeof.ts
const defaults = { theme: "dark", fontSize: 14, autosave: true };
type Settings = typeof defaults;

const mine: Settings = { theme: "light", fontSize: 16, autosave: false };
console.log(typeof defaults, typeof mine.fontSize);
const broken: Settings = { theme: "light", fontSize: "16", autosave: false };
```

```text
typeof.ts(7,44): error TS2322: Type 'string' is not assignable to type 'number'.
object number
```

יש שני `typeof` שונים:

- בתוך ביטוי, כמו ב-`console.log`, זה ה-`typeof` של JavaScript. הוא רץ ומחזיר מחרוזת כמו `"object"`.
- אחרי `type X =` או `:`, זה ‏[`typeof` של TypeScript](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html). הוא מחזיר את הטיפוס שהוסק למשתנה, כאן `{ theme: string; fontSize: number; autosave: boolean }`, ונמחק בקומפילציה.

‏`typeof` של טיפוסים עובד רק על שם של משתנה או על שדה שלו, לא על קריאה לפונקציה.

## ‏indexed access: ‏T["prop"]

```typescript
// indexed.ts
type Order = {
  id: number;
  customer: { name: string; email: string };
  items: { sku: string; qty: number }[];
};
type Customer = Order["customer"];
type Item = Order["items"][number];

function totalQty(items: Item[]) {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

console.log(totalQty([{ sku: "a1", qty: 2 }, { sku: "b2", qty: 3 }]));
type Total = Order["total"];
```

```text
indexed.ts(15,20): error TS2339: Property 'total' does not exist on type 'Order'.
5
```

‏[indexed access type](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html) נראה כמו גישה לשדה, אבל עם טיפוס בסוגריים. ‏`Order["customer"]` הוא טיפוס הלקוח. ‏`[number]` על טיפוס של מערך נותן את טיפוס האיבר, כי כל אינדקס מספרי מחזיר איבר. בתוך הסוגריים חייב להיות טיפוס: ‏`Order[key]`, כש-`key` הוא `const`, הוא שגיאה.

## ‏(typeof arr)[number]

‏[פוסט ה-unions](he/posts/typescript-unions-literals/) בנה union מתוך מערך. עכשיו אפשר לפרק את זה:

```typescript
// roles.ts
const roles = ["admin", "editor", "viewer"] as const;
type Role = (typeof roles)[number];

const loose = ["admin", "editor", "viewer"];
type Loose = (typeof loose)[number];

const ok: Role = "editor";
const bad: Role = "owner";
const anything: Loose = "owner";
console.log(ok, anything, roles.length);
```

```text
roles.ts(9,7): error TS2322: Type '"owner"' is not assignable to type '"admin" | "editor" | "viewer"'.
editor owner 3
```

1. `typeof roles` הוא `readonly ["admin", "editor", "viewer"]`, בזכות `as const`.
2. `[number]` שולף את טיפוס האיבר, כלומר `"admin" | "editor" | "viewer"`.

בלי `as const`, ‏`typeof loose` הוא `string[]`, ו-`Loose` הוא סתם `string`. הסוגריים סביב `typeof roles` לא חובה, רק קריאים יותר.

## ביחד: ‏get(obj, key) בטוח

```typescript
// get.ts
function getLoose<T>(obj: T, key: keyof T) {
  return obj[key];
}

function get<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const settings = { theme: "dark", fontSize: 14 };
console.log(get(settings, "fontSize").toFixed(1));
getLoose(settings, "fontSize").toFixed(1);
get(settings, "color");
```

```text
get.ts(12,32): error TS2339: Property 'toFixed' does not exist on type 'string | number'.
  Property 'toFixed' does not exist on type 'string'.
get.ts(13,15): error TS2345: Argument of type '"color"' is not assignable to parameter of type '"fontSize" | "theme"'.
14.0
```

‏`getLoose` מחזירה `T[keyof T]`, כלומר טיפוס של שדה כלשהו: ‏`string | number`. ב-`get`, ‏`K` הוא המפתח המסוים שהועבר, כאן `"fontSize"`, ו-`T[K]` הוא בדיוק `number`. ‏`K extends keyof T` גם דוחה מפתח שלא קיים.

## טעויות נפוצות של מתחילים

- **`type T = defaults` במקום `typeof defaults`.** משתנה הוא ערך, לא טיפוס. ‏TypeScript מציעה את `typeof` בהודעת השגיאה.
- **לשכוח `as const` לפני `[number]`.** מקבלים `string` במקום union של הערכים.
- **`key: keyof T` כשצריך את טיפוס הערך.** מוסיפים פרמטר `K extends keyof T` ומחזירים `T[K]`.

## מה הלאה

בפוסט הבא: utility types.
