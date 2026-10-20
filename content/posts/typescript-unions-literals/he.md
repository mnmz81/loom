---
title: "unions ו-literal types ב-TypeScript, ו-as const"
summary: "union אומר 'אחד מכמה טיפוסים', ו-literal type הוא ערך מדויק כמו \"md\". למה const ו-let מקבלים טיפוסים שונים, ואיך as const הופך אובייקט ומערך לקבועים."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 9 }
---

union כותבים עם `|`: ‏`string | number` הוא "מחרוזת או מספר". כשמחברים כך ערכים מדויקים, כמו `"sm" | "md" | "lg"`, מקבלים רשימה סגורה של אפשרויות, ו-TypeScript בודקת שהקוד לא חורג ממנה.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## ‏literal types

```typescript
// literals.ts
type Size = "sm" | "md" | "lg";
let size: Size = "md";
size = "xl";

let a = "md";
const b = "md";
size = a;
size = b;
```

```text
literals.ts(4,1): error TS2322: Type '"xl"' is not assignable to type 'Size'.
literals.ts(8,1): error TS2322: Type 'string' is not assignable to type 'Size'.
```

`"xl"` לא ברשימה. הדבר המעניין הוא ההבדל בין `a` ל-`b`: ‏`let a = "md"` יכול להשתנות אחר כך, ולכן הטיפוס שלו הוא `string`. ‏`const b` לא ישתנה לעולם, ולכן הטיפוס שלו הוא בדיוק `"md"`, וזה מתאים ל-`Size`.

## ‏as const

```typescript
// as-const.ts
const sizes = ["sm", "md", "lg"] as const;
type Size = (typeof sizes)[number];
const config = { retries: 3, mode: "fast" } as const;

config.retries = 4;
const s: Size = "lg";
console.log(sizes.length, s, config.mode);
```

```text
as-const.ts(6,8): error TS2540: Cannot assign to 'retries' because it is a read-only property.
3 lg fast
```

בלי `as const`, ‏`sizes` הוא `string[]` ו-`config.mode` הוא `string`. ‏`as const` שומר את הערכים המדויקים והופך הכל ל-`readonly`. בשורה השנייה בונים מהמערך את ה-union `"sm" | "md" | "lg"`, כך שהרשימה כתובה פעם אחת וזמינה גם בזמן ריצה. ‏`typeof` ו-`[number]` מוסברים בפוסט משלהם.

## ‏union של טיפוסים

```typescript
// format.ts
function format(id: string | number) {
  return id.toUpperCase();
}
```

```text
format.ts(3,13): error TS2339: Property 'toUpperCase' does not exist on type 'string | number'.
  Property 'toUpperCase' does not exist on type 'number'.
```

על ערך מטיפוס union מותר לעשות רק מה שמותר על **כל** החלקים שלו. ‏`toUpperCase` קיים רק במחרוזות, ולכן צריך קודם לבדוק: `typeof id === "string"`. הבדיקה הזו נקראת narrowing, והיא הנושא של הפוסט הבא.

## טעויות נפוצות של מתחילים

- **`let` עם ערך שאמור להיות literal.** ‏`let mode = "fast"` הוא `string`. או `const`, או טיפוס מפורש (`let mode: Mode = "fast"`).
- **רשימת ערכים כפולה.** מערך בזמן ריצה וגם union נפרד יוצאים מסנכרון. ‏`as const` ו-`typeof` שומרים מקור אחד.
- **לצפות ש-`as const` יקפיא בזמן ריצה.** הוא משפיע רק על הטיפוסים.

## מה הלאה

בפוסט הבא: narrowing, ‏discriminated unions ובדיקה שכל המקרים מכוסים.
