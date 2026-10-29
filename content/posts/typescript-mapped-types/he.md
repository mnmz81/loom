---
title: "mapped types ו-template literal types ב-TypeScript"
summary: "‏{ [K in keyof T]: ... } בונה טיפוס חדש ממפתחות של טיפוס קיים: modifiers של readonly ו-?, שינוי שמות מפתחות עם as, סינון עם never, ושמות כמו onClick עם template literal types."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 25 }
---

‏mapped type עובר על המפתחות של טיפוס אחד ובונה מהם טיפוס חדש. כך בנויים `Partial`, ‏`Readonly`, ‏`Required`, ‏`Pick` ו-`Record` מ[פוסט ה-utility types](he/posts/typescript-utility-types/), וכך כותבים גרסה משלכם כשאף אחד מהם לא מתאים. התחביר מתואר ב[מדריך הרשמי](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html).

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## לעבור על המפתחות

```typescript
// flags.ts
type Settings = { darkMode: boolean; fontSize: number };

type Flags<T> = { [K in keyof T]: boolean };
type MyPartial<T> = { [K in keyof T]?: T[K] };

const flags: Flags<Settings> = { darkMode: true, fontSize: 14 };
const patch: MyPartial<Settings> = { fontSize: 16 };
console.log(patch);
```

```text
flags.ts(7,50): error TS2322: Type 'number' is not assignable to type 'boolean'.
{ fontSize: 16 }
```

‏`K in keyof T` עובר על כל מפתח של `T`, כמו לולאה. בצד ימין קובעים את טיפוס הערך: ב-`Flags` הכול `boolean`, וב-`MyPartial` ‏`T[K]`, כלומר הטיפוס המקורי של אותו מפתח, עם `?` שהופך אותו לאופציונלי. זו בדיוק ההגדרה של `Partial` ב-`lib.es5.d.ts`, ו-`Readonly` זהה רק עם `readonly` לפני המפתח.

## ‏modifiers: להוסיף ולהסיר readonly ו-?

```typescript
// modifiers.ts
type Config = { readonly host: string; port?: number };

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Concrete<T> = { [K in keyof T]-?: T[K] };

const config: Mutable<Config> = { host: "localhost" };
config.host = "example.com";
const locked: Readonly<Config> = config;
locked.host = "other.com";
const full: Concrete<Config> = { host: "localhost" };
```

```text
modifiers.ts(10,8): error TS2540: Cannot assign to 'host' because it is a read-only property.
modifiers.ts(11,7): error TS2741: Property 'port' is missing in type '{ host: string; }' but required in type 'Concrete<Config>'.
```

‏`-` מסיר modifier ו-`+` מוסיף. בלי קידומת מניחים `+`, ולכן `readonly` ב-`Readonly` הוא בעצם `+readonly`. ‏`Mutable` מסיר את ה-`readonly` מ-`host`, ולכן ההשמה הראשונה עוברת. ‏`Concrete` מסיר את ה-`?`, וכך מוגדר `Required`. ‏`readonly` קיים רק בבדיקה: בזמן ריצה `locked.host` משתנה כרגיל, ומי שצריך הקפאה אמיתית משתמש ב-`Object.freeze`.

## שינוי שמות עם as וסינון עם never

מ-TypeScript 4.1 אפשר להוסיף `as` אחרי `keyof T` ולתת לכל מפתח שם חדש. מפתח ששמו החדש הוא `never` יוצא מהטיפוס.

```typescript
// remap.ts
type Person = { label: string; age: number; city: string };

type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
type StringsOnly<T> = { [K in keyof T as T[K] extends string ? K : never]: T[K] };

const getters: Getters<Person> = { getLabel: () => "Dana", getAge: () => 30, getCity: () => "Haifa" };
const strings: StringsOnly<Person> = { label: "Dana", age: 30, city: "Haifa" };
console.log(getters.getAge());
```

```text
remap.ts(8,55): error TS2353: Object literal may only specify known properties, and 'age' does not exist in type 'StringsOnly<Person>'.
30
```

‏`Getters` הופך את `age` ל-`getAge`. ‏`keyof T` יכול לכלול גם `number` ו-`symbol`, ו-`Capitalize` מקבל רק מחרוזת, ולכן `string & K` משאיר רק את המפתחות שהם מחרוזות. ב-`StringsOnly`, ה-[conditional type](he/posts/typescript-conditional-types/) מחזיר `never` לכל מפתח שהערך שלו לא `string`, ולכן `age` לא קיים בטיפוס.

## ‏template literal types: שמות של event handlers

[template literal type](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) נכתב כמו template string, אבל מייצר טיפוס. כשיש בו union, מקבלים union של כל הצירופים.

```typescript
// events.ts
type EventName = "click" | "submit";
type HandlerName = `on${Capitalize<EventName>}`;

type Handlers = { [E in EventName as `on${Capitalize<E>}`]: (at: number) => void };

const handlers: Handlers = {
  onClick: (at) => console.log("click at", at),
  onSubmit: (at) => console.log("submit at", at),
};
handlers.onClick(10);

const wrong: HandlerName = "onclick";
```

```text
events.ts(13,7): error TS2820: Type '"onclick"' is not assignable to type '"onClick" | "onSubmit"'. Did you mean '"onClick"'?
click at 10
```

‏`Capitalize` הוא אחד מארבעה טיפוסים מובנים לשינוי מחרוזות, יחד עם `Uppercase`, ‏`Lowercase` ו-`Uncapitalize`. כשמוסיפים אירוע ל-`EventName`, ‏`tsc` דורש handler חדש בכל אובייקט מסוג `Handlers`, וגם הפרמטר `at` מקבל את הטיפוס `number` בלי שכתבנו אותו.

## טעויות נפוצות של מתחילים

- **‏`Capitalize<K>` בלי `string &`.** ‏`K` מ-`keyof T` הוא לא בהכרח מחרוזת, ו-TypeScript דוחה אותו.
- **לצפות ש-`Partial` יגיע לעומק.** mapped type משנה רק את הרמה העליונה. אובייקט מקונן נשאר עם שדות החובה שלו.
- **לסמוך על `readonly` בזמן ריצה.** הוא נמחק יחד עם שאר הטיפוסים.

## מה הלאה

בפוסט הבא: קוד אסינכרוני ו-Promises.
