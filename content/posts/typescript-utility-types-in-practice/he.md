---
title: "‏Utility types שמצדיקים את עצמם: ‏Pick, ‏Omit, ‏ReturnType, ‏Parameters ו-Record"
summary: "איפה ה-utility types הנפוצים עוזרים ואיפה הם מעבירים באגים בשקט: מפתחות ש-Omit לא בודק ו-unions, ‏ReturnType לטיפוסים של ספריות ו-overloads, וה-Record ששוקר."
date: 2026-10-29
tags: [typescript]
series: { key: typescript, order: 22 }
---

[הפוסט על utility types](he/posts/typescript-utility-types/) הראה מה כל אחד עושה. הפוסט הזה עוסק בחמשת אלה שמופיעים בקוד אמיתי, ובנקודה שבה כל אחד מהם מפסיק להגן עליכם.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24, מול [העמוד של Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html).

## ‏Pick ו-Omit: ‏Omit לא בודק את המפתחות שלו

טיפוס שנגזר עם `Pick` או `Omit` נשאר מסונכרן עם המקור: שנו שם של שדה ב-`User` וכל הטיפוסים הנגזרים יתעדכנו. אבל השניים לא סימטריים:

```typescript
// omit-keys.ts
type User = { id: number; name: string; email: string; password: string };

type Login = Pick<User, "email" | "pasword">;
type PublicUser = Omit<User, "pasword">;

const pub: PublicUser = { id: 1, name: "Dana", email: "dana@example.com", password: "secret" };
console.log(Object.keys(pub));
```

```text
omit-keys.ts(4,25): error TS2344: Type '"email" | "pasword"' does not satisfy the constraint 'keyof User'.
  Type '"pasword"' is not assignable to type 'keyof User'. Did you mean '"password"'?
[ 'id', 'name', 'email', 'password' ]
```

‏`Pick` דורש מפתחות שקיימים (`K extends keyof T`). ‏`Omit` מקבל כל מפתח (`K extends keyof any`), אז שגיאת הכתיב לא מסירה כלום ו-`password` נשאר בטיפוס ה"ציבורי". גרסה קפדנית יותר היא שורה אחת:

```typescript
// strict-omit.ts
type StrictOmit<T, K extends keyof T> = Omit<T, K>;
type User = { id: number; name: string; password: string };

type PublicUser = StrictOmit<User, "pasword">;
const ok: StrictOmit<User, "password"> = { id: 1, name: "Dana" };
console.log(ok);
```

```text
strict-omit.ts(5,36): error TS2344: Type '"pasword"' does not satisfy the constraint 'keyof User'.
{ id: 1, name: 'Dana' }
```

## ‏Omit על union משטיח אותו

‏`keyof` על union נותן רק את המפתחות שמשותפים לכל האיברים, ו-`Omit` בנוי על `keyof`. לכן `Omit` על [discriminated union](he/posts/typescript-discriminated-unions/) מאבד את השדות הייחודיים של כל איבר:

```typescript
// omit-union.ts
type Shape =
  | { id: string; kind: "circle"; radius: number }
  | { id: string; kind: "square"; size: number };

type NewShape = Omit<Shape, "id">;
const flat: NewShape = { kind: "circle", radius: 2 };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
const fixed: DistributiveOmit<Shape, "id"> = { kind: "circle", radius: 2 };
console.log(fixed);
```

```text
omit-union.ts(7,42): error TS2353: Object literal may only specify known properties, and 'radius' does not exist in type 'NewShape'.
{ kind: 'circle', radius: 2 }
```

‏`NewShape` הוא `{ kind: "circle" | "square" }`, בלי `radius` ובלי `size`. ‏`DistributiveOmit` משתמש ב-[conditional type](he/posts/typescript-conditional-types/) כדי להפעיל `Omit` על כל איבר בנפרד, ושומר על ה-union.

## ‏ReturnType: הטיפוס שהספרייה לא ייצאה

‏`ReturnType` מצדיק את עצמו כשספרייה מחזירה אובייקט שאת הטיפוס שלו היא לא מייצאת. במקום להעתיק את הצורה ביד, לוקחים אותה מהפונקציה:

```typescript
// store.ts
function createStore(initial: number) {
  let value = initial;
  return { get: () => value, add: (n: number) => (value += n) };
}

type Store = ReturnType<typeof createStore>;

function double(store: Store) {
  store.add(store.get());
}

const s = createStore(4);
double(s);
console.log(s.get());
```

```text
8
```

כש-`createStore` משתנה, ‏`Store` משתנה איתו. אבל בפונקציות עם overloads, ‏`ReturnType` ו-`Parameters` רואים רק את החתימה האחרונה:

```typescript
// overloads.ts
function parse(input: string): number;
function parse(input: string[]): number[];
function parse(input: string | string[]): number | number[] {
  return Array.isArray(input) ? input.map(Number) : Number(input);
}

type Out = ReturnType<typeof parse>;
const one: Out = parse("7");
console.log(one);
```

```text
overloads.ts(9,7): error TS2322: Type 'number' is not assignable to type 'number[]'.
7
```

[העמוד על conditional types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types) אומר את זה במפורש: ההסקה נעשית ‏"from the last signature". שימו את ה-overload הכללי ביותר אחרון, או תנו שמות לטיפוסים בעצמכם.

## ‏Parameters: להגיע לאובייקט אפשרויות

‏`Parameters<typeof fn>` הוא tuple, אז אינדקס נותן פרמטר אחד. כך נותנים שם לטיפוס אפשרויות שספרייה מקבלת אבל אף פעם לא ייצאה:

```typescript
// options.ts
function connect(url: string, options: { retries: number; timeoutMs?: number }) {
  return `${url} (retries: ${options.retries})`;
}

type ConnectOptions = Parameters<typeof connect>[1];

const defaults: ConnectOptions = { retries: 3 };
const bad: ConnectOptions = { retry: 3 };
console.log(connect("db://local", defaults));
```

```text
options.ts(9,31): error TS2353: Object literal may only specify known properties, and 'retry' does not exist in type '{ retries: number; timeoutMs?: number | undefined; }'.
db://local (retries: 3)
```

בקוד generic משלכם כמעט אף פעם לא צריך את השניים. כדי לעטוף כל פונקציה, תופסים את הפרמטרים והתוצאה שלה ישירות, `<A extends unknown[], R>(fn: (...args: A) => R)`, ו-TypeScript מסיקה את שניהם.

## ‏Record<string, T> מבטיח כל מפתח

‏`Record<"a" | "b", T>` מדויק. ‏`Record<string, T>` אומר שלכל מפתח מחרוזת יש `T`, אז קריאה של מפתח שלא קיים עוברת את בדיקת הטיפוסים:

```typescript
// record-lie.ts
const prices: Record<string, number> = { apple: 4.5 };

const kiwi = prices["kiwi"];
console.log(kiwi.toFixed(2));
```

```text
TypeError: Cannot read properties of undefined (reading 'toFixed')
```

‏`tsc` לא מדווח כלום, והקוד קורס. שלושה תיקונים, מהקטן לגדול:

- טיפוס `Partial<Record<string, number>>`: כל קריאה היא `number | undefined`.
- להפעיל את [`noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess) ב-`tsconfig.json`: כל קריאה לפי אינדקס מקבלת `| undefined`, גם במערכים.
- להשתמש ב-`Map`: ‏`get()` מחזיר `number | undefined` מעצם הגדרתו.

## טעויות נפוצות של מתחילים

- **‏`Omit` עם מפתח שלא קיים.** אין שגיאה, ושום דבר לא הוסר. השתמשו ב-`StrictOmit`.
- **‏`Omit` על discriminated union.** הוא מתכווץ לשדות המשותפים. השתמשו ב-`DistributiveOmit`.
- **לסמוך על `Record<string, T>` בקריאה.** מפתח חסר נקרא כ-`T`. הוסיפו `| undefined` באחת משלוש הדרכים שלמעלה.

## מה הלאה

בפוסט הבא: generics מעבר להגדרה של ספר הלימוד: מתי פרמטר טיפוס מצדיק את עצמו, ומתי הוא המרה בתחפושת.
