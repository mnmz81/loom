---
title: "בקרת זרימה בתבניות: ‏@if, ‏@for ו-@switch"
summary: "להציג, להסתיר ולחזור על תוכן בתבנית עם @if, ‏@else, ‏@for עם track ו-@empty, ‏@switch, כולל בדיקת שלמות. ובגרסאות קודמות: ‏*ngIf, ‏*ngFor ו-trackBy."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 6 }
---

[בקרת זרימה](https://angular.dev/guide/templates/control-flow) היא בלוקים בתבנית שמחליטים מה להציג ופעמים כמה. הם חלק מתחביר התבנית עצמו, ולכן אין מה לייבא. קומפוננטה אחת משתמשת בשלושתם:

```typescript
// tasks.ts
import { Component, signal } from '@angular/core';

type Task = { id: number; title: string; status: 'todo' | 'doing' | 'done' };

@Component({
  selector: 'app-tasks',
  template: `
    @if (tasks().length > 2) {
      <p>Busy day: {{ tasks().length }} tasks</p>
    } @else if (tasks().length > 0) {
      <p>{{ tasks().length }} tasks</p>
    } @else {
      <p>Nothing to do</p>
    }

    @if (tasks()[0]; as next) {
      <p>Next: {{ next.title }}</p>
    }

    <ul>
      @for (task of tasks(); track task.id; let i = $index, isLast = $last) {
        <li>
          {{ i + 1 }}. {{ task.title }}
          @switch (task.status) {
            @case ('todo') {
              <b>to do</b>
            }
            @case ('doing') {
              <b>in progress</b>
            }
            @default {
              <b>done</b>
            }
          }
          @if (isLast) {
            <i>(last)</i>
          }
        </li>
      } @empty {
        <li>The list is empty</li>
      }
    </ul>

    <button (click)="clear()">Clear</button>
  `,
})
export class Tasks {
  protected readonly tasks = signal<Task[]>([
    { id: 1, title: 'Write post', status: 'doing' },
    { id: 2, title: 'Review', status: 'todo' },
    { id: 3, title: 'Publish', status: 'done' },
  ]);

  protected clear() {
    this.tasks.set([]);
  }
}
```

כל דוגמה בפוסט נבדקה עם Angular 22.2 בבדיקת Vitest, וגם בבדיקה אחרי לחיצה על `Clear`, שהציגה את בלוק ה-`@empty`.

## ‏@if, ‏@else if ו-@else

‏`@if (תנאי) { ... }` מציג את התוכן כשהתנאי אמת. אחריו אפשר לשרשר כמה `@else if` ו-`@else` אחד. ב-`@if (tasks()[0]; as next)` המילה `as` שומרת את תוצאת הביטוי במשתנה `next` לשימוש בתוך הבלוק, ומועילה כשהביטוי ארוך. אחרי `Clear` הרשימה ריקה, `tasks()[0]` הוא `undefined`, והבלוק לא מוצג.

## ‏@for ו-track

‏`@for (task of tasks(); track task.id) { ... }` חוזר על כל איבר באוסף. ‏`track` **חובה**, ובלעדיו ה-build נכשל:

```text
✘ [ERROR] NG5002: @for loop must have a "track" expression
```

ביטוי ה-`track` מקשר בין נתון לצומת ה-DOM שלו, כדי שכשהרשימה משתנה Angular יזיז, יוסיף ויסיר רק את מה שצריך במקום לבנות הכול מחדש. ‏[ההמלצה בתיעוד](https://angular.dev/guide/templates/control-flow): לעקוב אחרי מאפיין שמזהה כל איבר באופן ייחודי, כמו `id`. ל[אוספים סטטיים](https://angular.dev/guide/templates/control-flow) שלא משתנים אפשר `track $index`. ‏`track item` עוקב לפי זהות האובייקט, ועדיף להימנע ממנו, כי כל אובייקט חדש בונה את ה-DOM שלו מחדש.

בתוך `@for` זמינים משתנים מוכנים: `$count`, ‏`$index`, ‏`$first`, ‏`$last`, ‏`$even` ו-`$odd`. אפשר לתת להם כינוי עם `let`, כמו `let i = $index, isLast = $last` למעלה. הכינוי מועיל בעיקר בלולאות מקוננות, כדי שהלולאה הפנימית תוכל לקרוא את `$index` של החיצונית. הכינוי חייב להצביע ישירות על המשתנה: `let n = $index + 1` נכשל עם `Unrecognized for loop context variable n`, ולכן הדוגמה כותבת `{{ i + 1 }}`.

‏`@empty` מגיע מיד אחרי תוכן ה-`@for`, ומוצג כשאין איברים. ב-`@for` אין `break` ו-`continue`; כדי לדלג על איברים מסננים את האוסף לפני כן.

## ‏@switch

‏`@switch` משווה ערך ל-`@case` בעזרת `===`, ואין בו fallthrough, כך שאין צורך ב-`break`. ‏`@default` מוצג כשאף `@case` לא תאם, ואם אין `@default` לא מוצג דבר.

אפשר לרשום כמה `@case` ברצף לפני בלוק אחד, וכך כמה ערכים חולקים תוכן. ובדיקת שלמות: ‏`@default never;` מורה ל-Angular לוודא בזמן הקומפילציה שכל ערכי ה-union מטופלים. הנה קומפוננטה שמטפלת בשלושה מצבים, ומחברת שניים מהם בשני `@case` רצופים:

```typescript
// status.ts
import { Component, input } from '@angular/core';

type Status = 'loggedOut' | 'loading' | 'loggedIn';

@Component({
  selector: 'app-status',
  template: `
    @let s = state();
    @switch (s) {
      @case ('loggedOut') {
        <button>Login</button>
      }
      @case ('loading')
      @case ('loggedIn') {
        <p>Please wait or welcome</p>
      }
      @default never;
    }
  `,
})
export class StatusView {
  readonly state = input.required<Status>();
}
```

הקומפוננטה עוברת קומפילציה. אם מוחקים את `@case ('loggedIn')`, ה-build נכשל, כי `'loggedIn'` נשאר לבלוק `@default never`:

```text
✘ [ERROR] TS2322: Type '"loggedIn"' is not assignable to type 'never'.
```

הבדיקה עובדת רק על משתנה, ולא על קריאה ל-signal. לכן `@let s = state();` קודם, ורק אז `@switch (s)`. ([`@let`](he/posts/angular-template-expressions/) מוסבר בפוסט הבא.) הצורה `@case` ברצף ו-`@default never` מופיעות ב[מדריך הנוכחי](https://angular.dev/guide/templates/control-flow), ועברו קומפילציה ב-22.2; לא בדקתי באיזו גרסה נוספו.

### בגרסאות קודמות

לפני גרסה 17 בקרת הזרימה נעשתה עם directives, ‏`*ngIf` ו-`*ngFor`, ועם `[ngSwitch]`. ‏`*ngIf` ו-`*ngFor` [מסומנים deprecated מגרסה 20](https://angular.dev/api/common/NgIf), וצריך לייבא אותם (או את `CommonModule` ב-NgModule). אותה רשימת משימות בסגנון הישן, בלי ה-signal:

```typescript
import { Component } from '@angular/core';
import { NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';

type Task = { id: number; title: string; status: 'todo' | 'doing' | 'done' };

@Component({
  selector: 'app-tasks-old',
  imports: [NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault],
  template: `
    <p *ngIf="tasks.length > 0; else empty">{{ tasks.length }} tasks</p>
    <ng-template #empty><p>Nothing to do</p></ng-template>

    <ul>
      <li *ngFor="let task of tasks; trackBy: trackById; let i = index; let last = last">
        {{ i + 1 }}. {{ task.title }}
        <ng-container [ngSwitch]="task.status">
          <b *ngSwitchCase="'todo'">to do</b>
          <b *ngSwitchCase="'doing'">in progress</b>
          <b *ngSwitchDefault>done</b>
        </ng-container>
        <i *ngIf="last">(last)</i>
      </li>
    </ul>
  `,
})
export class TasksOld {
  protected tasks: Task[] = [
    { id: 1, title: 'Write post', status: 'doing' },
    { id: 2, title: 'Review', status: 'todo' },
  ];

  protected trackById(_index: number, task: Task) {
    return task.id;
  }
}
```

ההבדלים: ‏`else` מפנה ל-`<ng-template>` עם שם במקום בלוק `@else`, ‏`trackBy` מקבל פונקציה (ובלעדיו Angular עוקב לפי זהות האובייקט) במקום ביטוי, ו-`index` ו-`last` במקום `$index` ו-`$last`. כל אלה נבדקו ועובדים ב-22.2.

[סכמת המיגרציה](https://angular.dev/reference/migrations/control-flow) ממירה פרויקט שלם:

```bash
ng generate @angular/core:control-flow
```

בהרצה על הקומפוננטה הישנה היא החליפה את כל ה-directives בבלוקים והסירה אותם מ-`imports`. את `trackBy: trackById` היא המירה ל-`track trackById(i, task)`, שעובד, אבל עדיף להחליף אותו ל-`track task.id`.

## טעויות נפוצות של מתחילים

- **לשכוח `track`.** זו שגיאת קומפילציה, והפתרון הוא `track item.id`.
- **‏`track item` על אובייקטים שנוצרים מחדש.** אם הרשימה מגיעה מהשרת בכל פעם כאובייקטים חדשים, כל ה-DOM נבנה מחדש. עוקבים אחרי `id`.

## מה הלאה

בפוסט הבא: מה מותר לכתוב בתוך `{{ }}` ובתוך bindings, ‏`@let`, ‏`?.`, ומה אסור.
