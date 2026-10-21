---
title: "‏ng-template, ‏ngTemplateOutlet ו-ng-container"
summary: "איך מגדירים קטע תבנית עם <ng-template>, מציגים אותו כמה פעמים עם ngTemplateOutlet והקשר (context), מעבירים אותו לקומפוננטה אחרת, ומה <ng-container> עושה."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 8 }
---

לפעמים אותו קטע תבנית צריך להופיע בכמה מקומות, או שקומפוננטה אחרת צריכה להחליט איך לצייר אותו. בשביל זה יש שלושה כלים: `<ng-template>` מגדיר קטע שלא מוצג מיד, ‏`ngTemplateOutlet` מציג אותו, ו-`<ng-container>` הוא המקום שבו הוא מוצג.

כל דוגמה נבדקה עם Angular 22.2: בדיקת Vitest קראה את ה-HTML שהתקבל.

## ‏ng-template והקשר

‏[`<ng-template>`](https://angular.dev/guide/templates/ng-template) מגדיר *template fragment*: תוכן שלא מרונדר במקום שבו כתבו אותו. כדי להציג אותו צריך הפניה אליו (`TemplateRef`), ואחת הדרכים לקבל אותה היא משתנה תבנית, `#badge`. ‏`NgTemplateOutlet` מציג את הקטע ב-`<ng-container>`:

```typescript
// badges.ts
import { Component, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-badges',
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #badge let-label let-count="count">
      <b>{{ label }}: {{ count }} ({{ owner }})</b>
    </ng-template>

    <p>Inbox <ng-container [ngTemplateOutlet]="badge" [ngTemplateOutletContext]="{ $implicit: 'new', count: unread() }" /></p>
    <p>Drafts <ng-container *ngTemplateOutlet="badge; context: { $implicit: 'old', count: 2 }" /></p>
  `,
})
export class Badges {
  protected readonly owner = 'Badges';
  protected readonly unread = signal(5);
}
```

ה-DOM שמתקבל:

```html
<p>Inbox <b>new: 5 (Badges)</b></p><p>Drafts <b>old: 2 (Badges)</b></p>
```

כמה דברים קורים כאן:

- **הקטע מוצג פעמיים**, פעם בכל `<ng-container>`. הקטע עצמו לא מרונדר במקומו.
- **‏`ngTemplateOutletContext` הוא אובייקט פרמטרים.** ב-`<ng-template>` כל פרמטר הוא attribute עם הקידומת `let-`. ‏`let-count="count"` קורא את המפתח `count` מההקשר, ו-`let-label` בלי ערך קורא את המפתח המיוחד `$implicit`.
- **שני תחבירים לאותו דבר.** ‏`[ngTemplateOutlet]` ו-`[ngTemplateOutletContext]` הם שני inputs רגילים. ‏`*ngTemplateOutlet="badge; context: {...}"` הוא [הקיצור](https://angular.dev/api/common/NgTemplateOutlet) עם הכוכבית. ‏`*ngTemplateOutlet` אינו deprecated, בניגוד ל-`*ngIf` ו-`*ngFor`.
- **הביטויים בקטע רצים מול הקומפוננטה שהצהירה עליו**, לא מול המקום שבו הוא מוצג. ‏`{{ owner }}` מציג `Badges` בשני המקרים.

אם שוכחים לייבא את `NgTemplateOutlet`, ה-build נכשל:

```text
✘ [ERROR] NG8002: Can't bind to 'ngTemplateOutlet' since it isn't a known property of 'ng-container'.
```

## ‏ng-container

‏[`<ng-container>`](https://angular.dev/guide/templates/ng-container) מקבץ אלמנטים או מסמן מקום בתבנית בלי ליצור אלמנט אמיתי ב-DOM: ב-HTML שלמעלה אין תג `ng-container`. הוא מתאים כמארח ל-outlet (כמו כאן, וגם ל-`ngComponentOutlet` שמרנדר קומפוננטה דינמית, ראו [קומפוננטות דינמיות](he/posts/angular-dynamic-components/)), וכמקום להצמיד אליו directive בלי אלמנט נוסף. ‏Angular מתעלם מ-attribute bindings ומ-event listeners שנכתבו עליו.

## העברת תבנית לקומפוננטה אחרת

הכוח האמיתי של `TemplateRef` הוא שאפשר להעביר אותו כ-input. קומפוננטת רשימה מחליטה *מה* להציג, והקוראת מחליטה *איך* לצייר כל שורה:

```typescript
// list.ts
import { Component, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

type RowContext = { $implicit: string; index: number };

@Component({
  selector: 'app-list',
  imports: [NgTemplateOutlet],
  template: `
    <ul>
      @for (item of items(); track item) {
        <li>
          <ng-container
            [ngTemplateOutlet]="row() ?? plain"
            [ngTemplateOutletContext]="{ $implicit: item, index: $index }"
          />
        </li>
      }
    </ul>
    <ng-template #plain let-item>{{ item }}</ng-template>
  `,
})
export class List {
  readonly items = input<string[]>([]);
  readonly row = input<TemplateRef<RowContext>>();
}

@Component({
  selector: 'app-names',
  imports: [List],
  template: `
    <app-list [items]="names" />
    <app-list [items]="names" [row]="numbered" />
    <ng-template #numbered let-name let-i="index">{{ i + 1 }}. <b>{{ name }}</b> ({{ team }})</ng-template>
  `,
})
export class Names {
  protected readonly names = ['Dana', 'Avi'];
  protected readonly team = 'Names';
}
```

```html
<app-list><ul><li>Dana</li><li>Avi</li></ul></app-list>
<app-list><ul><li>1. <b>Dana</b> (Names)</li><li>2. <b>Avi</b> (Names)</li></ul></app-list>
```

הרשימה הראשונה משתמשת בתבנית ברירת המחדל `plain`, והשנייה בתבנית של הקורא. ‏`{{ team }}` מגיע מ-`Names`, למרות שהשורה מצוירת בתוך `List`. התיעוד מציין שכך בנויים, למשל, הטאבים והטבלה של Angular Material. אפשר גם לקבל `TemplateRef` בקוד עם `viewChild` (ראו [queries](he/posts/angular-queries/)) ולהציג אותו עם `ViewContainerRef`.

### בגרסאות קודמות

עד גרסה 17 השימוש הנפוץ ביותר ב-`<ng-template>` היה ה-`else` של `*ngIf`, שמפנה אל קטע עם שם:

```html
<p *ngIf="user; else guest">Hello, {{ user.name }}</p>
<ng-template #guest><p>Hello, guest</p></ng-template>
```

הוא הוחלף ב-`@if ... @else` ([בקרת זרימה](he/posts/angular-control-flow/)). ‏`*ngIf` הוא סוכר תחבירי: Angular עוטף את האלמנט ב-`<ng-template>` מאחורי הקלעים, ובשביל זה נכתבה הכוכבית (ראו [directives מבניים](he/posts/angular-structural-directives/)).

## טעויות נפוצות של מתחילים

- **לצפות שתוכן של `<ng-template>` יוצג לבד.** בלי outlet (או קוד שמרנדר אותו) הוא לא מופיע ב-DOM.
- **לשכוח לייבא `NgTemplateOutlet`.** זו השגיאה `NG8002` שלמעלה.
- **לכתוב `let-count` כשרוצים את המפתח `count`.** ‏`let-count` בלי ערך קורא את `$implicit`. כדי לקרוא את `count` כותבים `let-count="count"`.

## מה הלאה

בפוסט הבא: עיצוב קומפוננטות, ‏view encapsulation, ‏`:host` ו-`[class]`.
