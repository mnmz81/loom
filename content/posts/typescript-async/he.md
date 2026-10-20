---
title: "קוד אסינכרוני ב-TypeScript: ‏Promise, ‏async/await ו-fetch"
summary: "‏Promise<T> וטיפוס ההחזרה של פונקציית async, ‏await ו-Awaited, איך Promise.all מחזיר tuple עם טיפוסים, למה response.json() מחזיר any, ולמה err ב-catch הוא unknown."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 23 }
---

פונקציית `async` תמיד מחזירה Promise, ו-TypeScript עוקבת אחרי מה שיש בתוכו: `Promise<string>` הוא הבטחה למחרוזת. מכאן נגזרים הטיפוסים של `await`, של `Promise.all` ושל שגיאות.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24. הדוגמאות לא פונות לרשת: ההמתנה היא `setTimeout`, וה-fetch קורא כתובת `data:`, ש-Node.js 24 תומך בה.

## ‏Promise<T> ופונקציות async

```typescript
// delay.ts
function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function greet(who: string): Promise<string> {
  const word = await delay(10, "hello");
  return `${word}, ${who}`;
}

async function wrong(): string {
  return "x";
}

greet("Dana").then(console.log);
```

```text
delay.ts(11,25): error TS1064: The return type of an async function or method must be the global Promise<T> type. Did you mean to write 'Promise<string>'?
hello, Dana
```

‏`delay` מחזירה `Promise<T>`, ו-`await` עליה נותן `T`, כאן `string`. בפונקציית `async` מחזירים את הערך עצמו (`return` של מחרוזת), אבל טיפוס ההחזרה שכותבים הוא `Promise<string>`, כי זה מה שהקורא מקבל. כתיבה של `string` היא שגיאה, ו-TypeScript מציעה את התיקון.

## ‏await, ‏Awaited ו-Promise.all

```typescript
// all.ts
const delay = <T>(ms: number, value: T) => new Promise<T>((resolve) => setTimeout(resolve, ms, value));

async function loadPage() {
  const [user, count] = await Promise.all([delay(20, { id: 7 }), delay(10, 42)]);
  return `${user.id} has ${count.toFixed(1)}`;
}

type Page = Awaited<ReturnType<typeof loadPage>>;
const page: Page = 5;

loadPage().then(console.log);
```

```text
all.ts(10,7): error TS2322: Type 'number' is not assignable to type 'string'.
7 has 42.0
```

‏`Promise.all` מקבל מערך של Promises ומחזיר Promise של tuple, ולכל איבר נשמר הטיפוס שלו: `user` הוא `{ id: number }` ו-`count` הוא `number`. החתימה ב-`lib.es2015.promise.d.ts` היא [mapped type](he/posts/typescript-mapped-types/) על ה-tuple עם `Awaited` על כל איבר. ‏`Awaited<T>` הוא הטיפוס שמקבלים מ-`await` על `T`, ולכן `Awaited<ReturnType<typeof loadPage>>` הוא `string`.

## ‏fetch: ‏response.json() מחזיר any

ב-lib של הדפדפן (`lib.dom.d.ts`) ‏`json()` מוגדר כ-`Promise<any>`. ‏TypeScript לא יכולה לדעת מה השרת יחזיר, ולכן היא מקבלת כל השמה:

```typescript
// fetch-json.ts
type Todo = { id: number; title: string };

async function loadTodo(url: string): Promise<Todo> {
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

const good = "data:application/json," + encodeURIComponent('{"id":1,"title":"write post"}');
const bad = "data:application/json," + encodeURIComponent('{"id":2}');

loadTodo(good)
  .then((todo) => console.log(todo.title.toUpperCase()))
  .then(() => loadTodo(bad))
  .then((todo) => console.log(todo.title.toUpperCase()));
```

```text
WRITE POST
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

‏`tsc` לא מדווח על כלום, ובכל זאת הקריאה השנייה נופלת, כי ב-JSON אין `title`. ה-`Promise<Todo>` הוא הבטחה שלנו, לא בדיקה. הפוסט הבא מראה איך בודקים את הנתונים בזמן ריצה.

## שגיאות: ‏err ב-catch הוא unknown

```typescript
// errors.ts
async function failing(): Promise<number> {
  throw new Error("boom");
}

async function main() {
  try {
    await failing();
  } catch (err) {
    console.log(err.message);
    if (err instanceof Error) console.log("caught:", err.message);
  }
}

main();
```

```text
errors.ts(10,17): error TS18046: 'err' is of type 'unknown'.
boom
caught: boom
```

‏`throw` יכול לזרוק כל ערך, לא רק `Error`, ולכן עם `strict` המשתנה ב-`catch` הוא [`unknown`](he/posts/typescript-any-unknown-never/). ‏`err.message` נדחה עד שמצמצמים, למשל עם `instanceof Error`. בזמן ריצה שתי השורות רצות, כי כאן באמת נזרק `Error`.

### בגרסאות קודמות

לפני TypeScript 4.4 המשתנה ב-`catch` היה `any`. מ-4.4 האפשרות [`useUnknownInCatchVariables`](https://www.typescriptlang.org/tsconfig/#useUnknownInCatchVariables) הופכת אותו ל-`unknown`, והיא חלק מ-`strict`. ‏`Awaited` נוסף ב-[TypeScript 4.5](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html), ואיתו `Promise.all` מסיק טיפוסים טובים יותר.

## טעויות נפוצות של מתחילים

- **לשכוח `await`.** בתוך `if`, ‏TypeScript מזהה את זה (TS2801: ה-Promise תמיד מוגדר, ולכן התנאי תמיד true). קריאה בודדת בלי `await` עוברת בלי שגיאה.
- **לצפות ש-`.catch` יתנהג כמו `catch`.** הפרמטר של `.catch((reason) => ...)` מוגדר ב-lib כ-`any`, גם עם `strict`.
- **‏`await` בתוך `forEach`.** ‏`forEach` לא מחכה ל-callback אסינכרוני. משתמשים ב-`for...of` או ב-`Promise.all`.

## מה הלאה

בפוסט הבא: בדיקת נתונים בזמן ריצה.
