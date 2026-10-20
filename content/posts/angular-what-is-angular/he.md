---
title: "מה זה Angular, ובמה הוא שונה מ-AngularJS?"
summary: "מה זה Angular, מה מגיע איתו, במה הוא שונה מ-AngularJS, ואיך הוא השתנה עד גרסה 22: standalone, ‏signals, ‏zoneless ו-OnPush כברירת מחדל."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 1 }
---

Angular הוא פריימוורק של Google לבניית אפליקציות ווב. האתר הרשמי, [angular.dev](https://angular.dev/overview), מתאר אותו כ"פריימוורק ווב שמאפשר למפתחים לבנות אפליקציות מהירות ואמינות". כותבים בה ב-TypeScript ומחלקים את הממשק לקומפוננטות.

כל דוגמה בסדרה הורצה עם Angular 22.2, וכל טענה נבדקה מול התיעוד הרשמי.

## ‏AngularJS ו-Angular הם לא אותו דבר

AngularJS (גרסאות 1.x) יצא ב-2010 ונכתב ב-JavaScript. ב-2016 יצא Angular 2: כתיבה מחדש מאפס ב-TypeScript, בלי תאימות לאחור. מאז השם הוא פשוט Angular, והמספר עולה בכל גרסה ראשית. גרסה 3 דולגה כי חבילת הראוטר כבר הייתה ב-3.x, ולכן אחרי 2 באה 4.

התמיכה ב-AngularJS הסתיימה ב-31 בדצמבר 2021. מדריך שמופיעים בו `ng-controller` או `$scope` שייך ל-AngularJS, ולא לסדרה הזו.

## איך קומפוננטה נראית

קומפוננטה היא מחלקת TypeScript עם הדקורטור `@Component`. ‏`selector` הוא שם התגית ב-HTML, ו-`template` הוא מה שמוצג:

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <button (click)="count.set(count() + 1)">+1</button>
    <p>Clicked {{ count() }} times</p>
    @if (count() >= 3) {
      <p>That's enough clicks.</p>
    }
  `,
})
export class Counter {
  protected readonly count = signal(0);
}
```

`count` הוא signal: ערך ש-Angular יודע מתי השתנה. הלחיצה מעדכנת אותו עם `set`, והתבנית קוראת אותו עם `count()`. ‏`@if` מציג את השורה האחרונה רק מהלחיצה השלישית. לכל אחד מהחלקים האלה יש פוסט משלו בהמשך.

## מה מגיע בקופסה

Angular הוא פריימוורק ולא ספרייה: צוות אחד מתחזק את כל החלקים, והם יוצאים יחד באותה גרסה. ב-React, לעומת זאת, הראוטר והטפסים הם ספריות נפרדות שבוחרים לבד.

| חלק | מה הוא עושה |
|---|---|
| Router | ניווט בין עמודים, טעינה עצלה, הגבלת גישה |
| Forms | טפסים ובדיקת קלט |
| HttpClient | קריאות לשרת |
| Dependency injection | שיתוף שירותים בין קומפוננטות |
| Angular CLI | יצירת פרויקט, הרצה, build ושדרוג (`ng update`) |
| SSR ו-SSG | רינדור בשרת ויצירת עמודים סטטיים מראש |

## איך Angular השתנה

Angular של היום שונה מאוד מ-Angular של 2020, ורוב המדריכים ברשת נכתבו לגרסאות הישנות:

| גרסאות | מה השתנה |
|---|---|
| 2 עד 13 | כל קומפוננטה רשומה ב-`NgModule`, ‏Zone.js מזהה שינויים, ‏`*ngIf` ו-`*ngFor` בתבניות |
| 14 עד 17 | קומפוננטות standalone בלי NgModule, ‏signals ‏(16), ‏`@if` ו-`@for` ‏(17) |
| 18 עד 20 | עבודה בלי Zone.js (zoneless): ניסיוני ב-18, יציב ב-20 |
| 21 עד 22 | zoneless כברירת מחדל (21), ‏OnPush כברירת מחדל ו-Signal Forms יציבים (22) |

השינוי הגדול הוא ב-change detection, הדרך שבה Angular יודע שצריך לעדכן את המסך. פעם Zone.js עטף כל פעולה אסינכרונית (לחיצה, `setTimeout`, קריאת HTTP), ואחרי כל אחת Angular בדק את כל עץ הקומפוננטות. היום [אין Zone.js](https://angular.dev/guide/zoneless): ‏Angular מרנדר כשמשתנה signal שהתבנית קוראת, כשמגיע אירוע שמחובר לתבנית, או כשקוראים ל-`markForCheck`. ובגלל ש-[OnPush הוא ברירת המחדל](https://angular.dev/best-practices/skipping-subtrees), קומפוננטה נבדקת רק כשה-inputs שלה מתחלפים או כשקורה בה אירוע. רמה 3 בסדרה מוקדשת כולה לנושא הזה.

### בגרסאות קודמות

אותו מונה, כפי שנכתב לפני גרסה 17:

```typescript
import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-counter',
  template: `
    <button (click)="count = count + 1">+1</button>
    <p>Clicked {{ count }} times</p>
    <p *ngIf="count >= 3">That's enough clicks.</p>
  `,
})
export class CounterComponent {
  count = 0;
}

@NgModule({
  declarations: [CounterComponent],
  imports: [CommonModule],
})
export class CounterModule {}
```

שלושה הבדלים: ה-NgModule רושם את הקומפוננטה, ‏`count` הוא שדה רגיל ולא signal, ו-`*ngIf` במקום `@if`. ‏`*ngIf` [מסומן כ-deprecated מגרסה 20](https://angular.dev/api/common/NgIf), ומגרסה 19 [קומפוננטות הן standalone כברירת מחדל](https://angular.dev/guide/components), כך שקומפוננטה שנרשמת ב-NgModule צריכה היום `standalone: false`. קוד כזה עדיין נפוץ בפרויקטים קיימים, וסוף הסדרה מראה איך להעביר אותו לסגנון החדש.

## גרסאות ותמיכה

לפי [מדיניות הגרסאות](https://angular.dev/reference/releases), מגרסה 22 יוצאת גרסה ראשית בערך פעם בשנה (לפני כן פעם בחצי שנה). כל גרסה ראשית מקבלת 12 חודשי תמיכה פעילה ועוד 12 חודשי LTS, שבהם יוצאים רק תיקוני אבטחה ובאגים קריטיים. ‏`ng update` מריץ סקריפטים שמעדכנים את הקוד בשדרוג לגרסה ראשית.

Angular 22 [דורש](https://angular.dev/reference/versions) Node.js ‏22.22.3, ‏24.15.0 או 26.0.0 ומעלה, ו-TypeScript 6.0.

## מתי Angular מתאים

הוא מתאים כש:

- האפליקציה גדולה ויש בה הרבה מסכים וטפסים;
- כמה צוותים עובדים על אותו קוד ורוצים מבנה אחיד;
- עדיף שכל הכלים יגיעו ממקור אחד ויתעדכנו יחד.

הוא פחות מתאים לאתר תוכן קטן או לווידג'ט בודד בעמוד, שם פריימוורק שלם הוא יותר ממה שצריך. גם הלמידה בהתחלה ארוכה יותר: TypeScript, ‏dependency injection ו-signals באים יחד.

## טעויות נפוצות של מתחילים

- **ללמוד ממדריך של AngularJS.** ‏`$scope` ו-`ng-app` שייכים לפריימוורק אחר לגמרי.
- **להעתיק קוד ממדריך ישן בלי לבדוק את הגרסה.** ‏NgModule, ‏`*ngIf` ו-Zone.js עדיין עובדים בחלק מהמקרים, אבל זה לא הסגנון של Angular 22. ‏`ng version` מראה את הגרסה בפרויקט.

## מה הלאה

בפוסט הבא: ה-TypeScript שצריך לדעת כדי לכתוב Angular.
