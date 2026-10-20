---
title: "utility types ב-TypeScript: ‏Partial, ‏Pick, ‏Omit, ‏Record, ‏ReturnType ועוד"
summary: "טיפוסי העזר המובנים של TypeScript בדוגמה אחת לכל קבוצה: Partial ו-Readonly, ‏Pick ו-Omit, ‏Record, ‏ReturnType ו-Awaited, ‏NonNullable ו-NoInfer."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 20 }
---

‏TypeScript מגיעה עם טיפוסים גנריים מוכנים שמשנים טיפוס קיים: הופכים שדות לאופציונליים, מוחקים שדה, שולפים את סוג ההחזרה של פונקציה. הרשימה המלאה נמצאת ב-[Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html). כאן הנפוצים, בדוגמה אחת לכל קבוצה.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## ‏Partial, ‏Required ו-Readonly

```typescript
// update.ts
type User = { id: number; name: string; email: string };
type Options = { retries?: number; timeout?: number };

function updateUser(user: Readonly<User>, changes: Partial<User>): User {
  return { ...user, ...changes };
}

const defaults: Required<Options> = { retries: 3, timeout: 1000 };
const dana: Readonly<User> = { id: 1, name: "Dana", email: "dana@example.com" };
console.log(updateUser(dana, { email: "d@example.com" }), defaults);
dana.name = "Avi";
```

```text
update.ts(12,6): error TS2540: Cannot assign to 'name' because it is a read-only property.
{ id: 1, name: 'Dana', email: 'd@example.com' } { retries: 3, timeout: 1000 }
```

- `Partial<User>`: כל השדות אופציונליים, כך ש-`changes` יכול להכיל רק את מה שמשתנה.
- `Required<Options>`: ההפך, כל `?` נמחק. ברירות המחדל חייבות לכסות כל שדה.
- `Readonly<User>`: אי אפשר להציב לשדות. זו בדיקה של `tsc` בלבד: בזמן ריצה ההצבה עברה בשקט. להקפאה בזמן ריצה יש `Object.freeze`.

## ‏Pick, ‏Omit ו"דריסה" של שדה

```typescript
// pick-omit.ts
type User = { id: number; name: string; email: string; password: string };

type PublicUser = Omit<User, "password">;
type Credentials = Pick<User, "email" | "password">;
type UserForm = Omit<User, "id"> & { id: string };
type Broken = User & { id: string };

function toPublic({ password, ...rest }: User): PublicUser {
  return rest;
}

const login: Credentials = { email: "dana@example.com", password: "secret" };
const form: UserForm = { id: "new", name: "Dana", ...login };
const broken: Broken = { id: "new", name: "Dana", ...login };
console.log(toPublic({ ...form, id: 1 }));
```

```text
pick-omit.ts(15,26): error TS2322: Type 'string' is not assignable to type 'never'.
{ id: 1, name: 'Dana', email: 'dana@example.com' }
```

‏`Pick` בוחר שדות, ו-`Omit` מוחק אותם. ‏[בפוסט על interface ו-type](he/posts/typescript-interface-vs-type/) ראינו ש-`&` לא דורס שדה: ‏`id` ב-`Broken` הוא `number & string`, כלומר `never`. כדי להחליף את טיפוס השדה, מוחקים אותו קודם עם `Omit` ואז מוסיפים אותו מחדש.

## ‏Record

```typescript
// record.ts
type Role = "admin" | "editor" | "viewer";

const permissions: Record<Role, string[]> = {
  admin: ["read", "write", "delete"],
  editor: ["read", "write"],
};
console.log(Object.keys(permissions));
```

```text
record.ts(4,7): error TS2741: Property 'viewer' is missing in type '{ admin: string[]; editor: string[]; }' but required in type 'Record<Role, string[]>'.
[ 'admin', 'editor' ]
```

‏`Record<Keys, Value>` הוא אובייקט שהמפתחות שלו הם `Keys` והערכים `Value`. כש-`Keys` הוא union, כל מפתח חובה, ולכן שכחה של `viewer` נתפסת. כשמוסיפים תפקיד ל-`Role`, ‏`tsc` מראה כל `Record` שצריך לעדכן.

## ‏ReturnType, ‏Parameters ו-Awaited

```typescript
// fn-types.ts
async function fetchOrder(id: number, includeItems: boolean) {
  return { id, items: includeItems ? ["book"] : [] };
}

type FetchArgs = Parameters<typeof fetchOrder>;
type Pending = ReturnType<typeof fetchOrder>;
type Order = Awaited<Pending>;

const args: FetchArgs = [7, true];
fetchOrder(...args).then((order: Order) => console.log(order));
const wrong: Order = { id: "7", items: [] };
```

```text
fn-types.ts(12,24): error TS2322: Type 'string' is not assignable to type 'number'.
{ id: 7, items: [ 'book' ] }
```

- `Parameters` נותן tuple של הפרמטרים: ‏`[id: number, includeItems: boolean]`.
- `ReturnType` נותן את סוג ההחזרה, כאן `Promise<{ id: number; items: string[] }>`.
- `Awaited` פותח את ה-`Promise`, כמו `await`.

שלושתם מקבלים טיפוס של פונקציה, ולכן צריך `typeof`. הם שימושיים כשספרייה מייצאת פונקציה אבל לא את הטיפוסים שלה.

## ‏NonNullable ו-NoInfer

```typescript
// required.ts
function required<T>(value: T, label: string): NonNullable<T> {
  if (value === null || value === undefined) throw new Error(`${label} is missing`);
  return value;
}

const params = new URLSearchParams("page=2");
const page = required(params.get("page"), "page");
console.log(page.padStart(3, "0"));
required(params.get("sort"), "sort");
```

```text
002
Error: sort is missing
```

‏`params.get` מחזירה `string | null`. ‏`NonNullable` מוציא מהטיפוס את `null` ואת `undefined`, ולכן `page` הוא `string`.

```typescript
// no-infer.ts
function pickLoose<C extends string>(options: C[], fallback: C): C {
  return fallback;
}

function pick<C extends string>(options: C[], fallback: NoInfer<C>): C {
  return fallback;
}

console.log(pickLoose(["green", "red"], "blue"));
pick(["green", "red"], "blue");
```

```text
no-infer.ts(11,24): error TS2345: Argument of type '"blue"' is not assignable to parameter of type '"green" | "red"'.
blue
```

ב-`pickLoose`, ‏TypeScript מסיקה את `C` משני הפרמטרים, ולכן `"blue"` פשוט מצטרף ל-union. ‏`NoInfer<C>` אומר לה לא להסיק מ-`fallback`, כך ש-`C` נקבע רק לפי `options` ו-`"blue"` נדחה.

### בגרסאות קודמות

לפי עמוד ה-Utility Types: ‏`Omit` נוסף ב-TypeScript 3.5, ‏`Awaited` ב-4.5 ו-`NoInfer` ב-5.4. לפני 5.4, הדרך המקובלת הייתה פרמטר טיפוס נוסף, `<C extends string, D extends C>`, כמו שמראים [הערות הגרסה של 5.4](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html#the-noinfer-utility-type).

## טעויות נפוצות של מתחילים

- **`&` כדי לשנות טיפוס של שדה.** מקבלים `never`. ‏`Omit` ואז `&`.
- **לסמוך על `Readonly` בזמן ריצה.** הוא נמחק בקומפילציה.
- **`ReturnType<fetchOrder>` בלי `typeof`.** ‏`fetchOrder` הוא ערך. ‏`ReturnType<typeof fetchOrder>`.

## מה הלאה

בפוסט הבא: conditional types ו-`infer`.
