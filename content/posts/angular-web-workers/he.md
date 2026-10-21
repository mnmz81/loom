---
title: "Web Workers ב-Angular: חישובים כבדים בלי לתקוע את הממשק"
summary: "איך מעבירים חישוב כבד ל-Web Worker ב-Angular: ‏ng generate web-worker, שליחת הודעות בין הקומפוננטה ל-worker, מתי זה עוזר, ומה אי אפשר לעשות ב-worker."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 70 }
---

הקוד של האפליקציה רץ על thread אחד בדפדפן, ה-main thread. לולאה שרצה שתי שניות תוקעת את המסך לשתי שניות: לחיצות לא נקלטות, ו-Angular לא מרנדר. ‏[Web Worker](https://angular.dev/ecosystem/web-workers) מריץ קוד ב-thread נפרד, והממשק ממשיך להגיב.

כל דוגמה נבדקה עם Angular 22.2, והדוגמה המלאה הורצה בדפדפן מתוך build של production.

## ‏ng generate web-worker

```bash
ng generate web-worker app
```

```text
CREATE src/app/app.worker.ts (157 bytes)
CREATE tsconfig.worker.json (334 bytes)
UPDATE angular.json (2067 bytes)
UPDATE src/app/app.ts (690 bytes)
```

הפקודה יוצרת worker לדוגמה, ומוסיפה ל-`angular.json` את `"webWorkerTsConfig": "tsconfig.worker.json"`. ה-tsconfig הזה מקמפל את קובצי `*.worker.ts` עם הטיפוסים של `webworker` במקום אלה של `dom`. ל-`app.ts` נוסף קוד שיוצר את ה-worker ושולח לו `'hello'`, בתוך בדיקה של `typeof Worker !== 'undefined'`.

## שליחת הודעות

worker שסופר מספרים ראשוניים עד גבול מסוים, חישוב שלוקח כמה שניות:

```typescript
/// <reference lib="webworker" />

addEventListener('message', ({ data }: MessageEvent<number>) => {
  let count = 0;
  for (let n = 2; n <= data; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) {
      if (n % d === 0) {
        prime = false;
        break;
      }
    }
    if (prime) count++;
  }
  postMessage(count);
});
```

והקומפוננטה ששולחת לו את הגבול ומציגה את התשובה:

```typescript
import { Component, DestroyRef, inject, signal } from '@angular/core';

@Component({
  selector: 'app-primes',
  template: `
    <button (click)="count(5_000_000)">Count primes up to 5,000,000</button>
    <p>{{ result() ?? 'Not counted yet' }}</p>
  `,
})
export class Primes {
  protected readonly result = signal<number | null>(null);
  private readonly worker = new Worker(new URL('./primes.worker', import.meta.url));

  constructor() {
    this.worker.onmessage = ({ data }: MessageEvent<number>) => this.result.set(data);
    inject(DestroyRef).onDestroy(() => this.worker.terminate());
  }

  protected count(limit: number) {
    this.worker.postMessage(limit);
  }
}
```

`postMessage` שולח הודעה לצד השני, ו-`onmessage` מקבל אותה. כשהתשובה מגיעה, `result.set` מעדכן signal, ו-Angular מרנדר. בדפדפן הופיע `348513` אחרי הלחיצה. ‏`terminate` ב-`onDestroy` עוצר את ה-thread כשהקומפוננטה נהרסת.

את התבנית `new Worker(new URL('./primes.worker', import.meta.url))` ה-builder מזהה, ובונה מהקובץ chunk נפרד:

```text
Lazy chunk files    | Names         |  Raw size | Estimated transfer size
worker-FV2NBWS2.js  | primes-worker | 150 bytes |               150 bytes
```

## מתי זה עוזר, ומה אי אפשר

worker מתאים לעבודה שמעסיקה את המעבד: עיבוד קובץ גדול, חישוב על הרבה נתונים, עיבוד תמונה. לבקשות HTTP הוא לא נחוץ, כי הן כבר אסינכרוניות ולא תוקעות את ה-main thread.

המגבלות, לפי [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers):

- **אין DOM.** ב-worker אין `document`, ואת `window` מחליף `self`. את השינוי במסך עושים ב-main thread, אחרי שהתשובה מגיעה.
- **הנתונים מועתקים.** כל הודעה עוברת structured clone: הצד השני מקבל עותק, לא את אותו אובייקט. פונקציות אי אפשר לשלוח.
- **אין Angular בפנים.** ה-worker הוא קובץ TypeScript רגיל, בלי DI, קומפוננטות או signals של האפליקציה.

## טעויות נפוצות של מתחילים

- **ליצור worker באפליקציה עם SSR או prerendering בלי בדיקה.** לפי [התיעוד](https://angular.dev/ecosystem/web-workers), ‏`@angular/platform-server` לא תומך ב-workers. יוצרים את ה-worker רק בדפדפן, למשל אחרי בדיקה של `typeof Worker !== 'undefined'`, ומשאירים דרך חלופית.
- **ליצור worker חדש בכל לחיצה.** כל אחד הוא thread שנשאר פתוח עד `terminate`. יוצרים אחד ושולחים לו הרבה הודעות.
- **להעביר ל-worker עבודה קטנה.** העתקת הנתונים בכל הודעה עולה זמן, ולחישוב של כמה מילישניות היא לא משתלמת.

## מה הלאה

בפוסט הבא: איך ה-build עצמו מוגדר: ה-builder ‏`@angular/build:application`, ה-configurations ב-`angular.json`, ערכי סביבה ו-source maps.
