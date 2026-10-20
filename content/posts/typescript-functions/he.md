---
title: "פונקציות ב-TypeScript: פרמטרים, סוגי פונקציות ו-overloads"
summary: "טיפוסים לפרמטרים ולערך החזרה, פרמטרים אופציונליים, ערכי ברירת מחדל ו-rest, סוג של פונקציה כטיפוס, ו-overloads לפונקציה שמחזירה טיפוס שונה לפי הקלט."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 6 }
---

בפונקציות TypeScript בודקת שני דברים: שהקריאה מעבירה את מספר הארגומנטים הנכון ובטיפוסים הנכונים, ושהפונקציה מחזירה את מה שהבטיחה.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## פרמטרים: חובה, אופציונלי וברירת מחדל

```typescript
// greet.ts
function greet(name: string, greeting = "Hello", punctuation?: string): string {
  return `${greeting}, ${name}${punctuation ?? "!"}`;
}

console.log(greet("Dana"));
console.log(greet("Dana", "Hi", "?"));
greet();
greet("Dana", "Hi", "?", "extra");
```

```text
greet.ts(8,1): error TS2554: Expected 1-3 arguments, but got 0.
greet.ts(9,26): error TS2554: Expected 1-3 arguments, but got 4.
Hello, Dana!
Hi, Dana?
```

- `name: string` הוא פרמטר חובה.
- `greeting = "Hello"` מקבל ערך ברירת מחדל, ומזה TypeScript מסיקה שהוא `string`.
- `punctuation?: string` הוא אופציונלי: בתוך הפונקציה הטיפוס שלו הוא `string | undefined`, ולכן `??` מטפל במקרה שלא הועבר.

ב-JavaScript שתי הקריאות האחרונות היו רצות בלי אזהרה. כאן כל קריאה עם מספר ארגומנטים לא נכון היא שגיאה.

## ‏rest וסוג של פונקציה

```typescript
// math.ts
function sum(...values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

type Op = (a: number, b: number) => number;
const multiply: Op = (a, b) => a * b;
const broken: Op = (a, b) => `${a}${b}`;

console.log(sum(1, 2, 3), multiply(4, 5));
```

```text
math.ts(8,30): error TS2322: Type 'string' is not assignable to type 'number'.
6 20
```

- `...values: number[]` אוסף כל מספר של ארגומנטים למערך.
- `type Op = (a: number, b: number) => number` מגדיר סוג של פונקציה. ב-`multiply` לא כתבנו טיפוס ל-`a` ול-`b`: הם נלקחו מ-`Op`. ‏`broken` מחזירה מחרוזת, ולכן לא מתאימה ל-`Op`.

סוגי פונקציות שימושיים בעיקר ב-callbacks: פרמטר שהוא `(item: string) => void` אומר בדיוק מה הפונקציה שמעבירים צריכה לקבל ולהחזיר.

## ‏overloads

כשהטיפוס שחוזר תלוי בטיפוס שנכנס, כותבים כמה חתימות מעל המימוש:

```typescript
// overloads.ts
function parse(value: string): number;
function parse(value: number): string;
function parse(value: string | number): string | number {
  return typeof value === "string" ? Number(value) : String(value);
}

const n = parse("42");
const s = parse(42);
console.log(n + 1, s.padStart(4, "0"));
parse(true);
```

```text
overloads.ts(11,7): error TS2769: No overload matches this call.
  Overload 1 of 2, '(value: string): number', gave the following error.
    Argument of type 'boolean' is not assignable to parameter of type 'string'.
  Overload 2 of 2, '(value: number): string', gave the following error.
    Argument of type 'boolean' is not assignable to parameter of type 'number'.
43 0042
```

שתי השורות הראשונות הן החתימות שהקוראים רואים, והשלישית היא המימוש, שלא נגיש מבחוץ. ‏`n` יצא `number` ו-`s` יצא `string`, בלי בדיקה בקוד שקורא. בהודעת השגיאה, TypeScript 7.0 מפרט רק את החתימה האחרונה.

כשאפשר, עדיף טיפוס אחד מכמה overloads: לפעמים union בפרמטר מספיק, ולפעמים generics (בפוסט משלהם).

## טעויות נפוצות של מתחילים

- **פרמטר אופציונלי לפני פרמטר חובה.** ‏`function f(a?: string, b: string)` היא שגיאה. האופציונליים באים בסוף.
- **לשכוח ש-`?` מוסיף `undefined`.** בתוך הפונקציה צריך לטפל במקרה שהערך לא הועבר.
- **לכתוב overloads כשמספיק union.** אם סוג ההחזרה לא משתנה לפי הקלט, ‏`value: string | number` פשוט יותר.

## מה הלאה

בפוסט הבא: טיפוסים של אובייקטים, שדות אופציונליים ו-`readonly`.
