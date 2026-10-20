---
title: "any, ‏unknown, ‏never ו-void ב-TypeScript"
summary: "any מכבה את הבדיקה, unknown מחייב לבדוק לפני שימוש, void הוא פונקציה שלא מחזירה ערך ו-never הוא ערך שלא יכול להתקיים. מתי משתמשים בכל אחד."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 5 }
---

ארבעת הטיפוסים האלה לא מתארים מחרוזת או מספר, אלא מקרי קצה: ערך שלא יודעים מה הוא, פונקציה שלא מחזירה כלום, וקוד שלא אמור להגיע אליו.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## ‏any: בלי בדיקה

```typescript
// any.ts
const data: any = JSON.parse('{"name":"Dana"}');
console.log(data.nmae.toUpperCase());
```

```text
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

`tsc` לא דיווח על שום שגיאה. ‏`any` אומר "אל תבדוק": כל שדה, כל קריאה וכל השמה מותרים, וגם כל ערך שמחושב ממנו הוא `any`. ‏`JSON.parse` מחזיר `any`, ולכן הבעיה הזו נפוצה במיוחד בנתונים שמגיעים מבחוץ.

## ‏unknown: לבדוק לפני שמשתמשים

```typescript
// unknown.ts
const data: unknown = JSON.parse('{"name":"Dana"}');
console.log(data.name);

if (typeof data === "object" && data !== null && "name" in data) {
  console.log(data.name);
}
```

```text
unknown.ts(3,13): error TS18046: 'data' is of type 'unknown'.
Dana
Dana
```

גם ל-`unknown` אפשר להכניס כל ערך, אבל אי אפשר לעשות איתו כלום עד שבודקים מה הוא. אחרי שלוש הבדיקות בתוך ה-`if`, ‏TypeScript יודעת ש-`data` הוא אובייקט עם `name`. זה נקרא narrowing, ויש עליו פוסט נפרד. כשלא יודעים מה הטיפוס, ‏`unknown` הוא הבחירה הנכונה ולא `any`.

## ‏void ו-never

```typescript
// never.ts
function log(message: string): void {
  console.log(message);
}

function fail(message: string): never {
  throw new Error(message);
}

log("start");
const port: number = Number("abc") || fail("bad port");
```

```text
start
Error: bad port
```

- `void`: הפונקציה לא מחזירה ערך שימושי. זה סוג ההחזרה שמוסק לפונקציה בלי `return`.
- `never`: הפונקציה אף פעם לא מסיימת כרגיל, כי היא זורקת חריגה או רצה לנצח. ‏`Number("abc")` הוא `NaN`, ולכן `fail` נקראת. מאחר ש-`never` לא מוסיף טיפוס לביטוי, ‏`port` נשאר `number`.

`never` מופיע גם כשבדיקות מכסות את כל האפשרויות, ואז הוא משמש לבדוק שלא שכחנו מקרה (בפוסט על narrowing).

## ‏catch מקבל unknown

```typescript
// catch.ts
try {
  JSON.parse("{");
} catch (err) {
  console.log(err.message);
  if (err instanceof Error) {
    console.log(err.message);
  }
}
```

```text
catch.ts(5,15): error TS18046: 'err' is of type 'unknown'.
Expected property name or '}' in JSON at position 1 (line 1 column 2)
Expected property name or '}' in JSON at position 1 (line 1 column 2)
```

ב-JavaScript אפשר לזרוק כל ערך, לא רק `Error`, ולכן המשתנה ב-`catch` הוא `unknown`. ‏`instanceof Error` מצמצם אותו ל-`Error`.

### בגרסאות קודמות

המשתנה ב-`catch` היה `any` עד ש-TypeScript 4.4 הוסיפה את `useUnknownInCatchVariables`, שהיא חלק מ-`strict`. בפרויקטים בלי `strict`, ובכל פרויקט לפני 6.0 שלא הדליק אותה, ‏`err.message` עדיין עובר בלי שגיאה.

## טעויות נפוצות של מתחילים

- **`any` כדי שהשגיאה תיעלם.** השגיאה עוברת לזמן הריצה. ‏`unknown` ובדיקה הם התיקון.
- **להניח שתוצאה של `JSON.parse` או `fetch` היא מהטיפוס שכתבנו.** זה `any`, ושום דבר לא בודק אותו.
- **לבלבל בין `void` ל-`undefined`.** ‏`void` אומר "אל תשתמשו בערך שחוזר", לא "חוזר בדיוק `undefined`".

## מה הלאה

בפוסט הבא: פונקציות, פרמטרים אופציונליים, סוגי פונקציות ו-overloads.
