---
title: "RxJS ב-Angular: ה-Observable והאופרטורים שבאמת צריך"
summary: "ה-RxJS שצריך ב-Angular: ‏Observable, ‏subscribe ו-unsubscribe, ‏pipe עם map ו-filter, ‏Subject ו-BehaviorSubject, ותיבת חיפוש עם debounceTime ו-switchMap."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 43 }
---

‏[RxJS](https://rxjs.dev/guide/overview) היא ספרייה לזרמים של ערכים לאורך זמן. ‏Angular משתמש בה ב-`HttpClient`, בראוטר ובטפסים, ולכן גם באפליקציה שבנויה על signals פוגשים אותה. הפוסט מכסה רק את החלק שנחוץ ב-Angular.

כל דוגמה נבדקה עם RxJS 7.8 ו-Angular 22.2. את קטעי ה-RxJS הנקיים הרצנו ב-Node.js 24, ואת הקומפוננטה בבדיקת Vitest עם `HttpTestingController`.

## ‏Observable, ‏subscribe ו-unsubscribe

```typescript
// ticks.ts
import { Observable } from 'rxjs';

const ticks = new Observable<number>((subscriber) => {
  let n = 0;
  const id = setInterval(() => subscriber.next(n++), 100);
  return () => {
    clearInterval(id);
    console.log('cleaned up');
  };
});

const sub = ticks.subscribe((n) => console.log('tick', n));
setTimeout(() => sub.unsubscribe(), 350);
```

```text
tick 0
tick 1
tick 2
cleaned up
```

‏Observable הוא מתכון: הפונקציה שבתוכו רצה רק כש-`subscribe` נקרא, ומשם היא שולחת ערכים עם `next`. הפונקציה שהיא מחזירה רצה ב-`unsubscribe` ומנקה. ‏Observable של `HttpClient` שולח ערך אחד ומסתיים, אבל `interval` או אירועי DOM לא מסתיימים לבד, ומי שנרשם אליהם צריך לבטל את הרישום. הפוסט הבא מראה איך Angular עושה את זה בשבילכם.

## ‏pipe, ‏map ו-filter

```typescript
// operators.ts
import { from, filter, map } from 'rxjs';

from([1, 2, 3, 4, 5, 6])
  .pipe(
    filter((n) => n % 2 === 0),
    map((n) => n * 10),
  )
  .subscribe((n) => console.log(n));
```

```text
20
40
60
```

‏[אופרטור](https://rxjs.dev/guide/operators) מקבל Observable ומחזיר Observable חדש, ו-`pipe` מחבר כמה כאלה לפי הסדר. ‏`filter` מעביר רק ערכים שעונים על התנאי, ו-`map` הופך כל ערך לערך אחר. ‏`filter` של RxJS מסנן *ערכים בזרם*, לא איברים במערך. כש-`HttpClient` מחזיר מערך, הוא ערך אחד, ואת האיברים שלו מסננים עם `map((users) => users.filter(...))`.

## ‏Subject ו-BehaviorSubject

```typescript
// subjects.ts
import { BehaviorSubject, Subject } from 'rxjs';

const clicks = new Subject<string>();
clicks.subscribe((v) => console.log('A got', v));
clicks.next('first');
clicks.subscribe((v) => console.log('B got', v));
clicks.next('second');

const count = new BehaviorSubject(0);
count.next(1);
count.subscribe((v) => console.log('C got', v));
console.log('current:', count.value);
```

```text
A got first
A got second
B got second
C got 1
current: 1
```

‏[Subject](https://rxjs.dev/guide/subject) הוא Observable שאפשר לשלוח אליו ערכים מבחוץ עם `next`, וכל המנויים מקבלים אותם. מי שנרשם מאוחר מפספס את מה שכבר נשלח: ‏B לא קיבל את `first`. ‏`BehaviorSubject` שומר את הערך האחרון, נותן אותו מיד לכל מנוי חדש וחושף אותו ב-`.value`. בקוד Angular חדש מצב נשמר בדרך כלל ב-[signal](he/posts/angular-signals/), ו-Subject מתאים לזרם של אירועים, כמו בדוגמה הבאה.

## תיבת חיפוש: debounceTime ו-switchMap

```typescript
// search.ts
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-search',
  template: `
    <input #box (input)="terms.next(box.value)" aria-label="Search users" />
    <ul>
      @for (user of results(); track user.id) {
        <li>{{ user.name }}</li>
      }
    </ul>
  `,
})
export class Search {
  private readonly http = inject(HttpClient);
  protected readonly terms = new Subject<string>();
  protected readonly results = toSignal(
    this.terms.pipe(
      map((term) => term.trim()),
      debounceTime(300),
      filter((term) => term.length >= 2),
      distinctUntilChanged(),
      switchMap((term) => this.http.get<User[]>('/api/users', { params: { q: term } })),
    ),
    { initialValue: [] },
  );
}
```

כל הקשה שולחת את הטקסט ל-Subject, והשרשרת מחליטה מתי לפנות לשרת:

- ‏[`debounceTime(300)`](https://rxjs.dev/api/operators/debounceTime) מעביר ערך רק אחרי 300ms בלי ערך חדש. הקלדה מהירה של `a`, ‏`ad`, ‏`ada` שולחת בקשה אחת, עם `ada`.
- ‏`filter` מוותר על חיפוש קצר מ-2 תווים, ו-[`distinctUntilChanged`](https://rxjs.dev/api/operators/distinctUntilChanged) על חיפוש זהה לקודם: ‏`'ada '` אחרי `trim` הוא שוב `ada`, ולא יוצאת בקשה.
- ‏[`switchMap`](https://rxjs.dev/api/operators/switchMap) הופך כל מונח לבקשת HTTP, ומבטל את הבקשה הקודמת כשמגיע מונח חדש. כך תשובה איטית לחיפוש ישן לא דורסת תוצאות חדשות.
- ‏[`toSignal`](https://angular.dev/ecosystem/rxjs-interop) הופך את התוצאה ל-signal לתבנית ומבטל את הרישום כשהקומפוננטה נהרסת.

הבדיקה מקלידה עם שעון מדומה של Vitest ומוודאת עם `HttpTestingController` שיצאו רק `q=ada` ו-`q=grace`, ושהראשונה בוטלה.

## טעויות נפוצות של מתחילים

- **‏`mergeMap` במקום `switchMap` בחיפוש.** ‏`mergeMap` לא מבטל בקשות קודמות, ותשובה ישנה יכולה להגיע אחרונה ולהציג תוצאות לא נכונות.
- **‏`subscribe` בתוך `subscribe`.** בקשה שתלויה בתוצאה של אחרת נכתבת עם `switchMap` בתוך `pipe`.
- **לשכוח לבטל רישום** ל-Observable שלא מסתיים, כמו `interval`. ‏`toSignal` או `takeUntilDestroyed` עושים את זה בשבילכם.

## מה הלאה

בפוסט הבא: הגשר בין RxJS ל-signals: ‏`toSignal`, ‏`toObservable`, ‏`takeUntilDestroyed`, ו-outputs מ-Observable.
