---
title: "Zone.js: איך Angular ידע פעם שמשהו השתנה"
summary: "איך Zone.js עוטף את ה-APIs האסינכרוניים של הדפדפן כדי ש-Angular יבדוק את העץ אחרי כל אירוע, מה עושים NgZone ו-runOutsideAngular, ואיך מפעילים אותו ב-Angular 22."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 21 }
---

עד גרסה 20, כל אפליקציית Angular חדשה טענה את Zone.js. מגרסה 21 [ברירת המחדל היא zoneless](https://angular.dev/guide/zoneless), אבל הרבה אפליקציות קיימות עדיין רצות עליו, וכדאי להבין מה הוא עושה לפני שמוציאים אותו.

כל דוגמה נבדקה עם Angular 22.2, ‏zone.js 0.16 ו-Vitest 5.

## מה Zone.js עושה

‏Zone.js עוטף (monkey-patching) את ה-APIs האסינכרוניים של הדפדפן: אירועי DOM, ‏`setTimeout`, ‏promises, בקשות רשת. ‏Angular מריץ את האפליקציה בתוך zone משלו, "ה-Angular zone", ולכן כל callback שנרשם מתוכה רץ דרך Zone.js:

‏1. משהו אסינכרוני קורה: לחיצה, טיימר, תשובה מהשרת.
‏2. ה-callback רץ בתוך ה-Angular zone.
‏3. כשתור המשימות של ה-zone מתרוקן, ‏[`NgZone`](https://angular.dev/api/core/NgZone) פולט `onMicrotaskEmpty`.
‏4. ‏Angular מריץ change detection מהשורש.

לפי [התיעוד](https://angular.dev/guide/zoneless#why-use-zoneless), ל-Zone.js אין שום מידע על השאלה אם המצב באמת השתנה, ולכן הבדיקה רצה יותר פעמים ממה שצריך.

## להפעיל את Zone.js ב-Angular 22

אפליקציה שצריכה Zone.js מתקינה את החבילה (`npm install zone.js`), מוסיפה את ה-provider ב-`app.config.ts`:

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true })],
};
```

וטוענת אותו ב-`polyfills` של `angular.json`:

```json
"build": {
  "builder": "@angular/build:application",
  "options": {
    "browser": "src/main.ts",
    "polyfills": ["zone.js"]
  }
}
```

‏[`provideZoneChangeDetection`](https://angular.dev/api/core/provideZoneChangeDetection) מגדיר change detection מבוסס `NgZone`. ‏`eventCoalescing` מאחד כמה אירועים לבדיקה אחת. אפליקציה ששודרגה מגרסה 20 עם `ng update` קיבלה את ה-provider הזה אוטומטית: לפי [ה-changelog של גרסה 21](https://github.com/angular/angular/blob/main/CHANGELOG.md#2100-2025-11-19), מיגרציה מוסיפה אותו.

## בתוך ומחוץ ל-Angular zone

שני טיימרים, אחד רגיל ואחד שנרשם בתוך `runOutsideAngular`:

```typescript
import { ChangeDetectionStrategy, Component, NgZone, inject } from '@angular/core';

@Component({
  selector: 'app-poller',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<p>Inside: {{ inside }} | Outside: {{ outside }}</p>`,
})
export class Poller {
  protected inside = 0;
  protected outside = 0;
  private readonly zone = inject(NgZone);

  constructor() {
    setTimeout(() => {
      this.inside++;
      console.log('inside, in Angular zone:', NgZone.isInAngularZone());
    }, 50);

    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        this.outside++;
        console.log('outside, in Angular zone:', NgZone.isInAngularZone());
      }, 100);
    });
  }
}
```

‏TestBed הוא zoneless כברירת מחדל גם כש-zone.js טעון, ולכן הטסט מוסיף את ה-provider:

```typescript
import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Poller } from './poller';

it('Zone.js triggers a check after setTimeout', async () => {
  TestBed.configureTestingModule({ providers: [provideZoneChangeDetection()] });
  const fixture = TestBed.createComponent(Poller);
  fixture.autoDetectChanges();
  await new Promise((r) => setTimeout(r, 200));
  console.log(fixture.nativeElement.textContent);
  expect(fixture.nativeElement.textContent).toBe('Inside: 1 | Outside: 0');
});
```

```text
inside, in Angular zone: true
outside, in Angular zone: false
Inside: 1 | Outside: 0
```

אף שורה בקוד לא ביקשה לרנדר, ובכל זאת `inside` הופיע: ‏Zone.js ראה שהטיימר הסתיים ו-Angular בדק את העץ. ‏`outside` השתנה מחוץ ל-zone, ולכן אף בדיקה לא רצה אחריו והמסך נשאר על 0. ‏`runOutsideAngular` נועד לעבודה שלא צריכה לעדכן את המסך, כמו polling או ספרייה חיצונית שמאזינה להרבה אירועים ([zone pollution](https://angular.dev/best-practices/zone-pollution)). ‏`zone.run(() => ...)` מחזיר קוד לתוך ה-zone.

ה-`Eager` בקומפוננטה לא מקרי: מגרסה 22 ברירת המחדל היא OnPush, ו-OnPush מדלג על קומפוננטה ששדה רגיל השתנה בה גם כש-Zone.js מריץ בדיקה. ההסבר המלא [בפוסט על OnPush כברירת מחדל](he/posts/angular-onpush-default-v22/).

## למה Angular עזב את Zone.js

‏[התיעוד](https://angular.dev/guide/zoneless#why-use-zoneless) מונה ארבע סיבות:

- ‏**ביצועים:** בדיקה אחרי כל אירוע, גם כשלא השתנה כלום.
- ‏**Core Web Vitals:** ‏Zone.js מוסיף משקל לחבילה וזמן לעלייה.
- ‏**דיבוג:** ה-stack traces מלאים בפריימים של Zone.js, וקשה להבין למה קוד שרץ מחוץ ל-zone לא מעדכן את המסך.
- ‏**תאימות:** לא כל API חדש בדפדפן עטוף, ו-`async`/`await` אי אפשר לעטוף בכלל, ולכן צריך להמיר אותו לקוד ישן יותר בזמן build.

### בגרסאות קודמות

ב-`angular.json` שיצר `ng new` בגרסה 20, ‏Zone.js נטען גם באפליקציה וגם בטסטים (Karma):

```json
"test": {
  "builder": "@angular/build:karma",
  "options": {
    "polyfills": ["zone.js", "zone.js/testing"],
    "tsConfig": "tsconfig.spec.json"
  }
}
```

וב-`app.config.ts` שלו הופיע `provideZoneChangeDetection({ eventCoalescing: ‏true })`, בדיוק כמו בדוגמה למעלה.

## טעויות נפוצות של מתחילים

- ‏**לעדכן שדה מתוך `runOutsideAngular` ולצפות שהמסך יתעדכן.** צריך `zone.run`, או signal.
- ‏**לחשוב ש-`provideZoneChangeDetection` מחזיר את ההתנהגות הישנה במלואה.** הוא מחזיר את הבדיקות האוטומטיות, אבל קומפוננטת OnPush עדיין לא תיבדק בלי הודעה.
- ‏**למחוק קריאות ל-`runOutsideAngular` במעבר ל-zoneless.** [התיעוד](https://angular.dev/guide/zoneless#remove-ngzoneonmicrotaskempty-ngzoneonunstable-ngzoneisstable-or-ngzoneonstable) אומר שהן תואמות zoneless, ושמחיקתן בספרייה עלולה לפגוע בביצועים של אפליקציות שעדיין משתמשות ב-Zone.js.

## מה הלאה

בפוסט הבא: האסטרטגיה `Eager`, שנקראה `Default` עד גרסה 22, ובודקת קומפוננטה בכל פעם שבדיקה מגיעה אליה.
