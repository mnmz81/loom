---
title: "‏Generics ב-TypeScript מעבר להגדרה של ספר הלימוד"
summary: "פרמטר טיפוס הוא קשר בין טיפוסים: מתי הוא מצדיק את עצמו, להגביל את האיבר ולא את המכל, ה-generic שהוא המרה בתחפושת, ‏const type parameters ומפת אירועים עם טיפוסים."
date: 2026-10-29
tags: [typescript]
series: { key: typescript, order: 23 }
---

ההגדרה של ספר הלימוד היא "פרמטר טיפוס, כמו פרמטר של פונקציה אבל לטיפוסים". [הפוסט על generics](he/posts/typescript-generics/) כיסה אותה. ההגדרה השימושית יותר: generic מקשר בין הטיפוסים של שני מקומות או יותר, בדרך כלל קלט ופלט. אם אין מה לקשר, אין צורך ב-generic.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24, מול [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) ב-handbook ו[ההנחיות לכתיבת פונקציות generic טובות](https://www.typescriptlang.org/docs/handbook/2/functions.html#guidelines-for-writing-good-generic-functions).

## פרמטר טיפוס צריך להופיע פעמיים

הכלל של ה-handbook: ‏"If a type parameter only appears in one location, strongly reconsider if you actually need it."

```typescript
// twice.ts
function logAll<T>(items: T[]): void {
  items.forEach((item) => console.log(item));
}

function logAllPlain(items: unknown[]): void {
  items.forEach((item) => console.log(item));
}

function last<T>(items: T[]): T | undefined {
  return items[items.length - 1];
}

logAll([1, 2]);
logAllPlain(["a"]);
const n = last([1, 2, 3]);
console.log(n?.toFixed(1));
```

```text
1
2
a
3.0
```

‏`T` ב-`logAll` מופיע פעם אחת, אז הוא לא מקשר כלום. ‏`unknown[]` עושה את אותה עבודה ונקרא פשוט יותר. ב-`last`, ‏`T` מופיע בפרמטר ובטיפוס ההחזרה: הקשר הזה הוא הסיבה ש-`n` הוא `number` ו-`toFixed` מותר.

## להגביל את האיבר, לא את המכל

```typescript
// push-down.ts
function firstGood<T>(items: T[]): T | undefined {
  return items[0];
}

function firstBad<A extends unknown[]>(items: A) {
  return items[0];
}

const a = firstGood([10, 20]);
const b = firstBad([10, 20]);
console.log(a?.toFixed(1), b);
b.toFixed(1);
```

```text
push-down.ts(13,1): error TS18046: 'b' is of type 'unknown'.
10.0 10
```

‏`firstBad` לוקח את המערך כולו כפרמטר הטיפוס, אז טיפוס האיבר מגיע מההגבלה: `unknown`. ה-handbook קורא לתיקון "push type parameters down": פרמטר הטיפוס צריך להיות הדבר שמחזירים, כאן האיבר.

## ה-generic שהוא המרה בתחפושת

פרמטר טיפוס שמופיע רק בטיפוס ההחזרה לא מוסק מכלום. הקורא בוחר אותו, ושום דבר לא בודק את הבחירה:

```typescript
// parse.ts
type User = { name: string };

function parseJson<T>(text: string): T {
  return JSON.parse(text);
}

const user = parseJson<User>('{"nmae":"Dana"}');
console.log(user.name.toUpperCase());
```

```text
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

‏`parseJson<User>(...)` נראה בטוח יותר מ-`JSON.parse(...) as User`, אבל זו אותה המרה. הגרסה הכנה מקבלת בדיקה, כך ש-`T` מוסק ממשהו שרץ:

```typescript
// parse-checked.ts
type User = { name: string };

function parseJson<T>(text: string, isT: (value: unknown) => value is T): T {
  const value: unknown = JSON.parse(text);
  if (!isT(value)) throw new Error("unexpected JSON shape");
  return value;
}

const isUser = (v: unknown): v is User =>
  typeof v === "object" && v !== null && "name" in v && typeof v.name === "string";

console.log(parseJson('{"name":"Dana"}', isUser).name);
parseJson('{"nmae":"Dana"}', isUser);
```

```text
Dana
Error: unexpected JSON shape
```

עכשיו `T` מופיע פעמיים, ב-guard ובתוצאה, וה-guard חייב לעבור בזמן ריצה. [הפוסט על type guards](he/posts/typescript-type-guards/) בונה guards כאלה, ו-[zod](he/posts/typescript-zod/) מייצר אותם.

## ‏const type parameters

כברירת מחדל, מערך ליטרלי שמועבר ל-generic מוסק כ-`string[]`. מאז TypeScript 5.0, ‏[`const` על פרמטר הטיפוס](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#const-type-parameters) מסיק אותו כאילו הקורא כתב `as const`:

```typescript
// const-param.ts
function routesLoose<T extends readonly string[]>(paths: T) {
  return paths;
}
function routes<const T extends readonly string[]>(paths: T) {
  return paths;
}

const loose = routesLoose(["/", "/posts"]);
const exact = routes(["/", "/posts"]);
type Path = (typeof exact)[number];
const home: Path = "/";
const typo: Path = "/post";
console.log(loose, exact);
```

```text
const-param.ts(13,7): error TS2820: Type '"/post"' is not assignable to type '"/" | "/posts"'. Did you mean '"/posts"'?
[ '/', '/posts' ] [ '/', '/posts' ]
```

‏`loose` הוא `string[]`. ‏`exact` הוא `readonly ["/", "/posts"]`, אז `Path` הוא union של שתי המחרוזות ושגיאת הכתיב נתפסת. ה-`readonly` בהגבלה חשוב: בלעדיו, `const` חוזר ל-`string[]`.

## מפת אירועים עם טיפוסים

‏generics משתלמים הכי הרבה ב-API שבו פרמטר טיפוס אחד קושר כמה מתודות יחד:

```typescript
// events.ts
function createBus<Events extends Record<string, unknown>>() {
  const handlers: { [K in keyof Events]?: ((payload: Events[K]) => void)[] } = {};
  return {
    on<K extends keyof Events>(name: K, handler: (payload: Events[K]) => void) {
      (handlers[name] ??= []).push(handler);
    },
    emit<K extends keyof Events>(name: K, payload: Events[K]) {
      handlers[name]?.forEach((h) => h(payload));
    },
  };
}

const bus = createBus<{ login: { user: string }; logout: undefined }>();
bus.on("login", (p) => console.log("hello", p.user));
bus.emit("login", { user: "Dana" });
bus.emit("login", { name: "Dana" });
bus.emit("signup", undefined);
```

```text
events.ts(17,21): error TS2353: Object literal may only specify known properties, and 'name' does not exist in type '{ user: string; }'.
events.ts(18,10): error TS2345: Argument of type '"signup"' is not assignable to parameter of type '"login" | "logout"'.
hello Dana
```

את `Events` כותבים פעם אחת, ב-`createBus`. מאותו רגע, כל `on` ו-`emit` בודקים את שם האירוע ואת המטען שלו, ו-`p` ב-handler מקבל טיפוס בלי הערה. זה הדפוס שמאחורי emitters, ‏stores ופרמטרים של router עם טיפוסים.

## טעויות נפוצות של מתחילים

- **פרמטר טיפוס שמופיע פעם אחת.** החליפו אותו ב-`unknown` או בהגבלה עצמה.
- **פרמטר טיפוס רק בטיפוס ההחזרה.** זו המרה. קבלו ערך שמוכיח את הטיפוס, או החזירו `unknown`.
- **ארגומנטים מפורשים של טיפוס בכל מקום.** אם אתם כותבים שוב ושוב `fn<User>(...)`, כנראה שה-generic לא מסיק מכלום.

## מה הלאה

בפוסט הבא: conditional types ו-`infer`.
