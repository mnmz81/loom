---
title: "מעבר ל-zoneless באפליקציית Angular קיימת, צעד אחר צעד"
summary: "מעבר אמיתי של אפליקציה מ-Zone.js ל-zoneless: טסטים zoneless קודם, ‏signals במקום שדות רגילים, ‏afterNextRender במקום onStable, הסרת zone.js מ-angular.json, והשוואת גודל ה-build."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 26 }
---

אפליקציה שעדיין רצה על Zone.js היא בדרך כלל אפליקציה שנוצרה לפני גרסה 21, או ששודרגה עם `ng update` (המיגרציה של גרסה 21 מוסיפה לה `provideZoneChangeDetection`, כמו שמוסבר [בפוסט על Zone.js](he/posts/angular-zone-js/)). הפוסט הזה מעביר אפליקציה קטנה כזו ל-zoneless, לפי [מדריך ה-zoneless](https://angular.dev/guide/zoneless), ומראה את הפלט האמיתי של כל שלב.

כל דוגמה נבדקה עם Angular 22.2, ‏zone.js 0.16 ו-Vitest 5.

## נקודת ההתחלה

האפליקציה מוגדרת כמו בפוסט על Zone.js: ‏`provideZoneChangeDetection({ eventCoalescing: ‏true })` ב-`app.config.ts` ו-`"polyfills": ‏["zone.js"]` ב-`angular.json`. יש בה קומפוננטה אחת שתלויה ב-Zone.js בשתי דרכים:

```typescript
import { ChangeDetectionStrategy, Component, ElementRef, NgZone, inject, viewChild } from '@angular/core';
import { take } from 'rxjs';

@Component({
  selector: 'app-inbox',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <input #search placeholder="Search" />
    <p>Unread: {{ unread }}</p>
  `,
})
export class Inbox {
  protected unread = 0;
  private readonly search = viewChild.required<ElementRef<HTMLInputElement>>('search');

  constructor() {
    inject(NgZone).onStable.pipe(take(1)).subscribe(() => {
      this.search().nativeElement.focus();
    });
    setTimeout(() => (this.unread = 3), 50);
  }
}
```

- ‏`unread` משתנה בטיימר, ורק הבדיקה האוטומטית של Zone.js מציגה אותו.
- הפוקוס על שדה החיפוש מחכה ל-`onStable`, שלא פולט בלי Zone.js.

## שלב 1: טסטים zoneless

לפני שנוגעים באפליקציה, מריצים את הטסטים בלי zone. ‏TestBed אמור להיות [zoneless כברירת מחדל](https://angular.dev/guide/zoneless#using-zoneless-in-testbed), אבל בהרצה הזו, כש-zone.js עוד היה טעון והטסט לא הגדיר provider, הקומפוננטה עדיין התעדכנה אחרי הטיימר. רק `provideZonelessChangeDetection()` מפורש, שהתיעוד מתאר כאופציונלי, הפך את הטסט ל-zoneless באמת:

```typescript
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Inbox } from './inbox';

it('shows unread count and focuses search', async () => {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(Inbox);
  await new Promise((r) => setTimeout(r, 100));
  await fixture.whenStable();

  const el: HTMLElement = fixture.nativeElement;
  expect(el.querySelector('p')!.textContent).toBe('Unread: 3');
  expect(document.activeElement).toBe(el.querySelector('input'));
});
```

הטסט נכשל, כמו שצריך (הפלט מקוצר):

```text
 FAIL  |ng-template| src/app/inbox.spec.ts > shows unread count and focuses search
AssertionError: expected 'Unread: 0' to be 'Unread: 3' // Object.is equality
 ❯ src/app/inbox.spec.ts:12:46
 ❯ _ZoneDelegate.invoke node_modules/zone.js/fesm2015/zone.js:356:158
 ❯ _ZoneImpl.run node_modules/zone.js/fesm2015/zone.js:125:35
```

גם ה-stack trace מדגים את אחת הסיבות לעזוב את Zone.js: רוב הפריימים בו שייכים ל-zone.js.

## שלב 2: לתקן את הקומפוננטה

```typescript
import { Component, ElementRef, afterNextRender, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-inbox',
  template: `
    <input #search placeholder="Search" />
    <p>Unread: {{ unread() }}</p>
  `,
})
export class Inbox {
  protected readonly unread = signal(0);
  private readonly search = viewChild.required<ElementRef<HTMLInputElement>>('search');

  constructor() {
    afterNextRender(() => this.search().nativeElement.focus());
    setTimeout(() => this.unread.set(3), 50);
  }
}
```

- ‏`unread` הפך ל-[signal](he/posts/angular-signals/), והעדכון שלו מתזמן בדיקה בלי קשר ל-zone. כשאי אפשר להחליף שדה ב-signal, ‏`markForCheck` אחרי ההשמה עושה את אותה עבודה.
- ‏`onStable` הוחלף ב-[`afterNextRender`](https://angular.dev/api/core/afterNextRender), שרץ פעם אחת אחרי הרינדור הבא.
- ‏`Eager` נמחק: הקומפוננטה מודיעה על כל שינוי בעצמה, ולכן OnPush מספיק.

עכשיו הטסט עובר, עם ה-provider ובלעדיו.

## שלב 3: להוציא את Zone.js

‏1. מוחקים את `provideZoneChangeDetection` מ-`app.config.ts`. מגרסה 21 zoneless היא ברירת המחדל, ואין מה להוסיף. בגרסה 20 מחליפים אותו ב-`provideZonelessChangeDetection()`.
‏2. מוחקים את `"zone.js"` מ-`polyfills` ב-`angular.json`. בפרויקט עם Karma מוחקים גם את `zone.js` ו-`zone.js/testing` מה-target של `test`, ובפרויקט עם `polyfills.ts` את שורות ה-import שלהם. ה-builder של Vitest לוקח את ה-polyfills מה-target של `build`.
‏3. מסירים את החבילה:

```bash
npm uninstall zone.js
```

‏`ng build` לפני ואחרי:

```text
Initial chunk files   | Names         |  Raw size | Estimated transfer size
main-2E3XIAPI.js      | main          | 202.50 kB |                54.89 kB
polyfills-LVNOU2XZ.js | polyfills     |  35.88 kB |                11.64 kB
styles-5INURTSO.css   | styles        |   0 bytes |                 0 bytes

                      | Initial total | 238.38 kB |                66.53 kB

Initial chunk files | Names         |  Raw size | Estimated transfer size
main-434R6XQB.js    | main          | 201.93 kB |                55.01 kB
styles-5INURTSO.css | styles        |   0 bytes |                 0 bytes

                    | Initial total | 201.93 kB |                55.01 kB
```

קובץ ה-polyfills נעלם, וחבילת ההתחלה ירדה ב-36 kB גולמיים (כ-11.5 kB בהעברה). באפליקציה הזו zone.js היה ה-polyfill היחיד.

## שלב 4: לחפש את מה שנשאר

באפליקציה אמיתית יש יותר משתי קומפוננטות. החיפוש הזה מוצא את השימושים הישירים ב-zone (כאן, על הקבצים מנקודת ההתחלה):

```bash
grep -rnE "onStable|onMicrotaskEmpty|onUnstable|isStable|provideZoneChangeDetection|zone\.js" src/
```

```text
src/app/inbox.ts:17:    inject(NgZone).onStable.pipe(take(1)).subscribe(() => {
src/app/app.config.ts:1:import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
src/app/app.config.ts:8:    provideZoneChangeDetection({ eventCoalescing: true }),
```

השינויים השקטים, שדה רגיל שמשתנה ב-`subscribe` או בטיימר, לא נמצאים ב-grep. בשבילם יש טסטים zoneless, ו-[בדיקה מקיפה בזמן פיתוח](he/posts/angular-reactivity-model/). שני מקומות נוספים לבדוק: תבניות שתלויות ב-[טפסים ריאקטיביים](https://angular.dev/guide/zoneless#reactive-forms-in-zoneless-applications), ועבודה אסינכרונית ב-SSR שצריכה [`PendingTasks`](he/posts/angular-zoneless/).

## טעויות נפוצות של מתחילים

- ‏**להסיר את zone.js מ-`polyfills` לפני שהטסטים עוברים zoneless.** האפליקציה תיבנה, אבל קומפוננטות יפסיקו להתעדכן בלי שום שגיאה.
- ‏**לפזר `markForCheck` בכל מקום במקום signals.** זה עובד, אבל signal מתקן גם את התבנית וגם את OnPush בבת אחת.
- ‏**למחוק קריאות ל-`runOutsideAngular`.** הן [תואמות zoneless](https://angular.dev/guide/zoneless#remove-ngzoneonmicrotaskempty-ngzoneonunstable-ngzoneisstable-or-ngzoneonstable), ואין צורך לגעת בהן.

## מה הלאה

בפוסט הבא: איך signals, ‏OnPush ו-zoneless עובדים יחד, ורשימת בדיקה למקרה שהמסך לא מתעדכן.
