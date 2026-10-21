---
title: "הקרנת תוכן: ng-content, ‏select ו-ngProjectAs"
summary: "איך קומפוננטה מקבלת תוכן מבחוץ עם <ng-content>: כמה slots לפי select, תוכן ברירת מחדל, ‏ngProjectAs, ומה חשוב לדעת על תוכן שמוקרן. ובגרסאות קודמות: מה עשו לפני fallback."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 11 }
---

קומפוננטה כמו כרטיס, דיאלוג או רשימה לא יודעת מראש מה יהיה בתוכה. [הקרנת תוכן](https://angular.dev/guide/components/content-projection) (content projection) מאפשרת לה להגדיר מקומות, `<ng-content>`, שבהם יוצג תוכן שהקורא כתב בין התגיות שלה. (ב-[`ng-template`](he/posts/angular-ng-template/) ראינו דרך אחרת להעביר חלקי תבנית.)

```typescript
// projection.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-card',
  template: `
    <header><ng-content select="[card-title]">Untitled</ng-content></header>
    <section><ng-content /></section>
    <footer><ng-content select="app-actions" /></footer>
  `,
})
export class Card {}

@Component({
  selector: 'app-actions',
  template: `<button>OK</button>`,
})
export class Actions {}

@Component({
  selector: 'app-demo',
  imports: [Card, Actions],
  template: `
    <app-card>
      <h2 card-title>Hello</h2>
      <p>Body text</p>
      <app-actions />
    </app-card>

    <app-card>
      <p>Only body</p>
    </app-card>

    <app-card>
      <h3 ngProjectAs="[card-title]">Aliased</h3>
    </app-card>
  `,
})
export class Demo {}
```

כל דוגמה נבדקה עם Angular 22.2 בבדיקת Vitest שקראה את ה-DOM. כך נראה הכרטיס הראשון (התוצאה מקוצרת, בלי הערות ו-attributes של Angular):

```html
<app-card>
  <header><h2 card-title>Hello</h2></header>
  <section><p>Body text</p></section>
  <footer><app-actions><button>OK</button></app-actions></footer>
</app-card>
```

## ‏slot אחד ו-select

כל מה שנכתב בין `<app-card>` ל-`</app-card>` הוא ה"תוכן" של הקומפוננטה, להבדיל מה"תצוגה" שלה, שהיא התבנית. ‏`<ng-content />` בלי `select` תופס את כל התוכן שלא התאים ל-slot אחר, ולכן ה-`<p>` הגיע ל-`<section>`. עם `select` הוא תופס רק מה שמתאים לסלקטור CSS, ו[אותם סלקטורים](https://angular.dev/guide/components/content-projection) נתמכים כמו ב-`selector` של קומפוננטה: תגית (`app-actions`), attribute (`[card-title]`) או מחלקה. ה-`<h2 card-title>` הגיע ל-`<header>`, ו-`<app-actions>` ל-`<footer>`.

אלמנט שלא תואם אף slot, ואין `<ng-content />` ללא `select`, פשוט לא נכנס ל-DOM. בבדיקה, קומפוננטה עם `<ng-content select="[card-title]" />` בלבד קיבלה `<h2 card-title>` ו-`<p>`, והוצגה רק הכותרת. ה-`<p>` נעלם בלי שגיאה.

## תוכן ברירת מחדל

הטקסט שבתוך `<ng-content select="[card-title]">Untitled</ng-content>` מוצג כשלא הגיע תוכן שמתאים. בכרטיס השני, שאין לו כותרת, מוצג `<header>Untitled</header>`. בכרטיס הראשון הכותרת `Hello` מחליפה אותו.

כך כתוב ב[מדריך](https://angular.dev/guide/components/content-projection), וב-[changelog של Angular](https://github.com/angular/angular/blob/main/CHANGELOG.md) התכונה מופיעה לראשונה בגרסה 18.0.0.

## ‏ngProjectAs

לפעמים האלמנט שרוצים להקרין לא מתאים לסלקטור, כמו `<h3>` שאין לו `card-title`. ‏`ngProjectAs="[card-title]"` אומר ל-Angular להשוות לסלקטור הזה במקום לזהות האמיתית של האלמנט, והכותרת מוקרנת ל-`<header>`. הערך חייב להיות סטטי, ואי אפשר לקשור אותו לביטוי. (שימו לב שה-attribute נשאר ב-DOM כ-`ngprojectas`, כפי שנראה בבדיקה.)

## ‏תוכן מוקרן שייך לאב

התוכן מוצג בתוך הקומפוננטה שמקבלת אותו, אבל [הוא נשאר בבעלות הקומפוננטה שכתבה אותו](https://angular.dev/guide/components/content-projection). שתי תוצאות:

- **ה-change detection וההזרקות שלו שייכים לאב.** גם אם הקומפוננטה המקבלת היא OnPush, התוכן המוקרן נבדק כשהאב נבדק, והוא מקבל תלויות מה-injector של האב.
- **‏`<ng-content>` לא מותנה.** ‏`@if (show()) { <ng-content /> }` רק מסתיר את התוכן. ‏Angular יוצר את האלמנטים והקומפוננטות המוקרנות בכל מקרה: בבדיקה, קומפוננטה מוקרנת נוצרה למרות ש-`show()` היה `false`. כדי לדחות יצירה, משתמשים ב-[`ng-template`](he/posts/angular-ng-template/).

תוכן מוקרן לא מתאים לכל קומפוננטה של ספרייה. התיעוד מזהיר שקומפוננטות כמו תפריטים וטאבים מוצאות את הילדים שלהן ישירות, ועטיפה נוספת עלולה לשבור ניווט מקלדת ו-ARIA.

### בגרסאות קודמות

לפני גרסה 18 ל-`<ng-content>` לא היה תוכן ברירת מחדל, ולכן "ברירת מחדל" נכתבה בקוד: ‏query על התוכן שהגיע ו-`@if` לידו. כך זה נראה עם הדקורטור `@ContentChild` (היום מקובל `contentChild()` כ-signal, ברמה 2):

```typescript
import { Component, ContentChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-old-card',
  template: `
    <header>
      <ng-content select="[card-title]" />
      @if (!title) {
        Untitled
      }
    </header>
  `,
})
export class OldCard {
  @ContentChild('title') protected title?: ElementRef;
}

@Component({
  selector: 'app-old-demo',
  imports: [OldCard],
  template: `
    <app-old-card><h2 card-title #title>Hello</h2></app-old-card>
    <app-old-card />
  `,
})
export class OldDemo {}
```

הקורא היה חייב להוסיף `#title` לאלמנט שלו כדי שה-query ימצא אותו. הבדיקה הציגה `Hello` ו-`Untitled`. עם fallback הכול מצטמצם לטקסט בתוך `<ng-content>`.

## טעויות נפוצות של מתחילים

- **להקרין תוכן שלא תואם אף slot.** הוא נעלם בשקט. מוסיפים `<ng-content />` ללא `select` או `ngProjectAs`.
- **לעטוף `<ng-content>` ב-`@if` כדי "לא ליצור" את התוכן.** הוא נוצר בכל מקרה.
- **לנסות לקשור `ngProjectAs` לביטוי.** הערך חייב להיות מחרוזת סטטית.

## מה הלאה

מכאן עוברים מרמה 1 לרמה 2: ה-signals. בפוסט הבא, `angular-signals`: איך `signal()` ו-`computed()` מחזיקים מצב ש-Angular יודע מתי השתנה.
