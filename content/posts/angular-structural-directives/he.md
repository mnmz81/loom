---
title: "structural directives ב-Angular: ‏TemplateRef, ‏ViewContainerRef ו-hostDirectives"
summary: "איך כותבים structural directive שיוצר views מ-ng-template, מה הכוכבית * מתרגמת אליו, איך ngTemplateContextGuard נותן טיפוסים למשתני התבנית, ואיך מרכיבים directives עם hostDirectives."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 52 }
---

‏structural directive מחליט אם ובכמה עותקים להציג חלק מהתבנית. ל-`@if`, ל-`@for` ול-`@switch` [התיעוד](https://angular.dev/guide/directives/structural-directives) ממליץ להשתמש בבלוקים המובנים ([control flow](he/posts/angular-control-flow/)); ‏directive משלכם שווה לכתוב כשיש התנהגות רינדור שחוזרת על עצמה והבלוקים לא מכסים אותה.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ‏TemplateRef ו-ViewContainerRef

‏directive שמציג את התוכן שלו מספר פעמים:

```typescript
import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';

interface RepeatContext {
  $implicit: number;
  count: number;
}

@Directive({ selector: '[appRepeat]' })
export class Repeat {
  private readonly template = inject<TemplateRef<RepeatContext>>(TemplateRef);
  private readonly container = inject(ViewContainerRef);
  readonly appRepeat = input.required<number>();

  constructor() {
    effect(() => {
      const count = this.appRepeat();
      this.container.clear();
      for (let i = 1; i <= count; i++) {
        this.container.createEmbeddedView(this.template, { $implicit: i, count });
      }
    });
  }

  static ngTemplateContextGuard(dir: Repeat, ctx: unknown): ctx is RepeatContext {
    return true;
  }
}
```

- ‏`TemplateRef` הוא ה-[`<ng-template>`](he/posts/angular-ng-template/) שה-directive יושב עליו: תוכן שעוד לא מוצג.
- ‏`ViewContainerRef` הוא המקום בדף שאליו מכניסים views. ‏`createEmbeddedView` יוצר עותק של התבנית עם אובייקט context, ו-`clear` מוחק את כל העותקים.
- ה-[`effect`](he/posts/angular-effect/) רץ שוב בכל פעם ש-`appRepeat` משתנה, כך שהרשימה נבנית מחדש.

## הכוכבית והמיקרו-תחביר

```typescript
import { Component, signal } from '@angular/core';
import { Repeat } from './repeat';

@Component({
  selector: 'app-stars',
  imports: [Repeat],
  template: `
    <button (click)="rating.set(rating() + 1)">+1</button>
    <span *appRepeat="rating(); let n; let total = count">★{{ n }}/{{ total }} </span>
  `,
})
export class Stars {
  protected readonly rating = signal(2);
}
```

בהתחלה מוצג `★1/2 ★2/2`, ואחרי לחיצה `★1/3 ★2/3 ★3/3`. הכוכבית אומרת ל-Angular לעטוף את האלמנט ב-`<ng-template>` ולהעביר אליו את ה-directive. השורה שקולה ל:

```html
<ng-template [appRepeat]="rating()" let-n let-total="count">
  <span>★{{ n }}/{{ total }} </span>
</ng-template>
```

- הביטוי הראשון הולך ל-input ששמו כשם ה-selector.
- ‏`let n` בלי `=` מקבל את `$implicit` מה-context, ו-`let total = count` מקבל את `count`.
- מפתח נוסף, למשל `; label: x`, הולך ל-input בשם `appRepeatLabel`: שם ה-selector ואחריו המפתח באות גדולה. כך `*ngFor="let x of items"` מעביר את `items` ל-`ngForOf`.

אפשר לשים רק כוכבית אחת על אלמנט. לשניים עוטפים ב-`<ng-container>`.

## טיפוסים ל-context עם ngTemplateContextGuard

הפונקציה הסטטית `ngTemplateContextGuard` שבסוף `Repeat` לא רצה אף פעם. היא רק אומרת לבודק הטיפוסים של התבניות מה יש ב-context. בלעדיה `n` מקבל `any`, ו-`{{ n.toUpperCase() }}` עובר build בשקט. איתה ה-build נכשל:

```text
✘ [ERROR] TS2339: Property 'toUpperCase' does not exist on type 'number'. [plugin angular-compiler]
```

‏directive גנרי יכול להעביר את הטיפוס הלאה, כמו בדוגמה `SelectDirective<T>` בתיעוד.

## הרכבה עם hostDirectives

‏[`hostDirectives`](https://angular.dev/guide/directives/directive-composition-api) מצמיד directives קיימים לאלמנט המארח של קומפוננטה, בלי שהמשתמש יכתוב אותם בתבנית. כאן `Highlight` מ[הפוסט הקודם](he/posts/angular-attribute-directives/):

```typescript
import { Component } from '@angular/core';
import { Highlight } from './highlight';

@Component({
  selector: 'app-card',
  hostDirectives: [{ directive: Highlight, inputs: ['appHighlight: color'] }],
  template: `<ng-content />`,
})
export class Card {}
```

עכשיו `<app-card color="pink">` נצבע בוורוד במעבר עכבר. ה-inputs וה-outputs של host directive פרטיים כברירת מחדל: רק מה שמופיע ב-`inputs` או ב-`outputs` נחשף, ו-`appHighlight: color` גם נותן לו שם חדש. ‏host directives מוצמדים בזמן קומפילציה, ולא בזמן ריצה, וה-selector שלהם לא משנה.

### בגרסאות קודמות

אותו directive בסגנון הישן, עם הזרקה בקונסטרקטור ו-setter על `@Input()` במקום `effect`:

```typescript
import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({ selector: '[appRepeatOld]' })
export class RepeatDirective {
  constructor(
    private template: TemplateRef<any>,
    private container: ViewContainerRef,
  ) {}

  @Input() set appRepeatOld(count: number) {
    this.container.clear();
    for (let i = 1; i <= count; i++) {
      this.container.createEmbeddedView(this.template, { $implicit: i, count });
    }
  }
}
```

גם `*ngIf` ו-`*ngFor` הם structural directives כאלה. הם עדיין עובדים, אבל `*ngIf` מסומן כ-deprecated מגרסה 20, ובקוד חדש כותבים `@if` ו-`@for`.

## טעויות נפוצות של מתחילים

- **לשכוח `clear()`.** כל ריצה של ה-effect מוסיפה עותקים על הקודמים במקום להחליף אותם.
- **שתי כוכביות על אותו אלמנט.** ה-build נכשל:

```text
✘ [ERROR] NG5002: Can't have multiple template bindings on one element. Use only one attribute prefixed with * [plugin angular-compiler]
```

- **לכתוב structural directive במקום `@if`.** תנאי פשוט לא צריך directive.

## מה הלאה

בפוסט הבא: קומפוננטות דינמיות, שנבחרות בזמן ריצה עם `NgComponentOutlet` ו-`ViewContainerRef.createComponent`.
