---
title: "טיפוסים של אובייקטים ב-TypeScript: שדות אופציונליים, readonly ו-index signatures"
summary: "איך מתארים אובייקט: שדות חובה, אופציונליים ו-readonly, למה שדה מיותר הוא שגיאה רק לפעמים, ו-index signatures לאובייקט שהמפתחות שלו לא ידועים מראש."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 7 }
---

רוב הנתונים בקוד הם אובייקטים: משתמש, הזמנה, הגדרות. טיפוס של אובייקט מתאר אילו שדות יש בו ומה הטיפוס של כל אחד.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## שדות חובה, אופציונליים ו-readonly

```typescript
// user.ts
type User = {
  readonly id: number;
  name: string;
  email?: string;
};

const dana: User = { id: 1, name: "Dana" };
dana.name = "Dana L.";
dana.id = 2;
console.log(dana.email?.toLowerCase() ?? "no email");
```

```text
user.ts(10,6): error TS2540: Cannot assign to 'id' because it is a read-only property.
no email
```

- `type User = { ... }` נותן שם לטיפוס, כדי להשתמש בו בכמה מקומות. ‏`interface` עושה כמעט אותו דבר (בפוסט הבא).
- `email?` אופציונלי. הטיפוס שלו `string | undefined`, ולכן ניגשים אליו עם `?.`.
- `readonly id` אפשר לקבוע רק ביצירה. ‏`readonly` נבדק רק ב-`tsc`: בזמן ריצה השורה `dana.id = 2` רצה ומשנה את הערך.

## שדה מיותר: שגיאה רק באובייקט חדש

```typescript
// excess.ts
type Point = { x: number; y: number };

const p: Point = { x: 1, y: 2, z: 3 };
const raw = { x: 1, y: 2, z: 3 };
const q: Point = raw;
console.log(q);
```

```text
excess.ts(4,32): error TS2353: Object literal may only specify known properties, and 'z' does not exist in type 'Point'.
{ x: 1, y: 2, z: 3 }
```

TypeScript בודקת מבנה ולא שם: כל אובייקט שיש בו `x` ו-`y` מספריים הוא `Point`, גם עם שדות נוספים. לכן `q = raw` עובר. החריג הוא אובייקט שנכתב ישירות במקום שבו מצופה `Point`: שם שדה שלא קיים בטיפוס הוא כנראה טעות כתיב, ו-TypeScript מדווחת עליו (excess property check).

## ‏index signatures

כשהמפתחות לא ידועים מראש, למשל ציונים לפי שם, כותבים את הטיפוס של המפתח ושל הערך:

```typescript
// scores.ts
const scores: { [name: string]: number } = { dana: 90 };
scores.noa = 85;
scores.dana = "high";

const missing = scores.yael;
console.log(missing.toFixed(1));
```

```text
scores.ts(4,1): error TS2322: Type 'string' is not assignable to type 'number'.
TypeError: Cannot read properties of undefined (reading 'toFixed')
```

`Record<string, number>` הוא אותו טיפוס בכתיב קצר. שימו לב לשורה האחרונה: ‏`scores.yael` לא קיים, אבל TypeScript אומרת שהוא `number` ולא מדווחת על כלום. האפשרות `noUncheckedIndexedAccess` ב-`tsconfig.json` מוסיפה `undefined` לכל גישה כזו, וכך `tsc` מחייב לבדוק לפני השימוש. היא לא חלק מ-`strict`, אבל `tsc --init` מדליק אותה.

## טעויות נפוצות של מתחילים

- **לסמוך על `readonly` בזמן ריצה.** זו בדיקה של הקומפיילר בלבד. להקפאה בזמן ריצה יש `Object.freeze`.
- **להניח ש"שדה מיותר" תמיד נתפס.** רק באובייקט שנכתב ישירות. אובייקט שעבר דרך משתנה יכול להכיל כל שדה נוסף.
- **index signature בלי `noUncheckedIndexedAccess`.** כל מפתח שלא קיים נראה כאילו יש לו ערך.

## מה הלאה

בפוסט הבא: ‏`interface` לעומת `type`, ומתי לבחור בכל אחד.
