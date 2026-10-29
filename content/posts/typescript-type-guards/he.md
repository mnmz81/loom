---
title: "‏Type guards ב-TypeScript: עבודה עם נתונים שלא בשליטתכם"
summary: "לבנות guards לנתוני API מחלקים קטנים לשימוש חוזר, ה-guard שמשקר ועדיין מתקמפל, type predicates מוסקים ב-filter, וטיפול בסוג שהשרת הוסיף אחרי שהקוד שלכם כבר באוויר."
date: 2026-10-29
tags: [typescript]
series: { key: typescript, order: 28 }
---

[הפוסט על בדיקת נתונים בזמן ריצה](he/posts/typescript-runtime-validation/) כתב guard אחד ביד, ו[הפוסט על assertions](he/posts/typescript-assertions-satisfies/) הראה את `value is T` ואת `asserts`. הפוסט הזה עוסק ב-guards לנתוני API אמיתיים: מקוננים, חלקם אופציונליים, ועלולים להשתנות בלי להודיע לכם.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24, מול הסעיף [type predicates](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates) ב-handbook.

## בונים מ-guards קטנים

לכתוב `typeof value === "object" && value !== null && ...` לכל שדה לא מחזיק לאורך זמן. כמה guards קטנים מתחברים לגדולים:

```typescript
// guards.ts
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isArrayOf =
  <T>(item: (v: unknown) => v is T) =>
  (v: unknown): v is T[] =>
    Array.isArray(v) && v.every(item);

type Item = { sku: string; qty: number };
type Order = { id: number; items: Item[]; note?: string };

const isItem = (v: unknown): v is Item => isRecord(v) && isString(v.sku) && isNumber(v.qty);
const isOrder = (v: unknown): v is Order =>
  isRecord(v) &&
  isNumber(v.id) &&
  isArrayOf(isItem)(v.items) &&
  (v.note === undefined || isString(v.note));

const ok: unknown = JSON.parse('{"id":7,"items":[{"sku":"pen","qty":3}]}');
const bad: unknown = JSON.parse('{"id":8,"items":[{"sku":"pen","qty":"3"}]}');
console.log(isOrder(ok), isOrder(bad));
if (isOrder(ok)) console.log(ok.items[0].qty * 2);
```

```text
true false
6
```

- ‏`isRecord` הופך `unknown` לאובייקט שהשדות שלו `unknown`, כך שאפשר לקרוא את `v.sku` ואז לבדוק אותו.
- ‏`isNumber` דוחה גם `NaN` ו-`Infinity`, שעוברים את `typeof` ובדרך כלל מגיעים מהמרת `Number()` שנכשלה.
- ‏`isArrayOf(isItem)` בונה guard מ-guard. אותם חלקים מכסים כל טיפוס ב-API.
- שדה אופציונלי נבדק כ"חסר, או מהטיפוס הנכון".

## ה-guard שמשקר

‏TypeScript בודקת ש-guard מחזיר `boolean`. היא לא בודקת שהבוליאני מוכיח את הטיפוס:

```typescript
// lying.ts
type User = { name: string; email: string };

function isUser(v: unknown): v is User {
  return typeof v === "object" && v !== null && "name" in v;
}

const data: unknown = { name: "Dana" };
if (isUser(data)) console.log(data.email.toLowerCase());
```

```text
TypeError: Cannot read properties of undefined (reading 'toLowerCase')
```

‏`email` נוסף ל-`User` אחרי ש-`isUser` נכתב, ושום דבר לא נכשל עד זמן הריצה. ‏guard הוא `as` עם פונקציה מסביב. שמרו כל guard ליד הטיפוס שלו, ותנו לו בדיקה עם ערך שגוי לכל שדה. או תנו ל-[schema](he/posts/typescript-zod/) לייצר את הטיפוס ואת הבדיקה יחד, כך שהם לא יוכלו להתרחק זה מזה.

## ‏Type predicates מוסקים

מאז [TypeScript 5.5](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#inferred-type-predicates), פונקציה בלי הערת טיפוס יכולה עדיין להיות guard, כש-TypeScript יכולה להוכיח את ה-predicate מהגוף שלה. זה הכי חשוב ב-`filter`:

```typescript
// filter.ts
const raw: (number | undefined)[] = [3, undefined, 0, 7];

const defined = raw.filter((n) => n !== undefined);
const truthy = raw.filter(Boolean);

console.log(defined.map((n) => n.toFixed(1)));
console.log(truthy.map((n) => n.toFixed(1)));
```

```text
filter.ts(8,31): error TS18048: 'n' is possibly 'undefined'.
[ '3.0', '0.0', '7.0' ]
[ '3.0', '7.0' ]
```

- ‏`n !== undefined` מוסק כ-`n is number`, אז `defined` הוא `number[]`.
- ‏`filter(Boolean)` לא: `Boolean` הוא לא guard, והתוצאה נשארת `(number | undefined)[]`. הוא גם זרק את `0`, ערך אמיתי. כתבו את ההשוואה שאתם מתכוונים אליה.

להסקה יש תנאי: "אמת" חייב לומר שזה הטיפוס, ו"שקר" חייב לומר שזה לא הטיפוס. ‏`(n) => !!n` לא מוסק, כי `false` לא מוכיח ש-`n` הוא `undefined`; הוא יכול להיות `0`.

## סוג שהשרת הוסיף אחרי שהקוד כבר באוויר

‏[`switch` שמכסה את כל המקרים](he/posts/typescript-narrowing/) מוכיח שטיפלתם בכל סוג שאתם מכירים. השרת עדיין יכול לשלוח סוג שאתם לא מכירים. לנתונים מבחוץ, תנו לסוגים לא מוכרים איבר משלהם במקום קריסה:

```typescript
// events.ts
type Known = { kind: "click"; x: number } | { kind: "view"; page: string };
type AppEvent = Known | { kind: "unknown"; raw: unknown };

function toEvent(v: unknown): AppEvent {
  if (typeof v === "object" && v !== null && "kind" in v) {
    if (v.kind === "click" && "x" in v && typeof v.x === "number") return { kind: "click", x: v.x };
    if (v.kind === "view" && "page" in v && typeof v.page === "string") return { kind: "view", page: v.page };
  }
  return { kind: "unknown", raw: v };
}

const incoming: unknown[] = JSON.parse('[{"kind":"click","x":4},{"kind":"scroll","y":90}]');
for (const e of incoming.map(toEvent)) {
  if (e.kind === "unknown") console.log("skipped:", JSON.stringify(e.raw));
  else console.log(e.kind);
}
```

```text
click
skipped: {"kind":"scroll","y":90}
```

שאר הקוד עדיין מקבל union מלא, ו-`"unknown"` הוא עוד מקרה שהוא חייב לטפל בו: לרשום ללוג, לדלג, או להציג חלופה. ‏`toEvent` גם מעתיק רק את השדות שהוא בדק, כך ששום דבר שלא נבדק לא נגרר איתו.

## טעויות נפוצות של מתחילים

- **לבדוק `typeof v === "object"` ולעצור.** ‏`null` ומערכים עוברים. השתמשו ב-`isRecord` אחד בכל מקום.
- **לעדכן טיפוס ולא את ה-guard שלו.** שום דבר לא מזהיר. בדקו את ה-guard עם ערך שבור לכל שדה.
- **‏`filter(Boolean)` כדי להסיר `undefined`.** הוא מסיר גם `0` ו-`""`, ולא מצמצם. השוו עם `!== undefined`.

## מה הלאה

בפוסט הבא: zod לעומק: הרכבת schemas, ‏transforms, מפתחות לא מוכרים ודוחות שגיאה.
