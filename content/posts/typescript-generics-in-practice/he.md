---
title: "generics בפועל: Promise<T>, ‏ApiResult<T>, מחלקות גנריות ו-Array<T>"
summary: "איפה generics מופיעים בקוד אמיתי: Promise<T> בפונקציות async, טיפוס תשובה ApiResult<T>, ממשק ומחלקה גנריים, והחתימות הגנריות של map, ‏find ו-reduce."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 19 }
---

‏[הפוסט הקודם](he/posts/typescript-generics/) הראה איך כותבים פונקציה גנרית. רוב ה-generics בקוד יומיומי הם דווקא טיפוסים שאחרים כתבו, או טיפוסים שעוטפים ערך אחר.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## ‏Promise<T>

```typescript
// load.ts
type User = { id: number; name: string };

async function loadUser(id: number): Promise<User> {
  return { id, name: "Dana" };
}

async function countUsers(): number {
  return 1;
}

loadUser(1).then((user) => console.log(user.name.toUpperCase()));
```

```text
load.ts(8,30): error TS1064: The return type of an async function or method must be the global Promise<T> type. Did you mean to write 'Promise<number>'?
DANA
```

פונקציית `async` תמיד מחזירה `Promise`, ו-`T` הוא מה שמקבלים אחרי `await` או ב-`then`. לכן `user` בתוך ה-callback הוא `User` בלי שכתבנו את זה. סוג ההחזרה של פונקציית `async` חייב להיות `Promise<...>`, כמו שהשגיאה ב-`countUsers` מראה.

## ‏ApiResult<T>: טיפוס תשובה

```typescript
// api-result.ts
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
type User = { id: number; name: string };

function findUser(id: number): ApiResult<User> {
  if (id === 1) return { ok: true, data: { id, name: "Dana" } };
  return { ok: false, error: `user ${id} not found` };
}

for (const id of [1, 2]) {
  const result = findUser(id);
  console.log(result.ok ? result.data.name : result.error);
}
console.log(findUser(1).data);
```

```text
api-result.ts(14,25): error TS2339: Property 'data' does not exist on type 'ApiResult<User>'.
  Property 'data' does not exist on type '{ ok: false; error: string; }'.
Dana
user 2 not found
{ id: 1, name: 'Dana' }
```

‏`ApiResult<T>` הוא discriminated union עם פרמטר: אותה צורה משמשת ל-`ApiResult<User>`, ‏`ApiResult<Order[]>` וכל תשובה אחרת. ‏`data` זמין רק אחרי בדיקה של `ok`, ולכן אי אפשר לשכוח לטפל בשגיאה. השורה האחרונה רצה, אבל `tsc` דוחה אותה.

## ממשק ומחלקה גנריים

```typescript
// store.ts
interface Store<T> {
  add(item: T): void;
  all(): readonly T[];
}

class MemoryStore<T> implements Store<T> {
  private items: T[] = [];
  add(item: T) {
    this.items.push(item);
  }
  all() {
    return this.items;
  }
}

const tags = new MemoryStore<string>();
tags.add("ts");
tags.add(42);
console.log(tags.all());
```

```text
store.ts(19,10): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
[ 'ts', 42 ]
```

הפרמטר נכתב אחרי שם הממשק או המחלקה, וכל המתודות רואות אותו. ‏`new MemoryStore<string>()` קובע את `T` לכל המופע. ‏`T` שייך למופע בלבד: ‏[שדות ומתודות `static` לא יכולים להשתמש בו](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-classes). ‏`tsc` דחה את `42`, אבל `private` ו-`T` נמחקים, ולכן בזמן ריצה הוא נכנס.

## החתימות של Array<T>

`string[]` הוא קיצור של `Array<string>`, והמתודות של מערך מוגדרות כ-generics. החתימה של `map` בקובץ `lib.es5.d.ts` של TypeScript:

‏`map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]`

‏`T` הוא סוג האיברים, ו-`U` מוסק ממה שה-callback מחזיר.

```typescript
// arrays.ts
const words = ["ts", "node", "angular"];
const lengths = words.map((word) => word.length);
const byWord = words.reduce<Record<string, number>>((acc, word) => ({ ...acc, [word]: word.length }), {});
console.log(lengths, byWord);

const found = words.find((word) => word.startsWith("x"));
console.log(found.length);
```

```text
arrays.ts(8,13): error TS18048: 'found' is possibly 'undefined'.
[ 2, 4, 7 ] { ts: 2, node: 4, angular: 7 }
TypeError: Cannot read properties of undefined (reading 'length')
```

- `map` מחזירה `number[]`, כי ה-callback מחזיר `number`.
- `reduce<U>` מסיקה את `U` מהערך ההתחלתי. מ-`{}` היא הייתה מסיקה `{}`, ולכן כותבים את הטיפוס במפורש.
- `find` מחזירה `T | undefined`, כי ייתכן שאף איבר לא מתאים.

## טעויות נפוצות של מתחילים

- **`Promise<any>` או `ApiResult<any>`.** ‏`any` בתוך ה-generic מבטל את כל מה שהוא נותן.
- **‏`as User` על `data` במקום טיפוס גנרי.** פונקציה כמו `findUser` שמחזירה `ApiResult<User>` מעבירה את הטיפוס הלאה בלי `as`.
- **להתעלם מה-`undefined` של `find`.** מטפלים במקרה שלא נמצא, עם `if` או `??`.

## מה הלאה

בפוסט הבא: ‏`keyof`, ‏`typeof` ו-indexed access types.
