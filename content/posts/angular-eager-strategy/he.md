---
title: "ChangeDetectionStrategy.Eager: אסטרטגיית ברירת המחדל הישנה"
summary: "‏Eager, שנקראה Default עד גרסה 22, בודקת קומפוננטה בכל פעם שבדיקה מגיעה אליה. מה ההבדל מ-OnPush בעץ אמיתי, מתי עדיין צריך אותה, ולמה Default מסומן כ-deprecated."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 22 }
---

לכל קומפוננטה יש אסטרטגיית change detection, שקובעת מתי היא נבדקת כשבדיקה עוברת בעץ. עד גרסה 21 ברירת המחדל נקראה `Default`. בגרסה 22 קוראים לה `Eager`, והיא כבר לא ברירת המחדל.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest 5.

## שני ערכים ושם ישן

לפי [ה-API](https://angular.dev/api/core/ChangeDetectionStrategy), ל-`ChangeDetectionStrategy` יש היום שלושה שמות:

| ערך | משמעות |
|---|---|
| ‏`OnPush` | ברירת המחדל מגרסה 22. נבדקת רק במקרים מסוימים: ‏input חדש, אירוע, ‏signal, ‏`markForCheck` |
| ‏`Eager` | נבדקת בכל פעם שבדיקה מגיעה אליה |
| ‏`Default` | ‏deprecated. שווה ל-`Eager` ו"עתיד להימחק" |

‏`Eager` נוסף כשם חלופי ל-`Default` בגרסה 21.2 ([changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#2120-2026-02-25)). גם `ng generate component` מכיר רק את שני הראשונים: ‏`--change-detection` מקבל `Eager` או `OnPush`, וברירת המחדל היא `OnPush`.

## ‏Eager מול OnPush באותו עץ

שתי קומפוננטות זהות שכל אחת מתעדת בכל פעם שהתבנית שלה מחושבת, ולידן כפתור שמשנה signal בהורה:

```typescript
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

export const checks: string[] = [];

@Component({
  selector: 'app-eager-panel',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `{{ check('eager') }}`,
})
export class EagerPanel {
  check(name: string) {
    checks.push(name);
    return name;
  }
}

@Component({
  selector: 'app-onpush-panel',
  template: `{{ check('onpush') }}`,
})
export class OnPushPanel extends EagerPanel {}

@Component({
  selector: 'app-dashboard',
  imports: [EagerPanel, OnPushPanel],
  template: `
    <button (click)="clicks.set(clicks() + 1)">{{ clicks() }}</button>
    <app-eager-panel />
    <app-onpush-panel />
  `,
})
export class Dashboard {
  protected readonly clicks = signal(0);
}
```

‏`OnPushPanel` יורש את המחלקה אבל לא את הדקורטור, ולכן הוא OnPush, ברירת המחדל. הטסט לוחץ על הכפתור:

```typescript
import { TestBed } from '@angular/core/testing';
import { checks, Dashboard } from './dashboard';

it('checks the Eager panel on every pass', async () => {
  const fixture = TestBed.createComponent(Dashboard);
  await fixture.whenStable();
  console.log('first render:', checks.join(', '));

  checks.length = 0;
  fixture.nativeElement.querySelector('button').click();
  await fixture.whenStable();
  console.log('after click: ', checks.join(', '));
  expect(checks).not.toContain('onpush');
});
```

```text
first render: eager, onpush
after click:  eager
```

הלחיצה סימנה את `Dashboard` לבדיקה. כשהבדיקה הגיעה לילדים, הפאנל ה-Eager חושב מחדש למרות ששום דבר שלו לא השתנה, והפאנל ה-OnPush דולג: לא קיבל input חדש ולא קרה בו אירוע. ‏[התיעוד](https://angular.dev/best-practices/skipping-subtrees#an-event-is-handled-by-a-component-with-eager-change-detection) מתאר בדיוק את זה. בעץ גדול, כל קומפוננטת Eager מחושבת בכל בדיקה שעוברת דרכה, יחד עם כל ה-bindings שלה.

הפונקציה בתבנית כאן נועדה רק להמחשה: היא נקראת בכל פעם שה-view נבדק, ולכן בקוד אמיתי עדיף signal או `computed`.

## מתי Eager עדיין מתאים

- ‏**קוד אחרי `ng update` לגרסה 22.** המיגרציה מוסיפה `Eager` לכל קומפוננטה בלי אסטרטגיה מפורשת, כדי שההתנהגות לא תשתנה. ‏[הפוסט על OnPush כברירת מחדל](he/posts/angular-onpush-default-v22/) מראה את זה.
- ‏**ספרייה שמארחת קומפוננטות של המשתמש** עם `ViewContainerRef.createComponent`. לפי [מדריך ה-zoneless](https://angular.dev/guide/zoneless#onpush-compatible-components), אם הקומפוננטות האלה עשויות להיות Eager, המארחת לא יכולה להיות OnPush.
- ‏**קומפוננטת עזר שקיימת רק בטסטים.** אותו מדריך מתיר לה `Eager`.

‏`Eager` קובע רק *מי* נבדק כשבדיקה כבר רצה. באפליקציה zoneless הוא לא מתזמן בדיקות, ולכן לא מחזיר עדכונים אוטומטיים אחרי `setTimeout`. ‏[הפוסט על zoneless](he/posts/angular-zoneless/) מדגים את זה.

### בגרסאות קודמות

לפני גרסה 22, השמטת `changeDetection` הייתה שווה לזה:

```typescript
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-legacy-widget',
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<p>{{ title }}</p>`,
})
export class LegacyWidget {
  title = 'Old code';
}
```

הקוד הזה עדיין מתקמפל ב-22.2, אבל `Default` מסומן כ-deprecated. ‏`ng update` לגרסה 22 מחליף אותו ב-`ChangeDetectionStrategy.Eager`.

## טעויות נפוצות של מתחילים

- ‏**להוסיף `Eager` כדי "לתקן" קומפוננטה שלא מתעדכנת באפליקציה zoneless.** זה לא עוזר. חסרה הודעה: ‏signal או `markForCheck`.
- ‏**לכתוב `Default` בקוד חדש.** הוא deprecated ועתיד להימחק. כשבאמת צריך את ההתנהגות הזו, כותבים `Eager`.

## מה הלאה

בפוסט הבא: ‏OnPush, אסטרטגיית ברירת המחדל, הכללים שקובעים מתי קומפוננטה נבדקת, ומלכודת ה-mutation.
