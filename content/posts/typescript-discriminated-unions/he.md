---
title: "‏Discriminated unions ב-TypeScript: מצבים בלתי אפשריים שאי אפשר לכתוב"
summary: "להחליף ערימה של בוליאנים ושדות אופציונליים ב-union שבו כל מצב מחזיק רק את הנתונים שלו, כך שאי אפשר לכתוב 'טוען עם שגיאה', וגם דפוס ה-props של 'זה או זה'."
date: 2026-10-29
tags: [typescript]
series: { key: typescript, order: 11 }
---

[הפוסט על narrowing](he/posts/typescript-narrowing/) הראה איך `switch` על מאפיין משותף כמו `kind` מצמצם union. הפוסט הזה עוסק בשימוש בזה לתכנון טיפוסים, כך שאת המצבים שאין בהם היגיון פשוט אי אפשר לכתוב.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24, מול הסעיף [discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions) ב-handbook.

## ערימה של שדות אופציונליים

גרסה ראשונה טיפוסית של "נתונים שנטענים מהשרת":

```typescript
// loose.ts
type User = { name: string };
type UserState = { loading: boolean; error?: string; user?: User };

const state: UserState = { loading: true, error: "timeout", user: { name: "Dana" } };

function render(s: UserState) {
  if (s.loading) return "Loading...";
  if (s.error) return `Error: ${s.error}`;
  return `Hello, ${s.user?.name}`;
}

console.log(render(state), "|", render({ loading: false }));
```

```text
Loading... | Hello, undefined
```

הטיפוס מאפשר 8 צירופים, ורק ל-4 מהם יש היגיון. ‏`state` טוען, נכשל ונטען בבת אחת, ו-`tsc` מקבל אותו. גם `{ loading: false }` בלי שגיאה ובלי משתמש מתקבל, והדף מציג "Hello, undefined". כל מי שקורא את `UserState` צריך לנחש אילו צירופים באמת קורים.

## מצב אחד, איבר אחד

במקום זה, מונים את המצבים ונותנים לכל אחד רק את הנתונים שיש לו:

```typescript
// remote.ts
type User = { name: string };
type UserState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; user: User };

function render(s: UserState): string {
  switch (s.status) {
    case "idle":
      return "";
    case "loading":
      return "Loading...";
    case "error":
      return `Error: ${s.error}`;
    case "success":
      return `Hello, ${s.user.name}`;
  }
}

const bad: UserState = { status: "loading", error: "timeout" };
const done: UserState = { status: "success", user: { name: "Dana" } };
console.log(render(done));
```

```text
remote.ts(22,45): error TS2353: Object literal may only specify known properties, and 'error' does not exist in type '{ status: "loading"; }'.
Hello, Dana
```

- מצב טעינה עם שגיאה הוא עכשיו שגיאת קומפילציה.
- ‏`s.user` בתוך `case "success"` לא צריך `?.`: בענף הזה `user` תמיד קיים.

ל-`render` אין `default`. בגלל שטיפוס ההחזרה הוא `string`, גם מקרה חסר נתפס: אם יתווסף סטטוס חמישי, הפונקציה עלולה להסתיים בלי להחזיר ערך, ו-`tsc` ידווח `Function lacks ending return statement and return type does not include 'undefined'`. בדיקת ה-`never` מהפוסט על narrowing עושה את אותה עבודה ועובדת גם בפונקציה שלא מחזירה כלום.

## מעברים כפונקציות

כל שינוי מצב הוא פונקציה שמחזירה מצב חדש שלם. שום דבר לא יכול לקבוע `status` בלי לקבוע גם את הנתונים שהולכים איתו:

```typescript
// transitions.ts
type User = { name: string };
type UserState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; user: User };

const start = (): UserState => ({ status: "loading" });
const fail = (error: string): UserState => ({ status: "error", error });
const succeed = (user: User): UserState => ({ status: "success", user });
const broken = (): UserState => ({ status: "success" });

console.log([start(), fail("timeout"), succeed({ name: "Avi" })].map((s) => s.status));
```

```text
transitions.ts(12,34): error TS2322: Type '{ status: "success"; }' is not assignable to type 'UserState'.
  Property 'user' is missing in type '{ status: "success"; }' but required in type '{ status: "success"; user: User; }'.
[ 'loading', 'error', 'success' ]
```

השגיאה מציינת את האיבר שה-`status` התאים לו ואת השדה שחסר בו.

## או זה או זה

‏unions מתאימים גם ל-props שמוציאים זה את זה. כפתור מקבל קישור או פונקציית לחיצה, אף פעם לא את שניהם ואף פעם לא אף אחד. הטריק הוא `?: never` על המאפיין שחייב להיעדר:

```typescript
// button.ts
type ButtonProps = { label: string } & (
  | { href: string; onClick?: never }
  | { onClick: () => void; href?: never }
);

function button(p: ButtonProps) {
  return p.href !== undefined ? `<a href="${p.href}">${p.label}</a>` : `<button>${p.label}</button>`;
}

console.log(button({ label: "Home", href: "/loom/" }));
button({ label: "Both", href: "/", onClick: () => {} });
button({ label: "Neither" });
```

```text
button.ts(12,8): error TS2345: Argument of type '{ label: string; href: string; onClick: () => void; }' is not assignable to parameter of type 'ButtonProps'.
button.ts(13,8): error TS2345: Argument of type '{ label: string; }' is not assignable to parameter of type 'ButtonProps'.
<a href="/loom/">Home</a>
```

בלי `onClick?: never`, ‏`{ href, onClick }` היה עובר: בדיקת המאפיינים העודפים דוחה רק מאפיין שאין לאף איבר ב-union, ו-`onClick` נמצא באיבר השני. מאפיין `never` אופציונלי יכול רק להיעדר (או להיות `undefined`), ולכן "השני קיים" הופך לשגיאת טיפוס. כאן `href` עצמו משמש כמבחין: בדיקה שלו מול `undefined` מצמצמת את `p`.

## טעויות נפוצות של מתחילים

- **שדה `type` מטיפוס `string`.** המבחין חייב להיות טיפוס ליטרלי (`"loading"`), אחרת שום דבר לא מצטמצם.
- **להשאיר את הבוליאנים הישנים ליד ה-union.** ‏`isLoading` ליד `status: "loading"` יכולים שוב לסתור זה את זה. גזרו אותו: `s.status === "loading"`.
- **לבדוק עותק של המבחין ששמור ב-`let`.** ‏`const status = s.status; if (status === "error")` מצמצם את `s`. עם `let` זה לא קורה, כי המשתנה יכול להשתנות לפני הבדיקה.

## מה הלאה

בפוסט הבא: ‏`null`, ‏`undefined`, ‏`?.`, ‏`??` ו-`!`.
