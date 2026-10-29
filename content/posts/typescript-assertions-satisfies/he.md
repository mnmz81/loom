---
title: "as, ‏satisfies ו-type guards ב-TypeScript"
summary: "as משתיק את הבודק ולא בודק כלום בזמן ריצה. satisfies בודק אובייקט בלי לאבד את הטיפוס המדויק שלו. ופונקציות value is T ו-asserts value is T שבודקות באמת."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 17 }
---

לפעמים אתם יודעים על ערך יותר ממה ש-TypeScript יודעת. יש שלוש דרכים להגיד לה את זה, וההבדל ביניהן הוא מי בודק שצדקתם: אף אחד, הקומפיילר, או קוד שרץ.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## ‏as: ‏TypeScript מאמינה לכם

```typescript
// as.ts
type User = { name: string; email: string };

const port = "8080" as number;
const forced = "8080" as unknown as number;
console.log(typeof forced);

const raw: unknown = JSON.parse('{"name":"Dana"}');
const user = raw as User;
console.log(user.email.toLowerCase());
```

```text
as.ts(4,14): error TS2352: Conversion of type 'string' to type 'number' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
string
TypeError: Cannot read properties of undefined (reading 'toLowerCase')
```

‏[type assertion](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions) עם `as` לא ממיר שום דבר. ‏`tsc` מוחק אותו, ובזמן ריצה אין בדיקה. ‏`raw as User` עבר, וההתרסקות הגיעה רק כשניגשנו ל-`email` שלא קיים.

‏TypeScript מסרבת רק להמרה בין טיפוסים שאין ביניהם שום חפיפה, כמו `string` ל-`number`. הודעת השגיאה עצמה מציעה לעבור קודם דרך `unknown`, ואז `as unknown as number` עובר, אבל הערך נשאר מחרוזת, כמו ש-`typeof` מראה. זה פתח מילוט, לא תיקון.

## ‏satisfies: בדיקה בלי לאבד את הטיפוס

```typescript
// config.ts
type Env = "dev" | "prod";
type Settings = { url: string; retries: number | "none" };

const annotated: Record<Env, Settings> = {
  dev: { url: "http://localhost:3000", retries: "none" },
  prod: { url: "https://api.example.com", retries: 3 },
};
annotated.prod.retries.toFixed(1);

const config = {
  dev: { url: "http://localhost:3000", retries: "none" },
  prod: { url: "https://api.example.com", retries: 3 },
  prdo: { url: "https://api.example.com", retries: 5 },
} satisfies Record<Env, Settings>;
console.log(config.prod.retries.toFixed(1));
```

```text
config.ts(9,24): error TS2339: Property 'toFixed' does not exist on type 'number | "none"'.
  Property 'toFixed' does not exist on type '"none"'.
config.ts(14,3): error TS2353: Object literal may only specify known properties, and 'prdo' does not exist in type 'Record<Env, Settings>'.
3.0
```

‏הערת טיפוס (`: Record<Env, Settings>`) הופכת את הטיפוס של המשתנה ל-`Settings`, ולכן `annotated.prod.retries` הוא `number | "none"` גם כשכתוב שם 3. ‏[`satisfies`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator) בודק שהאובייקט מתאים לטיפוס, אבל משאיר למשתנה את הטיפוס שהוסק: ‏`config.prod.retries` הוא `number`. הבדיקה עצמה לא נחלשה, והמפתח `prdo` עם שגיאת ההקלדה נתפס.

## ‏type guards ו-assertion functions

‏[פוסט ה-narrowing](he/posts/typescript-narrowing/) הראה איך `typeof` ו-`in` מצמצמים טיפוס. כשהבדיקה ארוכה, אורזים אותה בפונקציה ומחזירים [type predicate](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates):

```typescript
// guards.ts
type User = { name: string; email: string };

function isUser(value: unknown): value is User {
  return typeof value === "object" && value !== null &&
    "name" in value && typeof value.name === "string" &&
    "email" in value && typeof value.email === "string";
}

function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) throw new Error("not a user");
}

const items: unknown[] = [{ name: "Dana", email: "dana@example.com" }, { name: "Avi" }];
console.log(items.filter(isUser).map((u) => u.email));

const raw: unknown = JSON.parse('{"name":"Avi"}');
assertUser(raw);
console.log(raw.name);
```

```text
[ 'dana@example.com' ]
Error: not a user
```

- `value is User`: כש-`isUser` מחזירה `true`, הערך שהועבר אליה הוא `User`. גם `filter` מבין את זה ומחזיר `User[]`.
- `asserts value is User`: ‏[assertion function](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions) לא מחזירה ערך. אם היא חזרה בלי לזרוק, הערך הוא `User` עד סוף ה-scope. כאן היא זרקה, ו-`raw.name` לא הודפס.

‏TypeScript לא בודקת שגוף הפונקציה באמת מוכיח את מה שהיא מצהירה. ‏predicate שבודק פחות ממה שהוא מבטיח הוא `as` בתחפושת.

### בגרסאות קודמות

```typescript
// angle.ts
const raw: unknown = "hi";
const text = <string>raw;
console.log(text.length);
```

```text
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: The angle-bracket syntax for type assertions, `<T>expr`, is not supported in type strip mode. Instead, use the 'as' syntax: `expr as T`.
```

‏`<string>raw` הוא התחביר הישן של `as`, ועדיין עובר `tsc`. הוא לא עובד בקבצי `.tsx`, ‏`erasableSyntaxOnly` דוחה אותו, ו-Node מסרב להריץ אותו, כמו שרואים למעלה. ‏`satisfies` נוסף ב-TypeScript 4.9. לפני כן הייתה רק הערת טיפוס, שמאבדת את הטיפוס המדויק.

## טעויות נפוצות של מתחילים

- **`as` על תשובה של `fetch` או `JSON.parse`.** זה מתקמפל ומתרסק אחר כך. בודקים עם type guard או עם ספריית ולידציה.
- **`{ ... } as Settings` על אובייקט חדש.** שדה חסר או שדה עם שגיאת הקלדה עוברים בשקט. הערת טיפוס או `satisfies` תופסים את שניהם.
- **type guard שבודק רק שדה אחד.** ‏TypeScript מאמינה לו לגבי כל השאר.

## מה הלאה

בפוסט הבא: generics.
