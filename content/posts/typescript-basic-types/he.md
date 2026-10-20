---
title: "טיפוסים בסיסיים ב-TypeScript: הצהרה, הסקה, מערכים ו-tuples"
summary: "string, ‏number, ‏boolean ו-bigint, מערכים ו-tuples, ומתי TypeScript מסיקה את הטיפוס לבד כך שלא צריך לכתוב אותו."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 4 }
---

טיפוס כותבים אחרי נקודתיים: `let title: string`. ברוב המקרים אין צורך, כי TypeScript מסיקה את הטיפוס מהערך הראשון. הפוסט עובר על הטיפוסים הפרימיטיביים, על מערכים ועל tuples, ועל השאלה איפה כן כדאי לכתוב טיפוס.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24. השורות שמתחילות בשם הקובץ הן שגיאות של `tsc`, והשאר הוא הפלט של ההרצה.

## הטיפוסים הפרימיטיביים

```typescript
// basics.ts
let title: string = "Loom";
let count = 3;
let done = false;
const big = 9007199254740993n;

count = count + 1;
done = "yes";
console.log(title, count, typeof big);
```

```text
basics.ts(8,1): error TS2322: Type 'string' is not assignable to type 'boolean'.
Loom 4 bigint
```

רק ל-`title` כתבנו טיפוס, ולשאר TypeScript הסיקה אותו מהערך: ‏`count` הוא `number` ו-`done` הוא `boolean`. מכאן ש-`done = "yes"` הוא שגיאה. ‏`number` מכסה גם שלמים וגם שברים, ו-`bigint` (עם `n` בסוף) מיועד למספרים שלמים גדולים מ-`Number.MAX_SAFE_INTEGER`.

השמות באותיות קטנות: `string` ולא `String`. ‏`String` הוא טיפוס של אובייקט עוטף, ו[התיעוד](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) ממליץ לא להשתמש בו.

## מערכים ו-tuples

```typescript
// arrays.ts
const scores: number[] = [90, 85];
const names: Array<string> = ["Dana", "Noa"];
const pair: [string, number] = ["Dana", 90];

scores.push("100");
const [player, score] = pair;
console.log(player.toUpperCase(), score.toFixed(1), names.length);
```

```text
arrays.ts(6,13): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
DANA 90.0 2
```

- `number[]` ו-`Array<number>` הם אותו טיפוס בשני כתיבים.
- `[string, number]` הוא tuple: מערך באורך ידוע, שלכל מקום בו יש טיפוס משלו. בפירוק, ‏`player` מקבל `string` ו-`score` מקבל `number`, ולכן אפשר לקרוא ל-`toFixed` בלי בדיקה.
- `push("100")` נכשל ב-`tsc`, אבל רץ: ‏`scores` מכיל עכשיו מחרוזת, ושום דבר לא עוצר את זה בזמן ריצה.

## איפה TypeScript מסיקה לבד

```typescript
// infer.ts
function average(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const avg = average([90, 85]);
console.log(avg.toFixed(2));

const mixed = ["a", 1];
mixed.push(true);
```

```text
infer.ts(10,12): error TS2345: Argument of type 'boolean' is not assignable to parameter of type 'string | number'.
87.50
```

- סוג ההחזרה של `average` לא נכתב, ו-TypeScript הסיקה `number` מהחישוב. גם `avg` הוא `number`.
- `mixed` קיבל את הטיפוס `(string | number)[]`, כלומר מערך שכל איבר בו הוא מחרוזת או מספר. ‏`true` לא מתאים.

הכלל המקובל: כותבים טיפוס בפרמטרים של פונקציות, כי שם אין ממה להסיק, ובערכים שמתחילים ריקים (`const ids: number[] = []`). את המשתנים המקומיים ואת סוג ההחזרה משאירים להסקה, אלא אם רוצים שסוג ההחזרה ישמש כחוזה שהפונקציה חייבת לעמוד בו.

## טעויות נפוצות של מתחילים

- **לכתוב טיפוס לכל משתנה.** ‏`let count: number = 3` לא מוסיף מידע, רק רעש.
- **לכתוב `String` או `Number` באות גדולה.** הטיפוסים הנכונים הם `string` ו-`number`.
- **לשכוח שהבדיקה לא קיימת בזמן ריצה.** ‏`push("100")` הוסיף מחרוזת למערך של מספרים כשהקוד רץ, למרות השגיאה.

## מה הלאה

בפוסט הבא: ‏`any`, ‏`unknown`, ‏`never` ו-`void`.
