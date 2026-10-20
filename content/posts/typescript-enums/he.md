---
title: "enum ב-TypeScript, ובמה משתמשים במקומו"
summary: "enum מספרי ומחרוזתי, ה-JavaScript ש-tsc מייצר מהם ו-reverse mapping. החלופות: union של literals ואובייקט as const, שרצים ב-Node בלי tsx."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 12 }
---

‏`enum` נותן שמות לקבוצה של קבועים. בניגוד לרוב התחביר של TypeScript, הוא לא נמחק בקומפילציה אלא הופך לאובייקט JavaScript, ולכן Node לא מריץ אותו בלי tsx וב-`erasableSyntaxOnly` הוא שגיאה ([בפוסט על ההתקנה](he/posts/typescript-setup/)).

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24. דוגמאות עם `enum` רצו עם tsx.

## ‏enum מספרי

```typescript
// direction.ts (run with tsx)
enum Direction {
  Up,
  Down,
}

const next: Direction = 5;
console.log(Direction.Down, Direction[0], next, Object.values(Direction));
```

```text
direction.ts(7,7): error TS2322: Type '5' is not assignable to type 'Direction'.
1 Up 5 [ 'Up', 'Down', 0, 1 ]
```

בלי ערכים מפורשים, האיברים מקבלים מספרים מ-0 והלאה. ‏`tsc` דוחה מספר שאינו אחד הערכים, אבל בזמן ריצה ההשמה עברה. זה ה-JavaScript ש-`tsc` מייצר מה-`enum`:

```javascript
// direction.js (tsc output)
var Direction;
(function (Direction) {
    Direction[Direction["Up"] = 0] = "Up";
    Direction[Direction["Down"] = 1] = "Down";
})(Direction || (Direction = {}));
```

כל איבר נכתב פעמיים: מהשם למספר ומהמספר לשם. זה [reverse mapping](https://www.typescriptlang.org/docs/handbook/enums.html#reverse-mappings), והוא הסיבה ש-`Direction[0]` מחזיר `"Up"` ו-`Object.values` מחזיר גם שמות וגם מספרים.

## ‏enum של מחרוזות

```typescript
// color.ts (run with tsx)
enum Color {
  Red = "RED",
  Green = "GREEN",
}

const fromApi: Color = "RED";
console.log(Color.Red, Object.keys(Color));
```

```text
color.ts(7,7): error TS2322: Type '"RED"' is not assignable to type 'Color'.
RED [ 'Red', 'Green' ]
```

לאיברים מחרוזתיים אין reverse mapping. ‏`enum` של מחרוזות גם לא מקבל את המחרוזת עצמה, אפילו כשהיא זהה לערך: מותר רק `Color.Red`. כשהערך מגיע מ-JSON או מ-API, צריך להמיר אותו.

## החלופות: union ואובייקט as const

כשצריך רק רשימת ערכים מותרים, מספיק union של literals: ‏`type Status = "active" | "blocked"` ([בפוסט על unions](he/posts/typescript-unions-literals/)). כשצריך גם אובייקט עם שמות, כמו ב-`enum`, משתמשים באובייקט [`as const`](https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums):

```typescript
// status.ts
const Status = {
  Active: "active",
  Blocked: "blocked",
} as const;

type Status = (typeof Status)[keyof typeof Status];

function label(value: Status) {
  return value.toUpperCase();
}

console.log(label(Status.Active), label("blocked"));
label("deleted");
```

```text
status.ts(14,7): error TS2345: Argument of type '"deleted"' is not assignable to parameter of type 'Status'.
ACTIVE BLOCKED
```

‏`as const` הופך את הערכים ל-literals קבועים, והשורה של `type Status` מחלצת מהם את ה-union ‏`"active" | "blocked"` ([פוסט על `keyof` ו-`typeof`](he/posts/typescript-keyof-typeof/)). לאובייקט ולטיפוס יכול להיות אותו שם, כי האחד ערך והשני טיפוס. בניגוד ל-`enum`, גם המחרוזת עצמה מתקבלת, וזה JavaScript רגיל, אז Node מריץ אותו ישירות.

## ‏const enum

‏`const enum` נמחק לגמרי בקומפילציה, ו-`tsc` כותב את הערך עצמו בכל מקום שמשתמשים בו ([לפי המדריך](https://www.typescriptlang.org/docs/handbook/enums.html#const-enums)). זה עדיין תחביר שצריך המרה: גם הוא לא רץ ב-Node בלי tsx ונכשל ב-`erasableSyntaxOnly`.

## טעויות נפוצות של מתחילים

- **להעביר מחרוזת מ-API ישר ל-`enum` של מחרוזות.** ‏`tsc` דוחה אותה, ו-`as Color` רק משתיק את הבדיקה. בודקים שהערך באמת אחד האיברים.
- **‏`Object.values` על `enum` מספרי.** מקבלים גם את השמות, בגלל ה-reverse mapping.
- **להוסיף איבר באמצע `enum` מספרי בלי ערכים מפורשים.** כל האיברים שאחריו זזים במספר אחד, וערכים ששמורים במסד נתונים כבר לא מתאימים.

## מה הלאה

בפוסט הבא: מחלקות, ‏`private` מול `#private`, ‏`abstract` ו-parameter properties.
