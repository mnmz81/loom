---
title: "inputs ב-Angular: ‏input(), ‏input.required ו-transform"
summary: "איך קומפוננטה מקבלת נתונים מההורה עם input(): ברירת מחדל, ‏input.required שנבדק ב-build, ‏alias, ‏transform עם booleanAttribute, ולמה אי אפשר לכתוב ל-input."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 15 }
---

קומפוננטה מקבלת נתונים מההורה שלה דרך [inputs](https://angular.dev/guide/components/inputs), בדומה ל-props בפריימוורקים אחרים. ב-Angular 22 מגדירים input עם הפונקציה `input()`, שמחזירה signal לקריאה בלבד. את התחביר `[amount]="..."` בצד ההורה הכרנו ב[פוסט על bindings](he/posts/angular-bindings/).

כל דוגמה נבדקה עם Angular 22.2.

## ‏input ו-input.required

```typescript
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-price',
  template: `<span>{{ label() }}</span>`,
})
export class Price {
  readonly amount = input.required<number>();
  readonly currency = input('ILS');
  protected readonly label = computed(() => `${this.amount().toFixed(2)} ${this.currency()}`);
}

@Component({
  selector: 'app-product',
  imports: [Price],
  template: `
    <app-price [amount]="49.9" />
    <app-price [amount]="10" currency="USD" />
  `,
})
export class Product {}
```

‏`input('ILS')` הוא input אופציונלי עם ברירת מחדל, ו-TypeScript מסיק ממנה את הטיפוס (`InputSignal<string>`). ‏`input.required<number>()` חייב להגיע מההורה. בגלל ש-input הוא signal, קוראים אותו עם `()` וגוזרים ממנו `computed`: כש-`amount` מתחלף, גם `label` מתעדכן. על המסך מופיעים `49.90 ILS` ו-`10.00 USD`. ‏`currency="USD"` בלי סוגריים מרובעים מעביר מחרוזת קבועה.

החובה נבדקת ב-build. כך נראה `<app-price />` בלי `amount`:

```text
✘ [ERROR] NG8008: Required input 'amount' from component Price must be specified.
```

‏input אופציונלי בלי ברירת מחדל, `input<number>()`, הוא מטיפוס `number | undefined`. לטיפוס של `input.required` לא נוסף `undefined`.

‏[alias](https://angular.dev/guide/components/inputs#input-aliases) משנה את השם בתבנית בלי לשנות אותו בקוד, למשל `input(0, { alias: 'sliderValue' })`. התיעוד ממליץ להימנע ממנו, חוץ משינוי שם ששומר על השם הישן או מהתנגשות עם property של אלמנט DOM.

## ‏transform: לקבל מחרוזת, להחזיק בוליאני

```typescript
import { Component, booleanAttribute, input, numberAttribute } from '@angular/core';

@Component({
  selector: 'app-badge',
  template: `<span [class.muted]="disabled()">{{ count() + 1 }}</span>`,
})
export class Badge {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly count = input(0, { transform: numberAttribute });
}

@Component({
  selector: 'app-inbox',
  imports: [Badge],
  template: `<app-badge disabled count="3" />`,
})
export class Inbox {}
```

ב-HTML כל attribute הוא מחרוזת. ‏`transform` ממיר את הערך לפני שהוא נשמר. ‏[`booleanAttribute`](https://angular.dev/guide/components/inputs#built-in-transformations) הופך `disabled` בלי ערך ל-`true`, כמו attribute בוליאני של HTML, ואת המחרוזת `"false"` ל-`false`. ‏`numberAttribute` הופך את `"3"` למספר, ולכן `count() + 1` מציג `4` ולא `31`. הטיפוס של הפרמטר בפונקציית ה-transform קובע מה מותר להעביר בתבנית, והפונקציה צריכה להיות טהורה.

## אי אפשר לכתוב ל-input

```typescript
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-discount',
  template: `<button (click)="clear()">Clear</button> {{ percent() }}%`,
})
export class Discount {
  readonly percent = input(0);

  protected clear() {
    this.percent.set(0);
  }
}
```

```text
✘ [ERROR] TS2339: Property 'set' does not exist on type 'InputSignal<number>'.
```

הערך של input שייך להורה, ו-`InputSignal` הוא [לקריאה בלבד](https://angular.dev/guide/components/inputs#reading-inputs). כשצריך עותק מקומי שאפשר לשנות, יש שתי דרכים: ‏[`linkedSignal`](he/posts/angular-linked-signal/) שמקורו ב-input ומתאפס כשה-input מתחלף, או `model()`, שמחזיר את השינוי להורה ומופיע בפוסט הבא.

### בגרסאות קודמות

‏`input()` נוסף בגרסה 17.1 והוכרז כיציב בגרסה 19 ([changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md)). לפניו inputs הוגדרו עם הדקורטור [`@Input()`](https://angular.dev/guide/components/inputs#declaring-inputs-with-the-input-decorator) (על דקורטורים: [בסדרת TypeScript](he/posts/typescript-decorators/)), וערך נגזר חושב ב-`ngOnChanges`:

```typescript
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-price-old',
  template: `<span>{{ label }}</span>`,
})
export class PriceComponent implements OnChanges {
  @Input({ required: true }) amount!: number;
  @Input() currency = 'ILS';
  label = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['amount'] || changes['currency']) {
      this.label = `${this.amount.toFixed(2)} ${this.currency}`;
    }
  }
}
```

‏`ngOnChanges` רץ בכל פעם ש-input מתחלף, ומקבל `SimpleChanges` עם הערך הקודם והנוכחי. דרך נפוצה אחרת הייתה setter על ה-input, שמריץ קוד בכל השמה. ה-`!` אומר ל-TypeScript שהערך יגיע מבחוץ. ‏`@Input()` עדיין נתמך במלואו, וה-migration ‏`signal-input-migration` של `@angular/core` ממיר אותו ל-`input()` (בפוסט על [מעבר ל-signals](he/posts/angular-migrate-signals/)).

## טעויות נפוצות של מתחילים

- **לקרוא input בלי סוגריים.** ‏`amount` הוא signal, הערך הוא `amount()`.
- **לגזור ערך ב-`ngOnInit` במקום ב-`computed`.** קוד ב-`ngOnInit` רץ פעם אחת, ולא יתעדכן כשההורה יעביר ערך חדש.
- **להעביר מספר או בוליאני בלי סוגריים מרובעים.** ‏`count="3"` מעביר מחרוזת. בלי `numberAttribute` זו שגיאת טיפוס, ולכן כותבים `[count]="3"` או מוסיפים transform.

## מה הלאה

בפוסט הבא הכיוון ההפוך: ‏`output()` לאירועים מהילד להורה, ו-`model()` לקישור דו-כיווני.
