---
title: "קומפוננטות דינמיות ב-Angular: ‏NgComponentOutlet ו-createComponent"
summary: "איך מציגים קומפוננטה שנבחרת בזמן ריצה: ‏NgComponentOutlet עם inputs, ‏ViewContainerRef.createComponent עם inputBinding ו-outputBinding, טעינה עצלה עם import(), ומה קרה ל-ComponentFactoryResolver."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 53 }
---

בדרך כלל התבנית יודעת מראש איזו קומפוננטה להציג. לפעמים ההחלטה מגיעה רק בזמן ריצה: סוג כרטיס לפי נתון מהשרת, התראות שנוספות בלחיצה, או רכיב כבד שנטען רק כשצריך. ‏[התיעוד](https://angular.dev/guide/components/programmatic-rendering) מציע לזה שתי דרכים: ‏`NgComponentOutlet` בתבנית ו-`ViewContainerRef` בקוד.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ‏NgComponentOutlet

שתי קומפוננטות עם אותו input, ש-`Dashboard` בוחר ביניהן:

```typescript
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-info-card',
  template: `<p>Info: {{ text() }}</p>`,
})
export class InfoCard {
  readonly text = input('');
}

@Component({
  selector: 'app-alert-card',
  template: `<p role="alert">Alert: {{ text() }} <button (click)="closed.emit()">×</button></p>`,
})
export class AlertCard {
  readonly text = input('');
  readonly closed = output();
}
```

```typescript
import { Component, computed, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { AlertCard, InfoCard } from './widgets';

@Component({
  selector: 'app-dashboard',
  imports: [NgComponentOutlet],
  template: `
    <button (click)="urgent.set(!urgent())">Toggle</button>
    <ng-container *ngComponentOutlet="card(); inputs: { text: message() }" />
  `,
})
export class Dashboard {
  protected readonly urgent = signal(false);
  protected readonly message = signal('Disk 80% full');
  protected readonly card = computed(() => (this.urgent() ? AlertCard : InfoCard));
}
```

‏`*ngComponentOutlet` מקבל מחלקת קומפוננטה ומרנדר אותה. בהתחלה מוצג `Info: Disk 80% full`, ואחרי לחיצה `Alert: Disk 80% full`. ‏`inputs` הוא אובייקט של שמות inputs וערכים, והוא מתעדכן כש-`message` משתנה. יש לו גם `injector` להחלפת providers ו-`content` להעברת תוכן ל-`<ng-content>`. את ה-outputs הוא לא מחבר; בשבילם יש את הדרך הבאה.

## ‏createComponent עם bindings

```typescript
import { Component, ComponentRef, ViewContainerRef, inputBinding, outputBinding, signal, viewChild } from '@angular/core';
import { AlertCard } from './widgets';

@Component({
  selector: 'app-notifications',
  template: `
    <button (click)="add()">Add</button>
    <ng-container #slot />
  `,
})
export class Notifications {
  private readonly slot = viewChild.required('slot', { read: ViewContainerRef });
  private count = 0;

  add() {
    const text = signal(`Notification ${++this.count}`);
    const ref: ComponentRef<AlertCard> = this.slot().createComponent(AlertCard, {
      bindings: [
        inputBinding('text', text),
        outputBinding('closed', () => ref.destroy()),
      ],
    });
  }
}
```

- ‏[`viewChild`](he/posts/angular-queries/) עם `read: ViewContainerRef` מחזיר את המקום שבו `#slot` נמצא. כל לחיצה מוסיפה שם `AlertCard` חדש.
- ‏[`inputBinding`](https://angular.dev/api/core/inputBinding) מחבר input ל-signal או לפונקציה, ו-input מתעדכן כשה-signal משתנה. ‏`outputBinding` נרשם ל-output, וכאן הלחיצה על `×` מוחקת את הקומפוננטה. יש גם `twoWayBinding` ל-`model()`.
- ‏`ref.destroy()` מסיר את הקומפוננטה מה-DOM ומפעיל את ה-cleanup שלה.

ה-annotation ‏`ComponentRef<AlertCard>` נחוץ כי `ref` מופיע בתוך ה-initializer של עצמו, ובלעדיו TypeScript עוצרת עם `TS7022`.

## טעינה עצלה עם import()

‏`import()` דינמי מעביר את הקומפוננטה ל-chunk נפרד, שנטען רק כשקוראים לו:

```typescript
import { Component, Type, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

@Component({
  selector: 'app-report',
  imports: [NgComponentOutlet],
  template: `
    <button (click)="showChart()">Show chart</button>
    @if (chart(); as chart) {
      <ng-container *ngComponentOutlet="chart" />
    }
  `,
})
export class Report {
  protected readonly chart = signal<Type<unknown> | null>(null);

  async showChart() {
    const { Chart } = await import('./chart');
    this.chart.set(Chart);
  }
}
```

‏`ng build` מראה את `chart.ts` כ-lazy chunk:

```text
Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-SBCFHI6M.js   | chart         | 297 bytes |               297 bytes
```

כשהטעינה תלויה רק במה שקורה בתבנית (לחיצה, גלילה), התיעוד ממליץ קודם על `@defer`, שהוא הנושא של הפוסט הבא. ‏`import()` מתאים כשההחלטה נמצאת בקוד.

### בגרסאות קודמות

לפני גרסה 13 יצירה דינמית עברה דרך factory:

```typescript
import { Component, ComponentFactoryResolver, ViewChild, ViewContainerRef } from '@angular/core';
import { AlertCard } from './widgets';

@Component({
  selector: 'app-notifications-old',
  template: `<ng-container #slot></ng-container>`,
})
export class NotificationsOld {
  @ViewChild('slot', { read: ViewContainerRef }) slot!: ViewContainerRef;

  constructor(private resolver: ComponentFactoryResolver) {}

  add() {
    const factory = this.resolver.resolveComponentFactory(AlertCard);
    const ref = this.slot.createComponent(factory);
    ref.setInput('text', 'Notification');
    ref.instance.closed.subscribe(() => ref.destroy());
  }
}
```

‏`ComponentFactoryResolver` היה deprecated מגרסה 13 ו-[הוסר בגרסה 22](https://github.com/angular/angular/blob/main/CHANGELOG.md), כך שהקוד הזה כבר לא מתקמפל:

```text
✘ [ERROR] TS2305: Module '"@angular/core"' has no exported member 'ComponentFactoryResolver'. [plugin angular-compiler]
```

היום מעבירים את המחלקה ישירות ל-`createComponent`. בקוד ישן עוד יותר מופיע גם `entryComponents` ב-NgModule, שהוסר בגרסה 16. ‏`ref.setInput` עדיין קיים, אבל `bindings` מחבר את ה-input ל-signal מראש.

## טעויות נפוצות של מתחילים

- **לשכוח את `NgComponentOutlet` ב-`imports`.** בלי ה-import, ‏`*ngComponentOutlet` לא מרנדר כלום, וה-build רק מזהיר (`NG8116`).
- **לא לקרוא ל-`destroy()`.** קומפוננטה שנוצרה ב-`createComponent` נשארת עד שמוחקים אותה או עד שה-container נהרס.
- **להשתמש ב-`import()` כשמספיק `@defer`.** בתבנית `@defer` עושה את אותה טעינה עצלה בלי קוד.

## מה הלאה

בפוסט הבא: ‏`@defer`, שטוען חלק מהתבנית ב-chunk נפרד לפי triggers כמו `on viewport` ו-`on idle`.
