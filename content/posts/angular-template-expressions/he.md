---
title: "ביטויים בתבניות: מה מותר, ‏@let ו-?."
summary: "מה מותר לכתוב בתוך {{ }} וב-bindings: אופרטורים, arrow functions ו-spread, ‏@let, ‏pipes ו-?. שהשתנה ב-22. ומה אסור: Math, ‏new, השמה והצהרות."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 7 }
---

ביטוי בתבנית (בתוך `{{ }}` או בערך של binding) נראה כמו JavaScript, אבל הוא [תת-קבוצה שלו](https://angular.dev/guide/templates/expression-syntax) עם כמה תוספות. הקומפוננטה הבאה משתמשת ברוב מה שמותר:

```typescript
// exprs.ts
import { Component, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

type Product = { name: string; price: number; stock: number };

@Component({
  selector: 'app-exprs',
  imports: [CurrencyPipe],
  template: `
    @let active = products().filter((p) => p.stock > 0);
    @let total = active.reduce((sum, p) => sum + p.price, 0);

    <p>{{ active.length }} of {{ products().length }} in stock</p>
    <p [attr.title]="active.length + ' products'" [class]="{ ...base, sale: total > 20 }">
      Total: {{ total | currency }} ({{ total > 20 ? 'high' : 'low' }})
    </p>
    <p>{{ user()?.name ?? 'Guest' }}</p>
    <p>{{ user()?.name === undefined }}</p>
  `,
})
export class Exprs {
  protected readonly base = { card: true };
  protected readonly user = signal<{ name: string } | null>(null);
  protected readonly products = signal<Product[]>([
    { name: 'Pen', price: 4.5, stock: 10 },
    { name: 'Book', price: 18, stock: 0 },
    { name: 'Lamp', price: 25, stock: 2 },
  ]);
}
```

כל דוגמה נבדקה עם Angular 22.2. הבדיקה קוראת את ארבע השורות: `2 of 3 in stock`, ‏`Total: $29.50 (high)`, ‏`Guest` ו-`true`.

## מה מותר

- **ליטרלים**: מחרוזות, מספרים, `true`/`false`, ‏`null`, אובייקטים, מערכים, ‏RegExp ו-template strings. ‏BigInt לא נתמך.
- **אופרטורים**: חשבון (כולל `**`), השוואות, `&&`, ‏`||`, ‏`!`, ‏`?:`, ‏`??`, ‏`typeof`, ‏`in`, ‏`instanceof`, ‏`void`, וגישה לשדה עם `person['name']`.
- **‏arrow functions עם גוף של ביטוי**: ‏`products().filter((p) => p.stock > 0)` ו-`reduce` למעלה.
- **‏spread**: ‏`{ ...base, sale: total > 20 }` מאחד אובייקטים (גם `[...arr]` ו-`fn(...args)`).
- **משתנים מקומיים** שמתחילים ב-`$`, כמו `$index` ב-[`@for`](he/posts/angular-control-flow/).

ה-arrow functions וה-spread מופיעים במדריך הנוכחי ועברו קומפילציה ב-22.2. לא בדקתי באיזו גרסה נוספו.

כל ביטוי רץ בהקשר של מחלקת הקומפוננטה, ולכן `products()` הוא `this.products()`. משתנה תבנית או `@let` עם אותו שם מסתיר שדה של המחלקה, וכותבים `this.` כדי להגיע אליו.

## ‏@let

‏`@let active = ...;` מצהיר על משתנה מקומי בתבנית: ביטוי ארוך מחושב ונקרא בשם. ה-[`@let`](https://angular.dev/guide/templates/variables) מתעדכן אוטומטית כשהביטוי משתנה, אבל אי אפשר לשנות אותו (`value = value + 1` לא חוקי), ואפשר להצהיר רק על אחד בכל בלוק. הוא נראה בתבנית שהצהירה עליו ובבלוקים שבתוכה, אבל לא מחוץ לבלוק שבו הוגדר, כמו `@if`.

## ‏pipes בביטוי

‏`total | currency` מעביר את הערך דרך [pipe](he/posts/angular-pipes/) ומחזיר את התוצאה. ה-pipe צריך להיות ב-`imports` של הקומפוננטה. קדימות ה-`|` [נמוכה](https://angular.dev/guide/templates/pipes) מזו של `+`, ‏`&&` ו-`??`, וגבוהה מזו של `?:`:

- ‏`'a' + 'b' | uppercase` נותן `AB`, כי ה-pipe חל על הסכום. כדי להפעיל אותו על חלק מהביטוי מוסיפים סוגריים: `(total | currency) + '!'` נותן `$29.50!`.
- ‏`total > 20 ? 'high' : 'low' | uppercase` נותן `high`, כי ה-pipe חל רק על `'low'`. עם סוגריים, `(total > 20 ? 'high' : 'low') | uppercase`, מתקבל `HIGH`.

בתוך arrow function אי אפשר להשתמש ב-pipe, אבל אפשר להעביר arrow function כארגומנט ל-pipe.

## ‏?. ו-??

‏`user()?.name` מחזיר `undefined` כש-`user()` הוא `null` או `undefined`, ובמקום שגיאה על `null.name` מתקבל `undefined`. יחד עם `??` נוצר ערך ברירת מחדל: `user()?.name ?? 'Guest'`. הביטוי `user()?.name === undefined` מחזיר `true`, וזו ההתנהגות של JavaScript. מ-Angular 22 `?.` בתבניות [מתנהג כמו ב-JavaScript](https://angular.dev/guide/templates/expression-syntax) (בגרסאות קודמות הוא החזיר `null`).

## מה אסור

```text
{{ Math.round(total) }}  TS2339: Property 'Math' does not exist on type 'Exprs'.
{{ total = 5 }}          NG5002: Parser Error: Bindings cannot contain assignments
{{ new Date() }}         NG5002: Parser Error: Unexpected token 'Date'
```

- **גלובלים**: רק `undefined` ו-`$any` זמינים. ‏`Math`, ‏`Date`, ‏`parseInt`, ‏`NaN` וחבריהם לא קיימים בתבנית. הפתרון הוא מתודה או `computed` במחלקה (נלמד ברמה 2).
- **השמה ו-`++`**: מותרות רק בתוך הצהרות של אירועים (`(click)="count = count + 1"`), לא ב-bindings וב-`{{ }}`.
- **‏`new`, הצהרות וביטויים מורכבים**: ‏`let`, ‏`const`, פונקציות, מחלקות, arrow functions עם גוף של בלוק, destructuring, אופרטור פסיק ואופרטורים של ביטים. לא נתמכים.

הכלל המעשי: כשביטוי ארוך יותר משורה, מעבירים אותו למחלקה. תבנית שקל לקרוא טובה יותר מביטוי חכם.

### בגרסאות קודמות

לפני Angular 22, האופרטור `?.` בתבנית החזיר `null` ולא `undefined`. בשדרוג ל-22, [`ng update`](https://angular.dev/guide/templates/expression-syntax) עוטף ביטויים כאלה ב-`$safeNavigationMigration` כדי לשמר את ההתנהגות הישנה:

```html
<p>{{ $safeNavigationMigration(user()?.name) === null }}</p>
```

בדקתי: ב-22.2 זה עובר קומפילציה ומחזיר `true` כש-`user()` הוא `null`. התיעוד מגדיר את הפונקציה כעזר זמני לשדרוג שעשוי להיעלם, ולכן עדיף לכתוב ביטויים שלא תלויים בהבדל בין `null` ל-`undefined`. בקוד ישן סינון כזה נעשה בדרך כלל במתודה במחלקה, ב-pipe או ב-`computed`.

## טעויות נפוצות של מתחילים

- **לקרוא ל-`Math` או ל-`Date` מהתבנית.** הם לא זמינים. מחשבים במחלקה ומציגים את התוצאה.
- **לשכוח סוגריים סביב `?:` לפני pipe.** ‏`cond ? 'a' : 'b' | uppercase` מפעיל את ה-pipe רק על `'b'`.
- **להעמיס לוגיקה בתבנית.** ביטוי שמסנן, ממיין וממפה בשלוש שורות שייך ל-`computed`.

## מה הלאה

בפוסט הבא: `<ng-template>`, ‏`ngTemplateOutlet` ו-`<ng-container>`, כלים לתבניות שאפשר להעביר ולהציג בכמה מקומות.
