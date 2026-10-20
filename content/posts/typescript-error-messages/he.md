---
title: "איך קוראים שגיאות של tsc"
summary: "מה כל חלק בשגיאה של tsc אומר: קובץ, שורה ועמודה, קוד, הודעה ושורות ההסבר המוזחות. והקודים הנפוצים: TS2322, ‏TS2345, ‏TS2339, ‏TS7006, ‏TS18048, ‏TS2554 ו-TS2769."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 27 }
---

לכל שגיאה של `tsc` יש אותו מבנה. מי שיודע לפרק אותה מגיע לסיבה מהר יותר, גם כשההודעה ארוכה ומלאה בטיפוסים.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2.

## חלקי השגיאה

```typescript
// config.ts
type Config = { server: { host: string; port: number } };

const fromFile = { server: { host: "localhost", port: "8080" } };
const config: Config = fromFile;
```

```text
config.ts(5,7): error TS2322: Type '{ server: { host: string; port: string; }; }' is not assignable to type 'Config'.
  The types of 'server.port' are incompatible between these types.
    Type 'string' is not assignable to type 'number'.
```

משמאל לימין:

- `config.ts(5,7)`: הקובץ, השורה והעמודה. כאן זה `config` בשורה 5, המשתנה שקיבל ערך לא מתאים.
- `TS2322`: קוד השגיאה. אותו קוד תמיד מתאר את אותה בעיה, ולכן כדאי לחפש אותו ולא את ההודעה עם הטיפוסים שלכם.
- ההודעה: מה נכשל, בשורה אחת.
- השורות המוזחות: [כל שורה עונה על "למה?"](https://www.typescriptlang.org/docs/handbook/2/understanding-errors.html) לגבי השורה שמעליה. השורה העמוקה ביותר היא בדרך כלל הסיבה עצמה: `port` הוא מחרוזת ולא מספר.

בטרמינל `tsc` מדפיס כברירת מחדל פורמט צבעוני (האפשרות [`pretty`](https://www.typescriptlang.org/tsconfig/pretty.html)), עם השורה מהקוד וסימון מתחת למקום השגיאה:

```text
config.ts:5:7 - error TS2322: Type '{ server: { host: string; port: string; }; }' is not assignable to type 'Config'.
  The types of 'server.port' are incompatible between these types.
    Type 'string' is not assignable to type 'number'.

5 const config: Config = fromFile;
        ~~~~~~


Found 1 error in config.ts:5
```

כשהפלט לא הולך לטרמינל (למשל ל-pipe או לקובץ), או עם `--pretty false`, כל שגיאה מודפסת בפורמט הקצר שלמעלה.

## הקודים הנפוצים

```typescript
// common.ts
type User = { name: string; address?: { city: string } };

function greet(user: User) {
  return `Hi ${user.nmae}`;
}

function cityOf(user: User) {
  return user.address.city;
}

function log(message) {
  console.log(message);
}

const age: number = "30";
greet("Dana");
greet({ name: "Dana" }, true);
```

```text
common.ts(5,21): error TS2339: Property 'nmae' does not exist on type 'User'.
common.ts(9,10): error TS18048: 'user.address' is possibly 'undefined'.
common.ts(12,14): error TS7006: Parameter 'message' implicitly has an 'any' type.
common.ts(16,7): error TS2322: Type 'string' is not assignable to type 'number'.
common.ts(17,7): error TS2345: Argument of type 'string' is not assignable to parameter of type 'User'.
common.ts(18,25): error TS2554: Expected 1 arguments, but got 2.
```

| קוד | מה הוא אומר | מה בודקים קודם | הוסבר ב- |
|---|---|---|---|
| TS2322 | ערך לא מתאים לטיפוס של המשתנה | הטיפוס שהוצהר, והשורה העמוקה בהסבר | [טיפוסים בסיסיים](he/posts/typescript-basic-types/) |
| TS2345 | ארגומנט לא מתאים לפרמטר | החתימה של הפונקציה | [התקנה](he/posts/typescript-setup/) |
| TS2339 | אין מאפיין כזה בטיפוס | שגיאת כתיב, או union שצריך לצמצם | [unions](he/posts/typescript-unions-literals/) |
| TS7006 | פרמטר בלי טיפוס הפך ל-`any` | להוסיף טיפוס לפרמטר | [tsconfig](he/posts/typescript-tsconfig/) |
| TS18048 | הערך יכול להיות `undefined` | בדיקה לפני השימוש, או `?.` | [null ו-undefined](he/posts/typescript-null-undefined/) |
| TS2554 | מספר ארגומנטים שגוי | כמה פרמטרים הפונקציה מקבלת | [פונקציות](he/posts/typescript-functions/) |

## ‏TS2769 ו-TypeScript 7

כשלפונקציה יש כמה [חתימות (overloads)](he/posts/typescript-functions/) ואף אחת לא מתאימה, מקבלים TS2769. זו הטעות הקלאסית של מי שרוצה הזחה ב-JSON:

```typescript
// stringify.ts
const data = { id: 1, tags: ["a"] };
console.log(JSON.stringify(data, 2));
```

```text
stringify.ts(3,34): error TS2769: No overload matches this call.
  Overload 1 of 2, '(value: any, replacer?: ((this: any, key: string, value: any) => any) | undefined, space?: string | number | undefined): string', gave the following error.
    Argument of type 'number' is not assignable to parameter of type '(this: any, key: string, value: any) => any'.
  Overload 2 of 2, '(value: any, replacer?: (string | number)[] | null | undefined, space?: string | number | undefined): string', gave the following error.
    Argument of type 'number' is not assignable to parameter of type '(string | number)[]'.
{"id":1,"tags":["a"]}
```

‏TypeScript 6.0 מפרטת מה השתבש בכל חתימה. שתיהן אומרות שהארגומנט השני הוא `replacer`, ולכן `2` צריך לעבור למקום השלישי: `JSON.stringify(data, null, 2)`. ‏TypeScript 7.0.2 מדפיסה על אותו קוד רק את החתימה האחרונה:

```text
stringify.ts(3,34): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Argument of type 'number' is not assignable to parameter of type '(string | number)[]'.
```

כשהחתימה האחרונה לא זו שהתכוונתם אליה, פותחים את ההגדרה (F12 ב-VS Code) ובודקים את כל החתימות.

## טעויות נפוצות של מתחילים

- **לתקן במקום שבו השגיאה דווחה.** ‏`tsc` מסמן את המקום שבו הטיפוסים נפגשו, לא תמיד את המקום שבו נמצאת הטעות. ב-`config.ts` הטעות היא ב-`fromFile`.
- **להשתיק עם `any`.** ‏`const fromFile: any` מעלים את השגיאה, אבל `port` נשאר מחרוזת בזמן ריצה.
- **לקרוא רק את השורה הראשונה.** בשגיאה ארוכה הסיבה נמצאת בשורה המוזחת האחרונה.

## מה הלאה

בפוסט הבא: monorepo ב-TypeScript, עם project references ו-`tsc --build`.
