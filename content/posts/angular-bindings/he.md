---
title: "Bindings ב-Angular: interpolation, ‏[property], ‏(event) ומשתני תבנית"
summary: "איך התבנית מתחברת למחלקה: interpolation עם {{ }}, ‏property ו-attribute binding, ‏class ו-style, אירועים עם (click) ו-$event, ומשתני תבנית עם #."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 5 }
---

‏[Binding](https://angular.dev/guide/templates/binding) מחבר את התבנית לנתונים של הקומפוננטה: ערכים זורמים מהמחלקה אל ה-DOM, ואירועים חוזרים מה-DOM אל המחלקה. קומפוננטה אחת מדגימה את כל הסוגים:

```typescript
// bindings.ts
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-bindings',
  template: `
    <h2>{{ title }}</h2>
    <img [src]="logo" [alt]="title" />

    <button
      [attr.aria-label]="'Add one to ' + count()"
      [disabled]="count() >= 3"
      (click)="add()"
    >
      +1
    </button>
    <p [class.done]="count() >= 3" [style.font-size.px]="14 + count()">Count: {{ count() }}</p>

    <input (input)="onInput($event)" placeholder="Name" />
    <p>Hello, {{ name() }}</p>

    <input #box placeholder="Note" />
    <button (click)="saved.set(box.value)">Save</button>
    <p>Saved: {{ saved() }}</p>
  `,
})
export class Bindings {
  protected readonly title = 'Bindings';
  protected readonly logo = 'logo.svg';
  protected readonly count = signal(0);
  protected readonly name = signal('');
  protected readonly saved = signal('');

  protected add() {
    this.count.update((n) => n + 1);
  }

  protected onInput(event: Event) {
    this.name.set((event.target as HTMLInputElement).value);
  }
}
```

כל דוגמה נבדקה עם Angular 22.2: בדיקת Vitest לחצה על הכפתורים, הקלידה בשדות וקראה את ה-DOM.

## ‏Interpolation: ‏{{ }}

‏`{{ title }}` מציג ערך כטקסט. ההמרה למחרוזת היא עם `toString`, ו-`{{ }}` עובד בכל מקום שבו כותבים טקסט ב-HTML, וגם בתוך ערך של attribute: `alt="Photo of {{ name() }}"`.

ערך שמשתנה עם הזמן צריך להיות [signal](he/posts/angular-signals/) שהתבנית קוראת בסוגריים, כמו `{{ count() }}`. ‏Angular עוקב אחרי ה-signals שהתבנית קוראת, ומעדכן רק כשהם משתנים. שדה רגיל כמו `title` מתאים לערך שלא משתנה.

## ‏Property binding: ‏[prop]

‏`[src]="logo"` מציב את הערך של `logo` ב-**property** של אלמנט ה-DOM. באותה צורה `[disabled]="count() >= 3"` מכבה את הכפתור כשהביטוי אמת. אותו תחביר מעביר ערכים גם ל-inputs של קומפוננטות אחרות. בין הסוגריים המרובעים כתוב שם ה-property של ה-DOM, שלא תמיד זהה לשם ה-attribute ב-HTML.

## ‏Attribute binding: ‏[attr.x]

לא לכל attribute יש property מקביל. אצלם משתמשים בקידומת `attr.`, כמו `[attr.aria-label]` ב-`<button>` למעלה. ערך `null` מסיר את ה-attribute. הטעות הנפוצה היא attribute שהשם שלו שונה מה-property:

```text
✘ [ERROR] NG8002: Can't bind to 'colspan' since it isn't a known property of 'td'.
```

ה-property נקרא `colSpan`, וה-attribute נקרא `colspan`. הדרך הבטוחה היא `[attr.colspan]="2"`, שעבר קומפילציה בלי שגיאה.

## ‏class ו-style

‏`[class.done]="count() >= 3"` מוסיף את המחלקה `done` כשהביטוי אמת, ו-`[style.font-size.px]="14 + count()"` קובע גודל גופן בפיקסלים (אחרי שלוש לחיצות: `17px`). הם נראים כאן רק בקצרה; [פוסט העיצוב](he/posts/angular-styling/) מראה גם את `[class]` ו-`[style]` עם אובייקטים.

## אירועים: ‏(event) ו-$event

‏`(click)="add()"` מריץ את הביטוי בכל לחיצה. בתוך כל listener יש משתנה `$event` עם אובייקט האירוע. ב-`(input)="onInput($event)"` הוא מגיע ל-`onInput`, שקורא את הערך מ-`event.target`. את ה-cast ל-`HTMLInputElement` אי אפשר לכתוב בתבנית עצמה ([פוסט הביטויים](he/posts/angular-template-expressions/) מסביר למה), ולכן הוא בתוך המתודה.

לאירועי מקלדת יש סינון לפי מקש: `(keyup.enter)="save()"` רץ רק על Enter, ואפשר לשרשר מקשי עזר: `(keyup.shift.enter)`. הרשימה המלאה ב[תיעוד האירועים](https://angular.dev/guide/templates/event-listeners).

## משתני תבנית: ‏#box

‏`#box` על ה-`<input>` נותן שם לאלמנט, וכל מקום אחר בתבנית יכול לקרוא אותו: `box.value` בכפתור קורא את מה שהוקלד בלי מתודה ובלי signal נוסף. על אלמנט רגיל [משתנה תבנית](https://angular.dev/guide/templates/variables) מצביע על אלמנט ה-DOM, ועל קומפוננטה על המופע שלה. הוא נראה בתבנית שהגדירה אותו ובבלוקים שבתוכה (`@if`, ‏`@for`), אבל לא להפך.

### בגרסאות קודמות

תחביר ה-bindings לא השתנה. ההבדל הוא במה שמחוברים אליו. בקוד ישן ערכים הם שדות רגילים (`count = 0`, `{{ count }}`), ו-Zone.js גרם ל-Angular לבדוק את התבנית אחרי כל אירוע, ולכן מה ששונה בתוך `(click)` או בתוך `setTimeout` הופיע על המסך. בלי Zone.js, שדה רגיל מתעדכן על המסך רק אחרי אירוע שמחובר לתבנית. שינוי אסינכרוני כמו `setTimeout` לא מעדכן אותו (בבדיקה, הערך על המסך נשאר ישן), ולכן משתמשים ב-signals.

## טעויות נפוצות של מתחילים

- **סוגריים מרובעים או עגולים שחסרים.** `src="logo"` שולח את המחרוזת `logo`, ולא את השדה. כדי להעביר את הערך צריך `[src]="logo"`.
- **לקרוא ל-signal בלי סוגריים.** `{{ count }}` מציג את הפונקציה, ו-`{{ count() }}` את הערך.
- **לכתוב `[colspan]` במקום `[attr.colspan]`.** ל-`<td>` אין property בשם הזה (יש `colSpan`), והשגיאה `NG8002` מופיעה בקומפילציה.

## מה הלאה

בפוסט הבא: בקרת זרימה בתבנית, ‏`@if`, ‏`@for` ו-`@switch`.
