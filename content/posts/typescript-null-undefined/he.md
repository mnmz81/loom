---
title: "null ו-undefined ב-TypeScript: ‏strictNullChecks, ‏?., ‏?? ו-!"
summary: "איך strictNullChecks מכריחה לטפל ב-null וב-undefined, מה ההבדל בין ?? ל-||, למה find ו-Map.get מחזירים undefined, ומתי הסימן ! מעביר את הקריסה לזמן ריצה."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 12 }
---

ב-JavaScript יש שני ערכים שאומרים "אין כאן כלום": ‏`null` ו-`undefined`. גישה לשדה של אחד מהם זורקת `TypeError` בזמן ריצה. ב-TypeScript הם טיפוסים נפרדים, ו-`tsc` מחייב לטפל בהם לפני השימוש.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## ‏strictNullChecks

```typescript
// city.ts
type User = { name: string; address?: { city: string } };

function city(user: User) {
  return user.address.city;
}

console.log(city({ name: "Dana" }));
```

```text
city.ts(5,10): error TS18048: 'user.address' is possibly 'undefined'.
TypeError: Cannot read properties of undefined (reading 'city')
```

שדה אופציונלי (`address?`) הוא בפועל `{ city: string } | undefined`. בזכות [`strictNullChecks`](https://www.typescriptlang.org/tsconfig/#strictNullChecks), שהיא חלק מ-`strict`, ‏`undefined` נשאר בטיפוס עד שבודקים אותו, ו-`tsc` מסמן את השורה שקורסת. התיקון הוא בדיקה (`if (user.address)`) או `?.` מהסעיף הבא.

### בגרסאות קודמות

עד TypeScript 6.0 ברירת המחדל של `strict` הייתה `false`. בפרויקט שלא כתב `"strict": true` ב-`tsconfig.json`, ‏`null` ו-`undefined` היו חלק מכל טיפוס, ו-`user.address.city` עבר את `tsc` בלי שום שגיאה. מאז [6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) ‏`strict` דלוק כברירת מחדל.

## ‏?. ו-??

```typescript
// settings.ts
type Settings = { volume?: number; theme?: { color: string } };

const settings: Settings = { volume: 0 };

console.log(settings.theme?.color);
console.log(settings.volume || 50);
console.log(settings.volume ?? 50);
```

```text
undefined
50
0
```

- [`?.`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining) עוצר ומחזיר `undefined` אם מה שמשמאלו הוא `null` או `undefined`, במקום לזרוק שגיאה. הטיפוס של `settings.theme?.color` הוא `string | undefined`.
- ‏`||` מחליף כל ערך falsy, ולכן `0` הפך ל-50.
- [`??`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing) מחליף רק `null` ו-`undefined`, ו-`0` נשאר. לערך ברירת מחדל זו כמעט תמיד הבחירה הנכונה.

## ‏find, ‏Map.get והסימן !

```typescript
// lookup.ts
const ids = [3, 7, 9];
const prices = new Map([["apple", 5]]);

const found = ids.find((id) => id > 5);
console.log(found.toFixed());

const price = prices.get("pear")!;
console.log(price.toFixed(2));
```

```text
lookup.ts(6,13): error TS18048: 'found' is possibly 'undefined'.
7
TypeError: Cannot read properties of undefined (reading 'toFixed')
```

`find` מחזיר `T | undefined`, כי ייתכן ששום איבר לא מתאים. גם `Map.get` מחזיר `number | undefined`. במקרה של `found`, ‏`tsc` דיווח על שגיאה, והקוד דווקא עבד כי נמצא 7.

ה-`!` אחרי `prices.get("pear")` הוא [non-null assertion](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#non-null-assertion-operator-postfix-): הוא אומר ל-TypeScript "הערך לא `null` ולא `undefined`" ומוחק את `undefined` מהטיפוס. בזמן ריצה הוא לא בודק כלום, ולכן `tsc` שתק והקוד קרס. במקום `!` כותבים בדיקה, או ערך ברירת מחדל: ‏`prices.get("pear") ?? 0`.

## טעויות נפוצות של מתחילים

- **‏`!` כדי שהשגיאה תיעלם.** השגיאה עוברת לזמן ריצה. משתמשים בו רק כשיודעים משהו ש-TypeScript לא יכולה לדעת.
- **‏`||` לערך ברירת מחדל.** ‏`0`, ‏`""` ו-`false` מוחלפים גם הם. משתמשים ב-`??`.
- **‏`if (count)` כדי לבדוק `undefined`.** גם `0` נכשל בבדיקה. כותבים `count !== undefined`.

## מה הלאה

בפוסט הבא: ‏enums, ובמה משתמשים במקומם.
