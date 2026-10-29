---
title: "narrowing ב-TypeScript: typeof, ‏in, ‏instanceof ו-discriminated unions"
summary: "איך TypeScript מצמצמת union לפי הבדיקות בקוד: typeof, השוואה, in ו-instanceof. ‏discriminated unions, ואיך never מוודא שלא שכחתם מקרה ב-switch."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 10 }
---

כשלערך יש טיפוס union, ‏TypeScript עוקבת אחרי הבדיקות בקוד ומצמצמת את הטיפוס בכל ענף. התהליך הזה נקרא narrowing, והוא הסיבה שאפשר לעבוד עם unions בלי המרות.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## ‏typeof והשוואה

```typescript
// describe.ts
function describe(value: string | number | string[] | null) {
  if (value === null) return "nothing";
  if (typeof value === "string") return value.toUpperCase();
  if (typeof value === "number") return value.toFixed(1);
  return value.join(", ");
}

console.log(describe("hi"), describe(2), describe(["a", "b"]), describe(null));
```

```text
HI 2.0 a, b nothing
```

אחרי `value === null` עם `return`, ‏`null` יוצא מהטיפוס. אחרי כל `typeof` יוצא עוד חלק, ובשורה האחרונה נשאר רק `string[]`, ולכן `join` מותר. ‏`typeof null` הוא `"object"`, ולכן את `null` בודקים בהשוואה ישירה.

## ‏in ו-instanceof

```typescript
// move.ts
type Fish = { swim(): string };
type Bird = { fly(): string };

function move(animal: Fish | Bird) {
  if ("swim" in animal) return animal.swim();
  return animal.fly();
}

function year(value: Date | string) {
  return value instanceof Date ? value.getFullYear() : Number(value.slice(0, 4));
}

console.log(move({ fly: () => "flying" }), year(new Date(2026, 0, 1)), year("2025-12-31"));
```

```text
flying 2026 2025
```

- `"swim" in animal` מצמצם לטיפוסים שיש בהם `swim`.
- `instanceof Date` מצמצם למחלקה. הוא עובד רק עם מחלקות, לא עם `type` או `interface`, כי הם לא קיימים בזמן ריצה.

## ‏discriminated unions ובדיקת כיסוי

התבנית הנפוצה ביותר: לכל חלק ב-union יש שדה משותף עם ערך literal שונה, ו-`switch` על השדה הזה מצמצם לחלק המתאים.

```typescript
// area.ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.size ** 2;
    default: {
      const unhandled: never = shape;
      throw new Error(`unknown shape: ${JSON.stringify(unhandled)}`);
    }
  }
}

console.log(area({ kind: "square", size: 3 }));
```

```text
area.ts(14,13): error TS2322: Type '{ kind: "triangle"; base: number; height: number; }' is not assignable to type 'never'.
9
```

בתוך `case "circle"`, ‏`shape` הוא רק העיגול, ולכן `shape.radius` מותר. ב-`default` אמור להישאר `never`, כלומר שום מקרה. שכחנו את המשולש, ולכן נשאר טיפוס, וההשמה ל-`never` נכשלת. כשמוסיפים חלק חדש ל-`Shape`, ‏`tsc` מראה כל `switch` שלא מטפל בו.

## טעויות נפוצות של מתחילים

- **`typeof value === "object"` כדי לזהות אובייקט.** גם `null` ומערכים עוברים. משלימים עם `value !== null` או `Array.isArray`.
- **`instanceof` על `interface`.** אין לו קיום בזמן ריצה. משתמשים ב-`in` או בשדה מבחין.
- **`default` שמחזיר ערך כלשהו במקום `never`.** כך מקרה חדש נבלע בשקט.

## מה הלאה

בפוסט הבא: מידול state עם discriminated unions, כך שאי אפשר לכתוב מצבים בלתי אפשריים.
