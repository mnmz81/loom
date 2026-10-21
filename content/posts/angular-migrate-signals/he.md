---
title: "מיגרציות ל-signals: inputs, ‏outputs, ‏queries, ‏inject ו-control flow"
summary: "חמש סכמות של @angular/core שמעבירות קומפוננטה עם דקורטורים לסגנון של Angular 22: input(), ‏output(), ‏viewChild(), ‏inject() ו-@if/@for. הרצה אמיתית, התוצאה, ומה הן לא מעבירות."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 82 }
---

אחרי [המעבר ל-standalone](he/posts/angular-migrate-standalone/) הקוד עדיין כתוב בדקורטורים: `@Input`, ‏`@Output`, ‏`@ViewChild`, הזרקה בבנאי ו-`*ngIf`. לכל אחד מהם יש מיגרציה ב-`@angular/core`. הפוסט מריץ את כולן על קומפוננטה אחת.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## הקומפוננטה לפני

```typescript
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { TodoStore } from './todo-store';

@Component({
  selector: 'app-todo-list',
  imports: [NgIf, NgFor],
  template: `
    <h2>{{ title }}</h2>
    <input #box />
    <ul *ngIf="store.items.length; else empty">
      <li *ngFor="let item of store.items">{{ item }}</li>
    </ul>
    <ng-template #empty><p>Nothing yet</p></ng-template>
    <button (click)="add()">Add</button>
  `,
})
export class TodoList {
  @Input() title = 'Todos';
  @Output() added = new EventEmitter<string>();
  @ViewChild('box') box!: ElementRef<HTMLInputElement>;

  constructor(public store: TodoStore) {}

  add() {
    const text = this.box.nativeElement.value;
    this.store.items.push(text);
    this.added.emit(text);
  }
}
```

בדיקת Vitest מגדירה `title`, לוחצת על הכפתור ובודקת את הכותרת, את הרשימה ואת הערך שנשלח ב-`added`. היא עברה לפני המיגרציות ואחריהן, והמיגרציות לא שינו אותה.

## ‏inputs, ‏outputs ו-queries

```bash
ng generate @angular/core:signal-input-migration
ng generate @angular/core:output-migration
ng generate @angular/core:signal-queries-migration
```

```text
    Successfully migrated to signal inputs 🎉
      -> Migrated 1/1 inputs.
    Successfully migrated to outputs as functions 🎉
      -> Migrated 1 out of 1 detected outputs (100.00 %).
    Successfully migrated to signal queries 🎉
      -> Migrated 1/1 queries.
```

(הפלט מקוצר לשורות הסיכום.) שלוש המיגרציות מעדכנות גם את מי שמשתמש בשדה, לא רק את ההצהרה:

- ‏`@Input() title` הפך ל-`readonly title = input('Todos')`, ובתבנית `{{ title }}` הפך ל-`{{ title() }}` ‏([inputs](he/posts/angular-inputs/)).
- ‏`@Output() added = new EventEmitter<string>()` הפך ל-`readonly added = output<string>()`. הקריאה ל-`emit` נשארה ([outputs](he/posts/angular-outputs-model/)).
- ‏`@ViewChild('box') box!` הפך ל-`viewChild.required(...)`, ו-`this.box.nativeElement` הפך ל-`this.box().nativeElement` ‏([queries](he/posts/angular-queries/)).

הסכמה `ng generate @angular/core:signals` מריצה את שלוש המיגרציות האלה יחד (‏`--migrations` בוחר חלק מהן). כל אחת מתועדת בעמוד משלה תחת [Migrations](https://angular.dev/reference/migrations).

## ‏inject() ו-control flow

```bash
ng generate @angular/core:inject-migration
ng generate @angular/core:control-flow-migration
```

‏[המיגרציה ל-inject](https://angular.dev/reference/migrations/inject-function) החליפה את `constructor(public store: TodoStore) {}` בשדה `store = inject(TodoStore)` ומחקה את הבנאי הריק. ‏[המיגרציה ל-control flow](https://angular.dev/reference/migrations/control-flow) החליפה את `*ngIf` ואת `*ngFor` ב-`@if` וב-`@for`, ומחקה את `NgIf` ו-`NgFor` מ-`imports`.

## התוצאה

```typescript
import { Component, ElementRef, input, output, viewChild, inject } from '@angular/core';

import { TodoStore } from './todo-store';

@Component({
  selector: 'app-todo-list',
  imports: [],
  template: `
    <h2>{{ title() }}</h2>
    <input #box />
    @if (store.items.length) {
      <ul>
        @for (item of store.items; track item) {
          <li>{{ item }}</li>
        }
      </ul>
    } @else {
      <p>Nothing yet</p>
    }
    <button (click)="add()">Add</button>
  `,
})
export class TodoList {
  store = inject(TodoStore);

  readonly title = input('Todos');
  readonly added = output<string>();
  readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');

  add() {
    const text = this.box().nativeElement.value;
    this.store.items.push(text);
    this.added.emit(text);
  }
}
```

הבדיקה עברה גם על הקוד הזה. שלושה דברים נשארו לטיפול ידני:

- ‏`track item` עוקב אחרי הערך עצמו. אם אותו טקסט יכול להופיע פעמיים, עדיף מזהה ייחודי ([control flow](he/posts/angular-control-flow/)).
- ‏`store` נשאר שדה ציבורי שאפשר לשנות. לפי [מדריך הסגנון](https://angular.dev/style-guide) כדאי `protected readonly`.
- ‏`TodoStore` עדיין מחזיק מערך רגיל ש-`push` משנה. כדי ש-OnPush יעבוד בלי תלות באירועים, הוא צריך להפוך ל-signal, וזה כבר שינוי שאין לו מיגרציה.

## מה המיגרציות לא מעבירות

ברירת המחדל זהירה: מה שלא בטוח להעביר נשאר כמו שהוא. לפי [התיעוד של signal inputs](https://angular.dev/reference/migrations/signal-inputs), למשל, input שהקוד כותב אליו (`this.title = ...`) לא עובר, כי ל-`input()` אי אפשר לכתוב. שתי אפשרויות משנות את זה:

- ‏`--insert-todos` מוסיף הערת TODO עם הסיבה מעל כל שדה שלא הועבר.
- ‏`--best-effort-mode` מעביר כמה שיותר, גם במחיר build שבור.

למיגרציות של inputs, ‏outputs ו-queries יש גם `--path`, ו-`--dry-run` מראה מה ישתנה בלי לכתוב. לפי אותו עמוד, המיגרציה ל-signal inputs זמינה גם כפעולת refactor בתוסף של Angular ל-VS Code.

## טעויות נפוצות של מתחילים

- **להריץ הכול על כל הפרויקט בבת אחת.** עם `--path` ו-commit אחרי כל מיגרציה, קל יותר לבדוק כל diff.
- **לא לקרוא את שורת הסיכום.** בפרויקט אמיתי לא כל השדות עוברים, ואת אלה שנשארו בחוץ מוצאים עם `--insert-todos`.
- **לא להריץ את הבדיקות אחרי כל שלב.** המיגרציה משנה גם קוד שקורא לשדות, וטעות שם מתגלה רק בבדיקה.

## מה הלאה

בפוסט הבא, האחרון בסדרה: Angular וכלי AI. שרת ה-MCP של Angular CLI והקבצים ש-angular.dev מפרסם בשביל מודלי שפה.
