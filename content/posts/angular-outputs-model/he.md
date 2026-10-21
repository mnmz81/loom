---
title: "outputs ו-model ב-Angular: אירועים מהילד וקישור דו-כיווני"
summary: "איך קומפוננטה מודיעה להורה עם output() ו-emit, איך הופכים Observable ל-output, ואיך model() ו-[(value)] נותנים קישור דו-כיווני. ומה היה לפני: @Output ו-EventEmitter."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 16 }
---

‏[Inputs](he/posts/angular-inputs/) מעבירים נתונים מההורה לילד. בכיוון ההפוך הילד שולח אירוע: לחיצה על כוכב בדירוג, חיפוש שהוקלד. ‏[`output()`](https://angular.dev/guide/components/outputs) מגדיר אירוע כזה, ו-`model()` מחבר את שני הכיוונים לערך אחד.

כל דוגמה נבדקה עם Angular 22.2.

## ‏output ו-emit

```typescript
import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-rating',
  template: `
    @for (star of stars; track star) {
      <button (click)="rate.emit(star)">{{ star }}</button>
    }
  `,
})
export class Rating {
  protected readonly stars = [1, 2, 3, 4, 5];
  readonly rate = output<number>();
}

@Component({
  selector: 'app-review',
  imports: [Rating],
  template: `
    <app-rating (rate)="score.set($event)" />
    <p>You rated {{ score() }}</p>
  `,
})
export class Review {
  protected readonly score = signal(0);
}
```

‏`output<number>()` מחזיר `OutputEmitterRef`, ו-`emit` שולח ערך. ההורה מאזין עם אותו תחביר של אירוע DOM, `(rate)`, והערך מגיע ב-`$event`. לחיצה על `4` מציגה `You rated 4`. בניגוד לאירועי DOM, אירוע של קומפוננטה לא מבעבע (bubbling) למעלה בעץ: רק ההורה הישיר שומע אותו. לפי התיעוד, שמות של outputs נכתבים ב-camelCase ובלי קידומת `on`.

## ‏Observable בתור output

```typescript
import { Component } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

@Component({
  selector: 'app-search-box',
  template: `<input #box (input)="query$.next(box.value)" />`,
})
export class SearchBox {
  protected readonly query$ = new Subject<string>();
  readonly search = outputFromObservable(this.query$.pipe(debounceTime(300)));
}
```

כשהאירוע כבר מגיע מ-Observable, ‏[`outputFromObservable`](https://angular.dev/ecosystem/rxjs-interop/output-interop) הופך אותו ל-output. כאן `debounceTime` מחכה 300ms בלי הקלדה, ולכן הקלדה מהירה של `a`, ‏`an` ו-`ang` שלחה להורה `(search)` אחד, עם `ang`. ‏Angular מפסיק להעביר ערכים כשהקומפוננטה נהרסת. אם אפשר לקרוא ל-`emit` ישירות, התיעוד ממליץ על `output()`.

## ‏model: קישור דו-כיווני

```typescript
import { Component, model, signal } from '@angular/core';

@Component({
  selector: 'app-quantity',
  template: `
    <button (click)="value.update((v) => v - 1)">-</button>
    <span>{{ value() }}</span>
    <button (click)="value.update((v) => v + 1)">+</button>
  `,
})
export class Quantity {
  readonly value = model(1);
}

@Component({
  selector: 'app-order',
  imports: [Quantity],
  template: `
    <app-quantity [(value)]="quantity" />
    <p>Ordering {{ quantity() }}</p>
  `,
})
export class Order {
  protected readonly quantity = signal(2);
}
```

‏[`model()`](https://angular.dev/guide/components/inputs#model-inputs) הוא input שהקומפוננטה יכולה לכתוב אליו. ‏`[(value)]` (התחביר שנקרא "banana in a box") מעביר לו את ה-signal `quantity` עצמו, בלי סוגריים, ומעדכן אותו כשהילד כותב. הילד מתחיל ב-`2` מההורה, ולחיצה על `+` מציגה אצל ההורה `Ordering 3`. אפשר לקשור גם שדה רגיל, לא רק signal.

לכל model ‏Angular יוצר output בשם `valueChange` (שם ה-model ועוד `Change`), שנשלח בכל `set` או `update`. בבדיקה, `<app-quantity [value]="5" (valueChange)="log.push($event)" />` ולחיצה על `-` הוסיפו ל-`log` את `4`. ל-model אפשר להוסיף `required` ו-`alias` כמו ל-input, אבל לא transform. לפי התיעוד, model מתאים לקומפוננטה שכל תפקידה לשנות ערך, כמו date picker או combobox.

### בגרסאות קודמות

‏`model()` נוסף בגרסה 17.2, ‏`output()` בגרסה 17.3, ושניהם הוכרזו כיציבים בגרסה 19 ([changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md)). לפני כן outputs הוגדרו עם [`@Output()`](https://angular.dev/guide/components/outputs#declaring-outputs-with-the-output-decorator) ו-`EventEmitter`, וקישור דו-כיווני היה צמד של input ו-output עם שם תואם:

```typescript
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-quantity-old',
  template: `
    <button (click)="change(-1)">-</button>
    <span>{{ value }}</span>
    <button (click)="change(1)">+</button>
  `,
})
export class QuantityComponent {
  @Input() value = 1;
  @Output() valueChange = new EventEmitter<number>();

  change(delta: number) {
    this.value += delta;
    this.valueChange.emit(this.value);
  }
}
```

המוסכמה `xChange` היא מה שגרם ל-`[(value)]` לעבוד: ‏Angular מתרגם אותו ל-`[value]` ול-`(valueChange)`. הקוד הזה עדיין עובד, וה-migration ‏`output-migration` ממיר את `@Output()` ל-`output()`. ‏`[(ngModel)]` על `<input>` הוא אותו תחביר עם הדירקטיבה `NgModel` מ-`FormsModule`, ויופיע בפוסטים על טפסים.

## טעויות נפוצות של מתחילים

- **לכתוב `[(value)]="quantity()"`.** ה-build נכשל עם `NG5002: Unsupported expression in a two-way binding`. קישור דו-כיווני צריך את ה-signal עצמו, `quantity`, כדי לכתוב אליו.
- **לקרוא ל-output בשם של אירוע DOM.** ‏output בשם `click` מבלבל: לא ברור אם המאזין שומע את הקומפוננטה או את האלמנט.
- **להשתמש ב-model כשהילד רק מודיע.** אם ההורה לא צריך להעביר ערך פנימה, `output()` מספיק.

## מה הלאה

בפוסט הבא: ‏`viewChild`, ‏`contentChild` ושאר ה-queries, שמחזירים הפניה לקומפוננטות ולאלמנטים בתוך התבנית.
