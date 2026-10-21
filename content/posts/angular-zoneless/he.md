---
title: "Angular בלי Zone.js: מה זה zoneless"
summary: "‏zoneless, ברירת המחדל מגרסה 21: מה גורם ל-Angular לרנדר, למה NgZone.onStable לא פולט יותר, ‏PendingTasks ל-SSR, ‏TestBed עם whenStable, ומה עם טפסים ריאקטיביים."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 25 }
---

מגרסה 21, אפליקציה חדשה לא טוענת את Zone.js. ‏Angular כבר לא מנחש מתי משהו השתנה: הוא מרנדר רק כשמודיעים לו. לפי [מדריך ה-zoneless](https://angular.dev/guide/zoneless#enabling-zoneless-in-an-application), אין צורך לעשות כלום כדי להפעיל את זה, רק לוודא ש-`provideZoneChangeDetection` לא מופיע בשום מקום.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest 5.

## מה גורם לרינדור

‏[`provideZonelessChangeDetection`](https://angular.dev/api/core/provideZonelessChangeDetection) מונה את ה-APIs שמתזמנים change detection באפליקציה zoneless:

- ‏`ChangeDetectorRef.markForCheck()`, כולל הקריאה האוטומטית מ-`AsyncPipe`;
- `ComponentRef.setInput()`;
- עדכון signal שהתבנית קוראת;
- הפעלה של listener בתבנית או ב-host;
- חיבור view שסומן כמלוכלך באחת הדרכים האלה, והסרת view;
- רישום render hook, כמו `afterNextRender` (התבנית מתרעננת רק אם ה-hook עושה אחד מהדברים שלמעלה).

זה הכול. ‏`setTimeout`, ‏promise שהסתיים ותשובה מהשרת לא נמצאים ברשימה, אלא אם הקוד שלהם מעדכן signal או קורא ל-`markForCheck`.

## מה כבר לא עובד

קומפוננטה בסגנון הישן: ‏`Eager`, שדה רגיל שמשתנה בטיימר, ומנוי ל-`NgZone.onStable`:

```typescript
import { ChangeDetectionStrategy, Component, NgZone, inject } from '@angular/core';

@Component({
  selector: 'app-clock',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<p>Seconds: {{ seconds }}</p>`,
})
export class Clock {
  protected seconds = 0;
  readonly zone = inject(NgZone);
  stableEvents = 0;

  constructor() {
    this.zone.onStable.subscribe(() => this.stableEvents++);
    setTimeout(() => this.seconds++, 1000);
  }
}
```

הטסט מחכה שהטיימר יסתיים ומדפיס את המסך ואת מצב ה-zone:

```text
Seconds: 0
onStable events: 0 | isStable: true
```

- ‏`seconds` הוא 1 בזיכרון, אבל אף אחד לא הודיע, ולכן המסך על 0. ‏`Eager` לא עוזר: הוא קובע מי נבדק כשבדיקה רצה, לא מתי היא רצה.
- לפי [התיעוד](https://angular.dev/guide/zoneless#remove-ngzoneonmicrotaskempty-ngzoneonunstable-ngzoneisstable-or-ngzoneonstable), ‏`onMicrotaskEmpty`, ‏`onUnstable` ו-`onStable` לא פולטים אף פעם באפליקציה zoneless, ו-`isStable` תמיד `true`. קוד שחיכה ל-`onStable` כדי לפעול אחרי רינדור צריך לעבור ל-[`afterNextRender`](https://angular.dev/api/core/afterNextRender) או ל-`afterEveryRender`.
- ‏`NgZone.run` ו-`runOutsideAngular` ממשיכים לעבוד, ואין צורך למחוק אותם.

## ‏PendingTasks ו-SSR

ב-SSR, ‏Angular מחכה שהאפליקציה תהיה "יציבה" לפני שהוא הופך אותה ל-HTML. פעם Zone.js קבע מתי זה קורה. בלעדיו, עבודה אסינכרונית שצריכה להיכנס ל-HTML נרשמת ב-[`PendingTasks`](https://angular.dev/api/core/PendingTasks):

```typescript
import { Component, PendingTasks, inject, signal } from '@angular/core';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Component({
  selector: 'app-report',
  template: `<p>{{ status() }}</p>`,
})
export class Report {
  protected readonly status = signal('Loading...');
  private readonly tasks = inject(PendingTasks);

  load(tracked: boolean) {
    const work = async () => {
      await delay(50);
      this.status.set('Ready');
    };
    if (tracked) this.tasks.run(work);
    else work();
  }
}
```

אותה יציבות היא מה ש-`fixture.whenStable()` מחכה לה בטסטים, ולכן קל לבדוק את ההבדל:

```typescript
import { TestBed } from '@angular/core/testing';
import { Report } from './report';

for (const tracked of [false, true]) {
  it(`whenStable with tracked=${tracked}`, async () => {
    const fixture = TestBed.createComponent(Report);
    fixture.componentInstance.load(tracked);
    await fixture.whenStable();
    console.log(`tracked=${tracked}:`, fixture.nativeElement.textContent);
    expect(fixture.nativeElement.textContent).toBe(tracked ? 'Ready' : 'Loading...');
  });
}
```

```text
tracked=false: Loading...
tracked=true: Ready
```

בלי `PendingTasks`, היציבות הגיעה מיד, ו-SSR היה שולח "Loading...". ‏`HttpClient` וניווט ב-Router כבר רשומים ב-`PendingTasks` מבפנים, ול-observables יש את `pendingUntilEvent` מ-`@angular/core/rxjs-interop`. ‏SSR מוסבר ב[פוסט על SSR ו-hydration](he/posts/angular-ssr-hydration/).

## טסטים וטפסים

- ‏**TestBed** הוא [zoneless כברירת מחדל](https://angular.dev/guide/zoneless#using-zoneless-in-testbed), גם כש-zone.js טעון. התיעוד ממליץ על `await fixture.whenStable()` במקום `fixture.detectChanges()`, שמריץ בדיקה גם כש-Angular לא היה מתזמן אחת.
- ‏**טפסים ריאקטיביים:** לפי [התיעוד](https://angular.dev/guide/zoneless#reactive-forms-in-zoneless-applications), ‏`setValue`, ‏`patchValue` ו-`FormArray.push` מעדכנים את הטופס ופולטים observables, אבל לא מתזמנים change detection. תבנית שתלויה במצב הטופס צריכה `markForCheck` או signal. ‏[Signal Forms](he/posts/angular-signal-forms/) בנויים על signals מההתחלה.

### בגרסאות קודמות

לפני גרסה 21 צריך היה לבקש zoneless במפורש. בגרסה 20:

```typescript
import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';

bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
});
```

לפי ה-[changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md), ה-provider נוסף כניסיוני בגרסה 18 בשם `provideExperimentalZonelessChangeDetection`, קיבל את השם הנוכחי בגרסה 20.0 והפך ליציב בגרסה 20.2.

## טעויות נפוצות של מתחילים

- ‏**לחכות ל-`NgZone.onStable` בקוד zoneless.** הוא לא יפלוט אף פעם. משתמשים ב-`afterNextRender`.
- ‏**עבודה אסינכרונית ב-SSR בלי `PendingTasks`.** ה-HTML נשלח לפני שהנתונים הגיעו.
- ‏**להוסיף `Eager` בתקווה לעדכונים אוטומטיים.** בלי הודעה אין בדיקה, בלי קשר לאסטרטגיה.

## מה הלאה

בפוסט הבא: מעבר של אפליקציה קיימת מ-Zone.js ל-zoneless, צעד אחר צעד, על אפליקציה אמיתית.
