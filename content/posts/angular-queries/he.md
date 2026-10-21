---
title: "queries ב-Angular: ‏viewChild, ‏viewChildren, ‏contentChild ו-contentChildren"
summary: "איך קומפוננטה מגיעה לאלמנטים ולקומפוננטות בתבנית שלה ובתוכן שמוקרן אליה: ‏viewChild ו-contentChild כ-signals, ‏required, האפשרות read, ומה היה לפני: @ViewChild ו-ngAfterViewInit."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 17 }
---

לפעמים קומפוננטה צריכה הפניה ישירה למשהו בתבנית: להעביר פוקוס לשדה, לקרוא מצב של קומפוננטת ילד, לדעת אילו טאבים הוקרנו לתוכה. ‏[Queries](https://angular.dev/guide/components/queries) מחזירים את ההפניות האלה כ-signals, שמתעדכנים כשהתבנית משתנה.

כל דוגמה נבדקה עם Angular 22.2.

## ‏viewChild: אלמנט מהתבנית

```typescript
import { Component, ElementRef, afterNextRender, viewChild } from '@angular/core';

@Component({
  selector: 'app-search-field',
  template: `<input #box placeholder="Search" />`,
})
export class SearchField {
  private readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');

  constructor() {
    afterNextRender(() => this.box().nativeElement.focus());
  }
}
```

‏`viewChild('box')` מחפש בתבנית של הקומפוננטה את ה-template reference ‏`#box` ומחזיר `ElementRef` שעוטף את האלמנט. ‏`afterNextRender` מריץ את הקוד אחרי שהתבנית נכנסה ל-DOM (פירוט בפוסט על [מחזור החיים](he/posts/angular-lifecycle/)), ולכן השדה מקבל פוקוס מיד כשהקומפוננטה מוצגת.

‏query שלא מצא תוצאה מחזיר `undefined`, למשל כשהאלמנט בתוך `@if` שכרגע שקרי, ולכן הטיפוס הרגיל כולל `undefined`. ‏[`viewChild.required`](https://angular.dev/guide/components/queries#required-queries) מתאים כשהאלמנט תמיד קיים: הטיפוס בלי `undefined`, ואם אין תוצאה Angular זורק שגיאה. אפשר לחפש לפי template reference או לפי מחלקה של קומפוננטה או דירקטיבה, אבל לא לפי CSS selector.

## ‏viewChildren: כמה קומפוננטות

```typescript
import { Component, computed, input, model, viewChildren } from '@angular/core';

@Component({
  selector: 'app-task',
  template: `<label><input type="checkbox" [checked]="done()" (change)="done.set(!done())" /> {{ title() }}</label>`,
})
export class Task {
  readonly title = input.required<string>();
  readonly done = model(false);
}

@Component({
  selector: 'app-checklist',
  imports: [Task],
  template: `
    @for (title of titles; track title) {
      <app-task [title]="title" />
    }
    <p>{{ doneCount() }} of {{ tasks().length }} done</p>
  `,
})
export class Checklist {
  protected readonly titles = ['Install', 'Build', 'Deploy'];
  private readonly tasks = viewChildren(Task);
  protected readonly doneCount = computed(() => this.tasks().filter((t) => t.done()).length);
}
```

‏`viewChildren(Task)` מחזיר signal של מערך עם כל מופעי `Task` בתבנית. ה-`computed` קורא גם את המערך וגם את `done()` של כל משימה, ולכן מתעדכן כשמשימה מסומנת וכש-`@for` מוסיף או מסיר אחת. אחרי סימון שתי משימות מוצג `2 of 3 done`. ‏View queries לא נכנסים לתבנית של קומפוננטה אחרת: ‏`Checklist` רואה את `<app-task>`, לא את ה-checkbox שבתוכו.

## ‏contentChildren: מה שההורה הקרין

```typescript
import { Component, contentChildren, input, signal } from '@angular/core';

@Component({
  selector: 'app-tab',
  template: `@if (active()) { <ng-content /> }`,
})
export class Tab {
  readonly title = input.required<string>();
  readonly active = signal(false);
}

@Component({
  selector: 'app-tabs',
  template: `
    @for (tab of tabs(); track tab) {
      <button (click)="select(tab)">{{ tab.title() }}</button>
    }
    <ng-content />
  `,
})
export class Tabs {
  protected readonly tabs = contentChildren(Tab);

  protected select(selected: Tab) {
    for (const tab of this.tabs()) tab.active.set(tab === selected);
  }
}

@Component({
  selector: 'app-settings',
  imports: [Tabs, Tab],
  template: `
    <app-tabs>
      <app-tab title="Profile">Profile form</app-tab>
      <app-tab title="Billing">Billing details</app-tab>
    </app-tabs>
  `,
})
export class Settings {}
```

‏`<app-tab>` לא נמצאים בתבנית של `Tabs` אלא בתוכן שההורה העביר לו, ולכן מחפשים אותם עם [`contentChildren`](https://angular.dev/guide/components/queries#content-queries) (על `<ng-content>`: [הפוסט על content projection](he/posts/angular-content-projection/)). ‏`Tabs` בונה כפתור לכל טאב, ולחיצה על `Billing` מציגה `Billing details` ומסתירה את `Profile form`. ‏`contentChildren` מוצא כברירת מחדל רק ילדים ישירים, ו-`descendants: true` מרחיב את החיפוש. ‏`contentChild` (יחיד) מחפש בכל העומק כבר כברירת מחדל.

## האפשרות read

```typescript
import { Component, ElementRef, afterNextRender, viewChild } from '@angular/core';
import { Tab } from './tabs';

@Component({
  selector: 'app-read-demo',
  imports: [Tab],
  template: `<app-tab #tab title="Intro">Hello</app-tab>`,
})
export class ReadDemo {
  private readonly tab = viewChild.required('tab', { read: ElementRef });
  private readonly tabComponent = viewChild.required(Tab);

  constructor() {
    afterNextRender(() => {
      console.log(this.tab().nativeElement.tagName, this.tabComponent().title());
    });
  }
}
```

```text
APP-TAB Intro
```

על אלמנט של קומפוננטה, query מחזיר כברירת מחדל את המופע של הקומפוננטה. ‏[`read`](https://angular.dev/guide/components/queries#reading-specific-values-from-an-elements-injector) בוחר ערך אחר מאותו אלמנט. כאן `read: ElementRef` מחזיר את אלמנט ה-DOM ‏`<app-tab>`, בזמן ש-`viewChild(Tab)` מחזיר את הקומפוננטה. השימושים הנפוצים הם `ElementRef` ו-`TemplateRef`.

### בגרסאות קודמות

ה-queries כ-signals נוספו בגרסה 17.2 והוכרזו כיציבים בגרסה 19 ([changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md)). לפני כן השתמשו ב[דקורטורים](https://angular.dev/guide/components/queries#decorator-based-queries), והתוצאה הייתה זמינה רק מ-`ngAfterViewInit`:

```typescript
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-search-field-old',
  template: `<input #box placeholder="Search" />`,
})
export class SearchFieldComponent implements AfterViewInit {
  @ViewChild('box') box!: ElementRef<HTMLInputElement>;

  ngAfterViewInit() {
    this.box.nativeElement.focus();
  }
}
```

לפני `ngAfterViewInit` הערך הוא `undefined`. ‏`{ static: true }` הקדים אותו ל-`ngOnInit`, בתנאי שהאלמנט לא בתוך תנאי, אבל תוצאה סטטית לא מתעדכנת אחר כך. ‏`@ViewChildren` ו-`@ContentChildren` החזירו `QueryList` עם `changes` שנרשמים אליו, ו-`@ContentChild` עבד ב-`ngAfterContentInit`. הדקורטורים עדיין נתמכים, וה-migration ‏`signal-queries-migration` ממיר אותם.

## טעויות נפוצות של מתחילים

- **לקרוא query בבנאי.** התבנית עוד לא נוצרה: ‏query רגיל מחזיר שם `undefined`, ועל `viewChild.required` ה-build נכשל עם `NG8118`. קוראים אותו בתבנית, ב-`computed`, ב-`effect` או ב-`afterNextRender`.
- **לחפש עם view query משהו שהגיע מההורה.** תוכן מוקרן מחפשים עם `contentChild`.
- **לכתוב state לילד דרך query.** [לפי התיעוד](https://angular.dev/guide/components/queries#common-query-pitfalls) זה מוביל לקוד שביר ולשגיאות `ExpressionChangedAfterItHasBeenChecked`. נתונים עוברים לילד ב-input.

## מה הלאה

בפוסט הבא: מחזור החיים של קומפוננטה, מהבנאי ו-`ngOnInit` ועד `DestroyRef` ו-`afterNextRender`.
