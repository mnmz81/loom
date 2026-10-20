---
title: "conditional types ב-TypeScript: ‏extends, ‏infer ופיזור על unions"
summary: "‏T extends U ? X : Y בוחר טיפוס לפי תנאי. איך תנאי מתפזר על כל חלק ב-union ואיך עוצרים את זה, ‏infer שמחלץ טיפוס מתוך טיפוס, ואיך ReturnType ו-Awaited בנויים."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 21 }
---

‏conditional type הוא אופרטור `? :` ברמת הטיפוסים: אם טיפוס אחד ניתן להשמה לשני, מקבלים טיפוס אחד, ואם לא, טיפוס אחר. רוב ה-[utility types](he/posts/typescript-utility-types/) בנויים כך, ו[המדריך הרשמי](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) מראה עוד דוגמאות.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24. כדי לראות איזה טיפוס התקבל, הדוגמאות משימות ערך שגוי, והשגיאה מציגה אותו.

## תנאי, ופיזור על union

```typescript
// is-string.ts
type IsString<T> = T extends string ? "match" : "no match";
type Whole<T> = [T] extends [string] ? "match" : "no match";

const one: IsString<"hi"> = "match";
const each: IsString<"hi" | 42> = "maybe";
const whole: Whole<"hi" | 42> = "maybe";
const none: IsString<never> = "no match";
```

```text
is-string.ts(6,7): error TS2322: Type '"maybe"' is not assignable to type '"match" | "no match"'.
is-string.ts(7,7): error TS2322: Type '"maybe"' is not assignable to type '"no match"'.
is-string.ts(8,7): error TS2322: Type '"no match"' is not assignable to type 'never'.
```

‏`T extends string` לא אומר "‏T שווה ל-string" אלא "‏T ניתן להשמה ל-string", ולכן `"hi"` עובר. כשהטיפוס שנבדק הוא פרמטר גנרי חשוף ומגיע אליו union, התנאי רץ על כל חלק בנפרד והתוצאות מתאחדות: `"hi"` נותן `"match"`, ‏`42` נותן `"no match"`. זה נקרא distributive conditional type.

כשעוטפים את שני הצדדים בסוגריים מרובעים, ‏`[T]` כבר לא פרמטר חשוף, וה-union נבדק כיחידה אחת: `"hi" | 42` לא ניתן להשמה ל-string, ולכן `"no match"`. ‏`never` הוא union ריק, ולכן פיזור עליו נותן `never` ולא `"no match"`.

## ‏infer: לחלץ טיפוס מתוך טיפוס

‏`infer` מכריז על משתנה טיפוס בתוך התבנית שאחרי `extends`. אם הטיפוס מתאים לתבנית, ‏TypeScript ממלאת את המשתנה, ואפשר להשתמש בו בענף ה-true.

```typescript
// unwrap.ts
type ElementOf<T> = T extends readonly (infer Item)[] ? Item : T;
type Unwrap<T> = T extends Promise<infer Value> ? Value : T;

const a: ElementOf<string[]> = 1;
const b: ElementOf<number> = "1";
const c: Unwrap<Promise<boolean>> = "true";
```

```text
unwrap.ts(5,7): error TS2322: Type 'number' is not assignable to type 'string'.
unwrap.ts(6,7): error TS2322: Type 'string' is not assignable to type 'number'.
unwrap.ts(7,7): error TS2322: Type 'string' is not assignable to type 'boolean'.
```

‏`string[]` מתאים לתבנית, ו-`Item` הוא `string`. ‏`number` לא מתאים, ולכן חוזר `T` עצמו. ‏`Unwrap` עושה אותו דבר ל-Promise.

## איך הטיפוסים המובנים בנויים

אלה ההגדרות מתוך `lib.es5.d.ts` של TypeScript 6.0, עם שם אחר כדי לא להתנגש בהגדרה המקורית:

```typescript
// built-ins.ts
type MyReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type MyExclude<T, U> = T extends U ? never : T;

function makeUser() {
  return { id: 1, label: "Dana" };
}

const user: MyReturnType<typeof makeUser> = { id: 2 };
const sendable: MyExclude<"draft" | "sent", "sent"> = "sent";
```

```text
built-ins.ts(9,7): error TS2741: Property 'label' is missing in type '{ id: number; }' but required in type '{ id: number; label: string; }'.
built-ins.ts(10,7): error TS2322: Type '"sent"' is not assignable to type '"draft"'.
```

‏`ReturnType` הוא `infer` על טיפוס הפונקציה. ‏`Exclude` נשען על הפיזור: כל חלק שניתן להשמה ל-`U` הופך ל-`never` ונעלם מה-union. ‏`Awaited` הוא conditional type רקורסיבי: הוא מחלץ את הערך מכל אובייקט עם `then` וקורא לעצמו שוב, ולכן `Awaited<Promise<Promise<number>>>` הוא `number`.

### בגרסאות קודמות

לפני [TypeScript 4.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-8.html), ‏`NonNullable<T>` הוגדר כ-`T extends null | undefined ? never : T`. מ-4.8 הוא `T & {}`: הצטלבות עם `{}` מוציאה את `null` ו-`undefined` באותה מידה, ו-TypeScript יודעת לפשט אותה גם כש-`T` גנרי.

## טעויות נפוצות של מתחילים

- **לקרוא `extends` כשוויון.** זו בדיקת השמה: `"hi"` עובר את `T extends string`, אף שהוא לא `string` עצמו.
- **פיזור שלא רציתם.** כשמקבלים union של תוצאות במקום תוצאה אחת, עוטפים: `[T] extends [U]`.
- **‏`ReturnType` על פונקציה עם overloads.** ‏`infer` לוקח את ה-signature האחרונה בלבד, לא את זו שמתאימה לקריאה מסוימת.

## מה הלאה

בפוסט הבא: mapped types ו-template literal types.
