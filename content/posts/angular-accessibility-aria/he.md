---
title: "נגישות ב-Angular: ‏ARIA, ניהול פוקוס ו-Angular Aria"
summary: "נגישות בקומפוננטות Angular: אלמנטים נייטיב, ‏binding למאפייני ARIA, העברת פוקוס, הכרזות עם LiveAnnouncer, ו-Angular Aria, הדירקטיבות ה-headless שיציבות מגרסה 22."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 61 }
---

משתמש שעובד עם מקלדת או עם קורא מסך צריך לדעת מה כל אלמנט עושה, באיזה מצב הוא נמצא, ומה השתנה אחרי פעולה. ב-Angular יש לזה שלוש שכבות: HTML נכון עם מאפייני ARIA בתבנית, כלים מ-`@angular/cdk/a11y`, וחבילת `@angular/aria` לווידג'טים מורכבים כמו listbox ו-tabs.

כל דוגמה נבדקה עם Angular 22.2 ו-`@angular/aria` + `@angular/cdk` 22.2.3, בטסט Vitest שבודק את ה-DOM.

## אלמנטים נייטיב ומאפייני ARIA

‏`<button>` אמיתי מקבל פוקוס, מגיב ל-Enter ול-Space ומוכרז כ"כפתור". ‏`<div (click)>` לא עושה אף אחד מאלה. לכן מתחילים מהאלמנט הנכון, ומוסיפים ARIA רק למידע ש-HTML לא מבטא, כמו "הפאנל הזה פתוח":

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-disclosure',
  template: `
    <button type="button" [aria-expanded]="open()" aria-controls="shipping" (click)="open.set(!open())">
      Shipping details
    </button>
    <div id="shipping" [hidden]="!open()">Ships in 2–3 business days.</div>
    <button type="button" [aria-label]="'Remove ' + item()">✕</button>
  `,
})
export class Disclosure {
  protected readonly open = signal(false);
  protected readonly item = signal('Coffee');
}
```

‏`[aria-expanded]` הוא [binding רגיל למאפיין ARIA](https://angular.dev/guide/templates/binding): ‏Angular כותב את הערך כמאפיין HTML ‏(`aria-expanded="false"`, ואחרי לחיצה `"true"`) ומסיר אותו כשהערך `null`. ערך קבוע, כמו `aria-controls`, נכתב כמאפיין רגיל. הכפתור השני מציג רק ✕, ולכן `aria-label` נותן לו שם שקורא מסך יכול להקריא ("Remove Coffee"). עוד דוגמאות, כולל `role` ו-`aria-valuenow` ב-`host` של קומפוננטה, יש ב[מדריך הנגישות](https://angular.dev/best-practices/a11y).

## העברת פוקוס והכרזה על שינוי

כשפעולה מוחקת את האלמנט שבפוקוס, הדפדפן מחזיר את הפוקוס ל-`body`, ומשתמש המקלדת מאבד את המקום. בנוסף, קורא המסך לא אומר כלום על השינוי. הקומפוננטה הבאה מטפלת בשניהם:

```typescript
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Component({
  selector: 'app-cart',
  template: `
    <h2 #heading tabindex="-1">Cart ({{ items().length }})</h2>
    <ul>
      @for (item of items(); track item) {
        <li>
          {{ item }}
          <button type="button" [aria-label]="'Remove ' + item" (click)="remove(item)">✕</button>
        </li>
      }
    </ul>
  `,
})
export class Cart {
  private readonly announcer = inject(LiveAnnouncer);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  protected readonly items = signal(['Coffee', 'Tea', 'Milk']);

  protected remove(item: string) {
    this.items.update((list) => list.filter((i) => i !== item));
    this.heading().nativeElement.focus();
    this.announcer.announce(`${item} removed from cart`);
  }
}
```

- ‏`tabindex="-1"` מאפשר לתת פוקוס לכותרת מהקוד, בלי להוסיף אותה לסדר ה-Tab. ‏`viewChild` מוסבר בפוסט על [queries](he/posts/angular-queries/).
- [`LiveAnnouncer`](https://material.angular.dev/cdk/a11y/overview) מחבילת ה-CDK (`npm install @angular/cdk`) כותב את ההודעה לאלמנט מוסתר עם `aria-live="polite"`, וקורא המסך מקריא אותה כשהוא מסיים את מה שהוא אומר. בטסט, אחרי לחיצה על "Remove Tea", הפוקוס על "Cart (2)" והאלמנט מכיל את `Tea removed from cart`.

אותו עיקרון חל על ניווט: אחרי מעבר עמוד כדאי להעביר פוקוס לכותרת העמוד החדש, והמדריך הרשמי מראה איך לעשות את זה עם `NavigationEnd` של הראוטר.

## ‏Angular Aria

ווידג'ט כמו listbox,‏ tabs או menu דורש הרבה יותר: חצים במקלדת, חיפוש לפי הקלדה, `aria-selected`, ‏`aria-activedescendant`, תמיכה ב-RTL. ‏[Angular Aria](https://angular.dev/guide/aria/overview) הוא אוסף דירקטיבות headless שמממשות את דפוסי WAI-ARIA: הן מטפלות במקלדת, ב-ARIA ובפוקוס, ואתם כותבים את ה-HTML וה-CSS. לפי [עמוד גרסה 22](https://angular.dev/events/v22) החבילה יציבה מגרסה זו.

```bash
npm install @angular/aria @angular/cdk
```

הדפוסים: Accordion,‏ Autocomplete,‏ Combobox,‏ Grid,‏ Listbox,‏ Menu,‏ Menubar,‏ Multiselect,‏ Select,‏ Tabs,‏ Toolbar ו-Tree. כל אחד מיובא מנתיב משלו, למשל [listbox](https://angular.dev/guide/aria/listbox):

```typescript
import { Component, signal } from '@angular/core';
import { Listbox, Option } from '@angular/aria/listbox';

@Component({
  selector: 'app-size-picker',
  imports: [Listbox, Option],
  template: `
    <span id="size-label">Size</span>
    <ul ngListbox aria-labelledby="size-label" [(value)]="size">
      @for (s of sizes; track s) {
        <li ngOption [value]="s">{{ s }}</li>
      }
    </ul>
    <p>Selected: {{ size().join(', ') }}</p>
  `,
  styles: `
    [ngOption][aria-selected='true'] { font-weight: bold; }
    [ngOption]:focus-visible { outline: 2px solid; }
  `,
})
export class SizePicker {
  protected readonly sizes = ['S', 'M', 'L', 'XL'];
  protected readonly size = signal(['M']);
}
```

ה-HTML שהדירקטיבות מייצרות (מקוצר):

```text
<ul role="listbox" aria-labelledby="size-label" tabindex="-1" aria-orientation="vertical" aria-multiselectable="false">
<li role="option" tabindex="-1" aria-selected="false">
<li role="option" tabindex="0" aria-selected="true">
```

- ‏`value` הוא מערך גם בבחירה בודדת, ו-`[(value)]` מחבר אותו ל-signal (מנגנון `model()`, כמו בפוסט על [outputs ו-model](he/posts/angular-outputs-model/)).
- רק האפשרות הפעילה מקבלת `tabindex="0"` (roving tabindex), כך ש-Tab נכנס לרשימה ויוצא ממנה בלחיצה אחת.
- ברירת המחדל היא `selectionMode="follow"`: חץ למטה מ-M בחר את L. עם `selectionMode="explicit"` החצים רק מזיזים פוקוס, ו-Space או Enter בוחרים. ‏`multi` מאפשר בחירה מרובה.
- העיצוב נשען על המאפיינים עצמם (`aria-selected`), כך שאין צורך במחלקות נוספות.

‏Angular Aria מתאים כשצריך עיצוב משלכם. מי שרוצה קומפוננטות מעוצבות מוכנות ישתמש ב-Angular Material, ולטופס פשוט מספיקים `<button>` ו-`<input type="radio">`.

### בגרסאות קודמות

עד Angular 20.2, ‏binding כמו `[aria-label]` נקרא כ-property binding, ולכן בקוד ישן כותבים את מאפייני ה-ARIA עם הקידומת `attr.`. התחביר הזה עדיין עובד:

```html
<button type="button" [attr.aria-expanded]="open()" [attr.aria-label]="label()">…</button>
```

## טעויות נפוצות של מתחילים

- ‏**`<div (click)>` במקום `<button>`.** אין פוקוס, אין מקלדת ואין תפקיד. ‏ARIA לא מוסיף התנהגות, רק מתאר אותה.
- ‏**`aria-label` על אלמנט שכבר יש לו טקסט גלוי.** קורא המסך יקריא את ה-label במקום הטקסט, והשניים מתפצלים עם הזמן.
- **להסתיר עם `display: none` טקסט שמיועד לקורא מסך.** קוראי מסך מדלגים עליו. ה-mixin ‏`cdk.a11y-visually-hidden` של ה-CDK מייצר מחלקה `cdk-visually-hidden` שמסתירה רק מהעין.

## מה הלאה

בפוסט הבא: ה-CDK, ‏Component Dev Kit: ‏Overlay, גרירה ושחרור ו-`cdkTrapFocus`.
