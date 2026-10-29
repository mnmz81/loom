---
title: "generics ב-TypeScript: פונקציות גנריות, הסקה ו-constraints"
summary: "למה generics ולא any, איך TypeScript מסיקה את הטיפוס מהארגומנטים, constraints עם extends ו-keyof, ערכי ברירת מחדל לפרמטרי טיפוס, ומתי כותבים את הטיפוס במפורש."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 18 }
---

פונקציה שעובדת עם כל טיפוס צריכה דרך להגיד "מה שנכנס, זה מה שיוצא". ‏generic הוא פרמטר של טיפוס: ‏TypeScript ממלאת אותו בכל קריאה לפי הארגומנטים.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## למה לא any

```typescript
// first.ts
function firstAny(items: any[]) {
  return items[0];
}

function first<T>(items: T[]): T {
  return items[0];
}

const a = firstAny(["x", "y"]);
const b = first(["x", "y"]);
console.log(a.toFixed(1));
console.log(b.toFixed(1));
```

```text
first.ts(13,15): error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?
TypeError: a.toFixed is not a function
```

‏`firstAny` מקבלת הכל, אבל מחזירה `any`, ולכן הטעות ב-`a` מגיעה רק בזמן ריצה. ב-`first<T>`, ‏`T` מקשר בין הקלט לפלט: קראנו לה עם `string[]`, אז `T` הוא `string` ו-`b` הוא `string`. ‏`tsc` תפס את אותה טעות ב-`b` מראש.

## הסקה וטיפוס מפורש

```typescript
// pair.ts
function pair<A, B>(left: A, right: B): [A, B] {
  return [left, right];
}

const inferred = pair("id", null);
const explicit = pair<string, number | null>("id", null);
const wrong = pair<string, number>("id", "42");
console.log(inferred, explicit);
```

```text
pair.ts(8,42): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
[ 'id', null ] [ 'id', null ]
```

ברוב הקריאות לא כותבים את הטיפוסים: ‏`pair("id", null)` מקבל `[string, null]`. כשההסקה צרה מדי, או כשאין ממה להסיק, כותבים את הטיפוסים ב-`<>` אחרי שם הפונקציה, ו-TypeScript בודקת את הארגומנטים מולם ([Specifying Type Arguments](https://www.typescriptlang.org/docs/handbook/2/functions.html#specifying-type-arguments)).

## ‏constraints עם extends

בלי הגבלה, ‏`T` יכול להיות כל דבר, ולכן אי אפשר לגשת לשום שדה שלו. ‏[`extends`](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-constraints) מגביל את `T` לטיפוסים שיש בהם מה שצריך:

```typescript
// longest.ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

function sortBy<T>(items: T[], key: keyof T): T[] {
  return [...items].sort((x, y) => (x[key] < y[key] ? -1 : 1));
}

const books = [{ title: "Dune", year: 1965 }, { title: "Emma", year: 1815 }];
console.log(longest("apple", "fig"), longest([1, 2], [1, 2, 3]));
console.log(sortBy(books, "year").map((book) => book.title));
longest(10, 20);
sortBy(books, "author");
```

```text
longest.ts(13,9): error TS2345: Argument of type 'number' is not assignable to parameter of type '{ length: number; }'.
longest.ts(14,15): error TS2345: Argument of type '"author"' is not assignable to parameter of type '"title" | "year"'.
apple [ 1, 2, 3 ]
[ 'Emma', 'Dune' ]
```

- `longest` עובדת עם מחרוזות ועם מערכים, כי לשניהם יש `length`. מספר נדחה.
- `keyof T` הוא ה-union של שמות השדות של `T`, כאן `"title" | "year"`. יש עליו פוסט נפרד.

## ערך ברירת מחדל לפרמטר טיפוס

```typescript
// field.ts
type Field<T = string> = { label: string; value: T };

const city: Field = { label: "City", value: "Haifa" };
const age: Field<number> = { label: "Age", value: 42 };
const broken: Field = { label: "Age", value: 42 };
console.log(city.value, age.value);
```

```text
field.ts(6,39): error TS2322: Type 'number' is not assignable to type 'string'.
Haifa 42
```

‏`Field` בלי `<>` הוא `Field<string>`. כמו בפרמטרים של פונקציה, ‏[פרמטר עם ברירת מחדל](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-parameter-defaults) לא יכול לבוא לפני פרמטר חובה.

## טעויות נפוצות של מתחילים

- **פרמטר טיפוס שמופיע פעם אחת.** ‏`function log<T>(x: T): void` לא מקשר שום דבר. ‏`x: unknown` אומר את אותו הדבר. ה-handbook ממליץ שכל פרמטר טיפוס יופיע לפחות פעמיים.
- **לכתוב את הטיפוס במפורש בכל קריאה.** ההסקה בדרך כלל מדויקת יותר. כותבים רק כשהיא טועה.
- **גישה לשדה של `T` בלי `extends`.** ‏TypeScript לא יודעת שיש לו את השדה. מוסיפים constraint.

## מה הלאה

בפוסט הבא: generics בפועל.
