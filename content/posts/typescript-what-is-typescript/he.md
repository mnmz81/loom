---
title: "מה זה TypeScript, ולמה להוסיף טיפוסים ל-JavaScript?"
summary: "מה זה TypeScript, אילו באגים היא תופסת לפני שהקוד רץ, למה הטיפוסים נעלמים בזמן ריצה, ומה ההבדל בין TypeScript 6.0 ל-7.0."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 1 }
---

TypeScript היא, כלשון [האתר הרשמי](https://www.typescriptlang.org/), ‏"JavaScript עם תחביר לטיפוסים". ‏Microsoft מפתחת אותה כקוד פתוח. כותבים JavaScript, מוסיפים איפה שצריך מה כל ערך אמור להיות, והקומפיילר `tsc` בודק את הקוד לפני שהוא רץ. מה שיוצא בסוף הוא JavaScript רגיל, שרץ בכל מקום ש-JavaScript רצה בו.

הסדרה מניחה היכרות בסיסית עם JavaScript. כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## מה TypeScript תופסת

שגיאת כתיב בשם של שדה. ב-JavaScript היא מתגלה רק כשהשורה רצה:

```typescript
// user.ts
const user = { name: "Dana", age: 31 };
console.log(user.nmae.toUpperCase());
```

```text
user.ts(3,18): error TS2339: Property 'nmae' does not exist on type '{ name: string; age: number; }'.
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

השורה הראשונה היא `tsc`: הוא יודע ש-`user` כולל רק `name` ו-`age`, בלי שכתבנו טיפוס בכלל. השורה השנייה היא מה שקורה כשמריצים בכל זאת. בעורך קוד השגיאה מסומנת עוד לפני ששומרים את הקובץ.

## טיפוסים מתארים מה פונקציה מצפה לקבל

```typescript
// total.ts
function total(prices: number[]): number {
  return prices.reduce((sum, p) => sum + p, 0);
}

console.log(total([10, 20]));
console.log(total(["10", "20"]));
```

```text
total.ts(7,20): error TS2322: Type 'string' is not assignable to type 'number'.
total.ts(7,26): error TS2322: Type 'string' is not assignable to type 'number'.
30
01020
```

‏`prices: number[]` אומר "מערך של מספרים", ו-`: number` אחרי הסוגריים אומר מה הפונקציה מחזירה. ‏JavaScript לא מתלוננת על הקריאה השנייה: היא מחברת מחרוזות ומחזירה `"01020"`. ‏TypeScript מסמנת כל אחד משני הערכים השגויים.

## הטיפוסים נעלמים כשהקוד רץ

זה מה ש-`tsc` מייצר מהפונקציה:

```javascript
"use strict";
function total(prices) {
    return prices.reduce((sum, p) => sum + p, 0);
}
console.log(total([10, 20]));
```

הטיפוסים נמחקו, והשאר נשאר כמו שהוא. [התיעוד](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html) קובע ש-TypeScript "אף פעם לא משנה את התנהגות זמן הריצה של קוד JavaScript". יש לזה שתי תוצאות:

- אין בדיקה בזמן ריצה. נתונים שמגיעים מהשרת או מהמשתמש לא נבדקים מול הטיפוס, וצריך לבדוק אותם בקוד (יש על זה פוסט בהמשך הסדרה).
- הקוד רץ גם כשיש שגיאות טיפוסים. ‏Node.js מריץ קבצי `.ts` ישירות ופשוט מוחק את הטיפוסים, כמו בשתי הדוגמאות למעלה.

## לא צריך לכתוב טיפוס לכל דבר

TypeScript מסיקה טיפוסים לבד (inference). משתנה שהתחיל כמספר נשאר מספר:

```typescript
let count = 5;
count = "five";
```

```text
example.ts(2,1): error TS2322: Type 'string' is not assignable to type 'number'.
```

בפועל כותבים טיפוסים בעיקר בפרמטרים של פונקציות ובמבנים משותפים, ונותנים לקומפיילר להסיק את השאר.

## ‏TypeScript 6.0 ו-7.0

‏Microsoft פרסמה את TypeScript ב-2012. ‏[גרסה 6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) (מרץ 2026) היא האחרונה שהקומפיילר שלה כתוב ב-TypeScript ורץ על Node.js. היא גם הפכה את `strict` לברירת מחדל.

גרסה 7.0 (יולי 2026) היא אותו קומפיילר אחרי העברה ל-Go. כללי הטיפוסים והשגיאות נשארו אותו דבר, וה-build מהיר בערך פי 10. עדיין אין לה API יציב לשימוש כספרייה (מתוכנן ל-7.1), ולכן כלים שבנויים על הקומפיילר נשארים בינתיים על 6.0. ‏Angular 22, למשל, [דורש](https://angular.dev/reference/versions) TypeScript 6.0. כל מה שבסדרה עובד בשתי הגרסאות.

### בגרסאות קודמות

עד 6.0, ‏`strict` היה כבוי כשלא הדליקו אותו ב-`tsconfig.json`. בלי `strict`, ‏`tsc` לא בודק למשל אם ערך יכול להיות `null`, ופרמטר בלי טיפוס מקבל בשקט `any` ולא נבדק בכלל. בהרבה פרויקטים ישנים זה עדיין המצב, ולכן TypeScript תופסת בהם פחות. הפוסט על `tsconfig.json` מפרט את ברירות המחדל.

## מתי TypeScript שווה את זה

- כשהקוד גדול, או שכמה אנשים עובדים עליו: הטיפוסים מתעדים מה כל פונקציה מקבלת ומחזירה.
- כששינוי שם של שדה צריך לעבור בעשרות קבצים: הקומפיילר מראה כל מקום שנשבר.
- בפריימוורקים כמו Angular, שבהם TypeScript היא ברירת המחדל.

בסקריפט של עשר שורות שרץ פעם אחת, שלב הבדיקה הוא בעיקר עוד שלב.

## טעויות נפוצות של מתחילים

- **לחשוב שהטיפוסים מגינים בזמן ריצה.** תגובת JSON מהשרת יכולה להיות כל דבר, גם אם כתבתם לה טיפוס.
- **להשתיק שגיאות עם `any`.** ‏`any` מכבה את הבדיקה לאותו ערך, וכל מה שנוגע בו מפסיק להיבדק.
- **להתעלם משגיאה כי "זה רץ".** הקוד רץ גם עם שגיאות, כמו ש-`total` החזירה `01020`. השגיאה היא הבאג.

## מה הלאה

בפוסט הבא: התקנה, הרצת `tsc`, והרצת קבצי `.ts` ישירות ב-Node.js.
