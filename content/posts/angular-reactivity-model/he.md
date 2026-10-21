---
title: "signals, ‏OnPush ו-zoneless יחד: מודל הריאקטיביות של Angular 22"
summary: "איך signals, ‏OnPush ו-zoneless משתלבים: מי אומר מה השתנה, מי מחליט מתי לבדוק ומה. רשימת בדיקה ל\"המסך לא מתעדכן\", בדיקה מקיפה בזמן פיתוח, ו-Angular DevTools."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 27 }
---

שלושה חלקים מרמה 3 עובדים יחד בכל אפליקציית Angular 22: ‏signals אומרים *מה* השתנה, ה-scheduler של zoneless מחליט *מתי* לבדוק, ו-OnPush מחליט *אילו* קומפוננטות לבדוק. הפוסט הזה מחבר אותם ונותן רשימה מסודרת למקרה שמשהו לא מתעדכן.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest 5.

## שלושה חלקים, זרימה אחת

‏state משותף ב-service, וקומפוננטה שמציגה אותו:

```typescript
import { Component, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartStore {
  readonly count = signal(0);

  syncFromServer() {
    setTimeout(() => this.count.set(3), 50);
  }
}

@Component({
  selector: 'app-cart-badge',
  template: `<span>Cart: {{ store.count() }}</span>`,
})
export class CartBadge {
  protected readonly store = inject(CartStore);
}
```

הטסט קורא ל-`syncFromServer()` מחוץ לקומפוננטה ומחכה:

```text
before: Cart: 0
after:  Cart: 3
```

שום אירוע לא קרה ב-`CartBadge`, ואף input שלה לא השתנה. ובכל זאת:

‏1. ‏`count.set(3)` עדכן signal שהתבנית של `CartBadge` קוראת, ו-Angular סימן את ה-view שלה כמלוכלך.
‏2. ה-scheduler של zoneless תזמן בדיקה, בלי Zone.js ובלי טיימר עטוף.
‏3. הבדיקה הגיעה ל-`CartBadge`, קומפוננטת OnPush מסומנת, ורעננה אותה. קומפוננטות OnPush אחרות שלא סומנו דולגו.

ה-service כתוב עם `@Injectable` ו-`inject()`. שניהם מוסברים בפוסט הבא.

## רשימת בדיקה: "המסך לא מתעדכן"

סדר בדיקה מומלץ:

‏1. ‏**הערך הוא שדה רגיל ששונה מחוץ לאירוע בתבנית** (`setTimeout`, ‏`subscribe`, ‏`then`, ‏listener של ספרייה חיצונית, ‏WebSocket)? הופכים אותו ל-[signal](he/posts/angular-signals/), או קוראים ל-`markForCheck`.
‏2. ‏**אובייקט או מערך שונה במקום**, ב-input או בתוך signal? יוצרים הפניה חדשה. ‏`Object.is` לא רואה שינוי בתוכן ([מלכודת ה-mutation](he/posts/angular-onpush/)).
‏3. ‏**observable מוצג בלי `async`?** מנוי ידני שמעדכן שדה רגיל חוזר לסעיף 1. ‏`async` או `toSignal` פותרים את זה.
‏4. ‏**טופס ריאקטיבי?** ‏`setValue` ו-`patchValue` [לא מתזמנים בדיקה](https://angular.dev/guide/zoneless#reactive-forms-in-zoneless-applications).
‏5. ‏**קוד שמחכה ל-`NgZone.onStable`?** הוא לא פולט באפליקציה zoneless. עוברים ל-`afterNextRender` ([הפוסט על zoneless](he/posts/angular-zoneless/)).
‏6. ‏**הקומפוננטה עשתה `ChangeDetectorRef.detach()`?** ‏view מנותק [לא נבדק](https://angular.dev/api/core/ChangeDetectorRef) עד `reattach()`, גם כשהוא מסומן כמלוכלך.
‏7. ‏**הטסט עובר אבל האפליקציה לא?** אולי `fixture.detectChanges()` מסתיר הודעה שחסרה. מנסים `await fixture.whenStable()`.

## לתפוס עדכונים שקטים בזמן פיתוח

‏[`provideCheckNoChangesConfig`](https://angular.dev/api/core/provideCheckNoChangesConfig) (‏developer preview מגרסה 20) מריץ בדיקה תקופתית על כל ה-views, כאילו כולם `Eager`, ומדווח על binding שהשתנה בלי הודעה:

```typescript
import { ApplicationConfig, isDevMode, provideCheckNoChangesConfig } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    ...(isDevMode() ? [provideCheckNoChangesConfig({ exhaustive: true, interval: 1000 })] : []),
  ],
};
```

עם קומפוננטת `Ticks` מ[הפוסט על OnPush](he/posts/angular-onpush/), כשהיא משנה את `ticks` בלי `markForCheck`, ה-`ErrorHandler` מקבל:

```text
NG0100: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: '0'. Current value: '1'. Expression location: _Ticks component. Find more at https://v22.angular.dev/errors/NG0100
```

ההודעה אומרת איזו קומפוננטה, ואיזה ערך היה על המסך מול הערך האמיתי. זה הכלי שמוצא את מה ש-grep לא מוצא במעבר ל-[OnPush](he/posts/angular-onpush-default-v22/) או ל-[zoneless](he/posts/angular-zoneless-migration/).

## ‏Angular DevTools

ה-[Profiler](https://angular.dev/tools/devtools/profiler) של Angular DevTools מציג כל מחזור change detection כעמודה, וכמה זמן כל קומפוננטה לקחה בו. תיבת הסימון Change detection צובעת את הקומפוננטות שנבדקו ומשאירה באפור את אלה שדולגו, למשל קומפוננטות OnPush שלא סומנו. כשהמסך דווקא מתעדכן יותר מדי, זה המקום לחפש בו. ‏[הפוסט על DevTools ו-profiling](he/posts/angular-devtools-profiling/) מראה איך עובדים איתו.

### בגרסאות קודמות

| | אפליקציה טיפוסית עד גרסה 20 | ‏Angular 22 |
|---|---|---|
| מה מתזמן בדיקה | ‏Zone.js, אחרי כל אירוע אסינכרוני | הודעות: ‏signals, אירועים בתבנית, ‏`markForCheck`, ‏`AsyncPipe`, ‏`setInput` |
| אסטרטגיית ברירת המחדל | ‏`Default` (היום `Eager`) | ‏`OnPush` |
| איפה נמצא state | שדות רגילים | ‏signals |
| לפעול אחרי רינדור | ‏`NgZone.onStable` | ‏`afterNextRender` |

## טעויות נפוצות של מתחילים

- ‏**לקרוא ל-`detectChanges()` לפני שמוצאים את ההודעה שחסרה.** המסך מתעדכן, אבל הסיבה נשארת, והשינוי הבא נשבר שוב.
- ‏**להשאיר את `provideCheckNoChangesConfig` ב-build של production.** הוא כלי פיתוח. ‏`isDevMode()` שומר עליו מחוץ ל-production.

## מה הלאה

רמה 4 מתחילה בפוסט הבא: ‏dependency injection, והפונקציה `inject()` שכבר הופיעה בדוגמאות.
