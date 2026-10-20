---
title: "decorators ב-TypeScript: הגרסה הסטנדרטית מול experimentalDecorators"
summary: "מה זה decorator, איך כותבים decorator סטנדרטי למתודה ולמחלקה, למה Node לא מריץ אותם בלי tsx, ומה ההבדל מ-experimentalDecorators שפרויקט Angular חדש עדיין מדליק."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 15 }
---

decorator הוא פונקציה שמקבלת מחלקה או איבר של מחלקה, ויכולה להחזיר משהו שיחליף אותו. כותבים אותו עם `@` לפני ההגדרה. מי שעבד עם Angular מכיר אותם מכל קובץ: ‏`@Component`, ‏`@Injectable`.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24 עם tsx.

## ‏decorator למתודה ולמחלקה

```typescript
// logged.ts (run with tsx)
function logged(method: (...args: number[]) => number, context: ClassMethodDecoratorContext) {
  return function (this: unknown, ...args: number[]) {
    console.log(`${String(context.name)}(${args.join(", ")})`);
    return method.apply(this, args);
  };
}

const registry: string[] = [];

function register(target: Function, context: ClassDecoratorContext) {
  registry.push(String(context.name));
}

@register
class Calculator {
  @logged
  add(a: number, b: number) {
    return a + b;
  }
}

console.log(registry);
console.log(new Calculator().add(2, 3));
```

```text
[ 'Calculator' ]
add(2, 3)
5
```

[decorator סטנדרטי](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#decorators) מקבל שני פרמטרים: הדבר שעליו הוא כתוב (המתודה או המחלקה) ואובייקט `context` עם פרטים עליו, כמו `context.name`.

- ‏`logged` מחזיר פונקציה חדשה, והיא מחליפה את `add`: מדפיסה את הקריאה ואז קוראת למתודה המקורית.
- ‏`register` לא מחזיר כלום, ולכן המחלקה נשארת כמו שהיא. הוא רץ כשהמחלקה מוגדרת, עוד לפני שנוצר ממנה מופע, ולכן `registry` כבר מלא בשורה הראשונה של הפלט.

## ‏Node לא מריץ decorators

```bash
node logged.ts
```

```text
SyntaxError: Invalid or unexpected token
```

decorators הם [הצעה בשלב 3 של TC39](https://github.com/tc39/proposal-decorators), ו-JavaScript עדיין לא תומכת בהם. לפי [התיעוד של Node](https://nodejs.org/api/typescript.html), ‏type stripping לא ממיר אותם, והתוצאה היא שגיאת parsing. ‏`erasableSyntaxOnly` לא מדווחת עליהם, ולכן השגיאה מגיעה רק בהרצה. ‏tsx ממיר אותם ל-JavaScript רגיל.

## ‏experimentalDecorators

לפני TypeScript 5.0 היו רק decorators "ניסיוניים", שמבוססים על גרסה ישנה הרבה יותר של ההצעה ודורשים את האפשרות `experimentalDecorators`. החתימה שלהם שונה: ‏`(target, propertyKey, descriptor)` במקום `(value, context)`. אותו קובץ עם האפשרות דלוקה:

```bash
npx tsc --noEmit --experimentalDecorators logged.ts
```

```text
logged.ts(15,1): error TS1238: Unable to resolve signature of class decorator when called as an expression.
  The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.
logged.ts(17,4): error TS1241: Unable to resolve signature of method decorator when called as an expression.
  Argument of type 'Calculator' is not assignable to parameter of type '(...args: number[]) => number'.
    Type 'Calculator' provides no match for the signature '(...args: number[]): number'.
logged.ts(17,4): error TS1270: Decorator function return type '(this: unknown, ...args: number[]) => number' is not assignable to type 'void | TypedPropertyDescriptor<(a: number, b: number) => number>'.
```

האפשרות מעבירה את כל ה-decorators בפרויקט לגרסה הישנה, ולכן decorator שנכתב לגרסה אחת בדרך כלל לא עובד בשנייה. יש דברים שרק הגרסה הישנה יודעת לעשות: decorators על פרמטרים ו-`emitDecoratorMetadata`. הודעת השחרור של 5.0 אומרת ש-`experimentalDecorators` תמשיך להתקיים "בעתיד הנראה לעין".

## ‏Angular

התבנית של `ng new` ב-Angular 22 עדיין כותבת `"experimentalDecorators": true` ב-`tsconfig.json` ([בקוד של Angular CLI](https://github.com/angular/angular-cli/blob/main/packages/schematics/angular/workspace/files/tsconfig.json.template)), וכך גם בפרויקט Angular 22 של הבלוג הזה. את `@Component` ו-`@Injectable` קורא [הקומפיילר של Angular](https://angular.dev/tools/cli/aot-compiler) בזמן ה-build, ומייצר מהמידע שבהם את הקוד שרץ. מכאן שבפרויקט Angular, ‏decorator שכותבים בעצמכם צריך להתאים לחתימה הישנה.

### בגרסאות קודמות

לצד `experimentalDecorators` יש את [`emitDecoratorMetadata`](https://www.typescriptlang.org/tsconfig/#emitDecoratorMetadata): איתה ‏`tsc` כותב לקוד את הטיפוסים של הפרמטרים כמטא-דאטה בזמן ריצה, ש-`reflect-metadata` קורא. ‏decorators סטנדרטיים לא תומכים בזה.

## טעויות נפוצות של מתחילים

- **להעתיק decorator מדוגמה בלי לבדוק את `experimentalDecorators`.** החתימות שונות, ו-`tsc` מדווח על שגיאות כמו TS1241.
- **לחשוב ש-decorator רץ בכל קריאה.** הוא רץ פעם אחת, כשהמחלקה מוגדרת. רק מה שהוא מחזיר רץ בכל קריאה.
- **להריץ קוד עם decorators ב-`node` ישירות.** זו שגיאת תחביר. מריצים עם tsx או מקמפלים קודם.

## מה הלאה

בפוסט הבא: ‏`as`, ‏`satisfies`, ‏type guards ו-assertion functions.
