---
title: "עיצוב קומפוננטות: encapsulation, ‏:host ו-[class]"
summary: "איך העיצוב של קומפוננטה נשאר בתוכה: view encapsulation (Emulated, ‏None, ‏ShadowDom), ‏:host, ‏host bindings, ‏[class] ו-[style]. ובגרסאות קודמות: ‏ngClass, ‏ngStyle ו-::ng-deep."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 9 }
---

[עיצוב של קומפוננטה](https://angular.dev/guide/components/styling) נכתב בשדה `styles` (או `styleUrl`) והוא חל רק על התבנית שלה. הקומפוננטות הבאות מראות איך זה עובד, ואיך מעצבים את האלמנט שעוטף את הקומפוננטה:

```typescript
// styling.ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  host: { '[class.active]': 'active()' },
  template: `<p [class.highlight]="active()" [style.font-size.px]="size()">Card text</p>`,
  styles: `
    :host {
      display: block;
      border: 1px solid gray;
    }
    :host(.active) {
      border-color: green;
    }
    p {
      color: red;
    }
    .highlight {
      font-weight: bold;
    }
  `,
})
export class Card {
  readonly active = input(false);
  readonly size = input(16);
}

@Component({
  selector: 'app-page',
  imports: [Card],
  template: `
    <p>Page text</p>
    <app-card [active]="true" [size]="20" />
    <app-card [class]="{ wide: true, dark: false }" />
  `,
})
export class Page {}
```

כל דוגמה נבדקה עם Angular 22.2 בבדיקת Vitest שקוראת את הסגנונות המחושבים (`getComputedStyle`) ב-jsdom.

## עיצוב שלא דולף

הכלל `p { color: red; }` ב-`Card` צובע רק את ה-`<p>` של `Card`. הפסקה `Page text` בקומפוננטה `Page` נשארת שחורה (`rgb(0, 0, 0)`), והפסקה בתוך `Card` אדומה. כך נראים האלמנטים ב-DOM בבדיקה (השמות המדויקים של ה-attributes משתנים בין קומפוננטות ובין אפליקציות):

```html
<app-card _nghost-a-c2253586371 class="active">
  <p _ngcontent-a-c2253586371 style="font-size: 20px;" class="highlight">Card text</p>
</app-card>
```

זה ה-view encapsulation שנקרא `Emulated`, ברירת המחדל. ‏Angular מוסיף attribute ייחודי לכל אלמנט בתבנית של הקומפוננטה (`_ngcontent-…`) ולאלמנט המארח (`_nghost-…`), וכותב מחדש את הכללים כך שיכללו אותו: `p` הופך ל-`p[_ngcontent-…]`. העיצוב לא דולף החוצה, אבל עיצוב גלובלי מבחוץ עדיין יכול להשפיע פנימה. הקומפוננטה `Page` בלי `styles` לא קיבלה attributes בכלל.

## ‏:host ואלמנט המארח

האלמנט `<app-card>` עצמו נקרא [host element](https://angular.dev/guide/components/host-elements). ‏`:host` מעצב אותו מתוך הקומפוננטה: למעלה `display: block` וגבול אפור (אלמנט מותאם הוא `inline` כברירת מחדל). ‏`:host(.active)` תופס אותו רק כשיש לו את המחלקה `active`, והגבול נהיה ירוק.

המחלקה מגיעה מ-`host: { '[class.active]': 'active()' }`, [binding על האלמנט המארח](https://angular.dev/guide/components/host-elements) שנכתב בהגדרת הקומפוננטה ולא בתבנית. בהגדרה הזו אפשר לקשור גם attributes, ‏`[style.x]` ואירועים (`'(keydown)': '...'`).

## ‏[class] ו-[style]

מבחוץ אפשר לקשור מחלקות ל-`<app-card>` כמו לכל אלמנט. ‏`[class]="{ wide: true, dark: false }"` מקבל אובייקט, ושם מחלקה מופיע באלמנט רק כשהערך אמת, ולכן האלמנט קיבל `class="wide"`. ‏[התיעוד](https://angular.dev/guide/templates/binding) מפרט שלושה סוגי ערך ל-`[class]`: מחרוזת של מחלקות, מערך של מחלקות או אובייקט. ‏`[style]` מקבל מחרוזת של הצהרות (`"display: flex; padding: 8px"`) או אובייקט. אפשר לשלב: מחלקות סטטיות, ‏`[class]` ו-`[class.x]` על אותו אלמנט מתאחדים, בלי סדר מובטח.

בשני סוגי האובייקט ההשוואה היא `===`, ולכן כדי שהשינוי יתקבל צריך ליצור אובייקט או מערך חדש ולא לשנות את הקיים.

## מצבי encapsulation

בוחרים בשדה `encapsulation` של `@Component`:

```typescript
import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-global',
  encapsulation: ViewEncapsulation.None,
  template: `<p>None</p>`,
  styles: `
    p {
      color: blue;
    }
  `,
})
export class Global {}
```

- **‏`Emulated`** (ברירת מחדל): מה שראינו למעלה.
- **‏`None`**: אין הגנה, והעיצוב הופך לגלובלי. בבדיקה, אחרי רינדור של `Global` לצד `Page`, ה-`Page text` נצבע כחול. ה-`<p>` בתוך `Card` נשאר אדום, כי הכלל שלו ספציפי יותר בזכות ה-attribute.
- **‏`ShadowDom`**: מצמיד shadow root לאלמנט המארח ומרנדר בו את התבנית והעיצוב, כך שה[עיצוב שלה לא יוצא החוצה](https://angular.dev/guide/components/styling). בבדיקה ה-`<p>` וה-`<style>` נמצאו ב-`shadowRoot`. יש לזה השפעה גם על אירועים ועל `<slot>`, ולכן שומרים אותו למקרים שצריכים אותו באמת.
- **‏`ExperimentalIsolatedShadowDom`**: כמו `ShadowDom`, אבל מבטיח שרק העיצוב של הקומפוננטה חל בתוכה. לא ניסיתי אותו.

כללים גלובליים שייכים ל-`src/styles.css`, וה-CLI מצרף אותו לכל האפליקציה.

### בגרסאות קודמות

קוד ישן מעצב בכמה דרכים נוספות. ‏`ngClass` ו-`ngStyle` הם directives מ-`@angular/common` שמקבלים אובייקט:

```typescript
import { Component } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';

@Component({
  selector: 'app-old',
  imports: [NgClass, NgStyle],
  template: `<p [ngClass]="{ done: true, late: false }" [ngStyle]="{ 'font-size.px': 18 }">old</p>`,
})
export class Old {}
```

בדקתי: זה עובד ב-22.2, והתוצאה `class="done"` ו-`font-size: 18px`. ‏[התיעוד של ה-API](https://angular.dev/api/common/NgClass) מסמן את `NgClass` ו-`NgStyle` כ-stable ולא כ-deprecated. כש-`[class]` ו-`[style]` מקבלים אובייקטים, לרוב אין בהם צורך. התיעוד מציין שני מקרים שבהם עדיין משתמשים ב-`ngClass`: מפתח עם כמה שמות מחלקות מופרדי רווח, ושינוי של אובייקט במקום.

לשינוי עיצוב של קומפוננטת ילד מבחוץ יש `::ng-deep` (למשל `:host ::ng-deep p`), שמבטל את ה-encapsulation מנקודה מסוימת בסלקטור. ‏[התיעוד](https://angular.dev/guide/components/styling) ממליץ בחום לא להשתמש בו בקוד חדש, ואומר שהוא קיים רק לתאימות לאחור. הדרך המומלצת היא להעביר ערכים לקומפוננטה עם inputs, או עם משתני CSS (`--card-color`), שעוברים בירושה מהאב לילדים.

ולפני `host` בהגדרה, אותו דבר נכתב עם הדקורטורים `@HostBinding('class.active')` ו-`@HostListener`, שנמצאים גם הם ב[תיעוד](https://angular.dev/guide/components/host-elements).

## טעויות נפוצות של מתחילים

- **לצפות שכלל בקומפוננטת אב יעצב קומפוננטת ילד.** ה-encapsulation חוסם את זה. מעבירים ערך בקלט, או משתמשים במשתנה CSS.
- **לשכוח `display: block` ב-`:host`.** אלמנט מותאם הוא `inline`, ו-`width`, ‏`height` ו-margin אנכי לא יעבדו בלי זה.
- **‏`ViewEncapsulation.None` כדי "שהעיצוב כבר יעבוד".** העיצוב נהיה גלובלי ודולף לכל האפליקציה. מגדירים עיצוב משותף ב-`src/styles.css`.

## מה הלאה

בפוסט הבא: ה-pipes המובנים, ‏`date`, ‏`currency` ועוד, ואיך כותבים pipe משלכם.
