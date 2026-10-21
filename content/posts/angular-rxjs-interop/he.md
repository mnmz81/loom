---
title: "RxJS ו-signals ב-Angular: ‏toSignal, ‏toObservable ו-takeUntilDestroyed"
summary: "הגשר בין RxJS ל-signals ב-Angular 22: ‏toSignal עם initialValue ו-requireSync, ‏toObservable, ‏takeUntilDestroyed, ‏outputFromObservable, ‏async pipe מול toSignal, והדרך הישנה עם ngOnDestroy."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 44 }
---

ב-Angular חדש המצב יושב ב-signals, אבל `HttpClient`, הראוטר ואירועים עדיין מחזירים Observables. החבילה [`@angular/core/rxjs-interop`](https://angular.dev/ecosystem/rxjs-interop) ממירה בין השניים ומנקה רישומים לבד.

כל דוגמה נבדקה עם Angular 22.2 ו-RxJS 7.8, בבדיקות Vitest עם שעון מדומה ו-`HttpTestingController`.

## ‏toSignal: מ-Observable ל-signal

```typescript
// clock.ts
import { Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, interval, map } from 'rxjs';

const theme$ = new BehaviorSubject<'light' | 'dark'>('light');

@Component({
  selector: 'app-clock',
  template: `<p>{{ seconds() }} s, {{ theme() }}, {{ maybe() ?? 'nothing yet' }}</p>`,
})
export class Clock {
  protected readonly seconds = toSignal(interval(1000).pipe(map((n) => n + 1)), { initialValue: 0 });
  protected readonly theme = toSignal(theme$, { requireSync: true });
  protected readonly maybe = toSignal(interval(1000));
}
```

ברינדור הראשון מוצג `0 s, light, nothing yet`. ‏`toSignal` נרשם מיד, ועד שה-Observable שולח ערך ה-signal צריך ערך כלשהו:

- **בלי אפשרויות** (`maybe`): הערך `undefined`, והטיפוס כולל `undefined`.
- **‏`initialValue`** (`seconds`): ערך התחלתי, והטיפוס נקי.
- **‏`requireSync: true`** (`theme`): ל-Observable שפולט מיד ברישום, כמו `BehaviorSubject`. אם הוא לא פולט מיד, ‏Angular זורק:

```text
NG0601: `toSignal()` called with `requireSync` but `Observable` did not emit synchronously.
```

‏`toSignal` עובד רק ב-injection context (שדה, constructor), ומבטל את הרישום כשהקומפוננטה נהרסת. שגיאה ב-Observable נזרקת כשקוראים את ה-signal.

## ‏toObservable: מ-signal ל-RxJS

```typescript
// draft-editor.ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, skip, switchMap } from 'rxjs';

@Component({
  selector: 'app-draft-editor',
  template: `<textarea #box (input)="text.set(box.value)" aria-label="Draft"></textarea>`,
})
export class DraftEditor {
  private readonly http = inject(HttpClient);
  readonly text = signal('');

  constructor() {
    toObservable(this.text)
      .pipe(
        skip(1),
        debounceTime(1000),
        switchMap((text) => this.http.put('/api/draft', { text })),
        takeUntilDestroyed(),
      )
      .subscribe();
  }
}
```

שמירה אוטומטית של טיוטה: ‏`toObservable` פולט את ערך ה-signal ואת כל שינוי שלו, ומשם אפשר להשתמש באופרטורים מ[הפוסט הקודם](he/posts/angular-rxjs-basics/). ‏`skip(1)` מדלג על הערך ההתחלתי (הטקסט הריק), ו-`debounceTime` שומר רק אחרי שנייה בלי הקלדה. ‏[לפי התיעוד](https://angular.dev/ecosystem/rxjs-interop), כמה שינויים סינכרוניים ברצף נפלטים כערך אחד, האחרון.

‏`takeUntilDestroyed()` מסיים את הרישום כשהקומפוננטה נהרסת. בבדיקה, שמירה שהייתה באוויר ברגע ההריסה בוטלה.

## ‏takeUntilDestroyed מחוץ ל-constructor

```typescript
// status-badge.ts
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, switchMap } from 'rxjs';

@Component({
  selector: 'app-status-badge',
  template: `<p>{{ status() }}</p><button (click)="startPolling()">Watch</button>`,
})
export class StatusBadge {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly status = signal('unknown');

  protected startPolling() {
    interval(5000)
      .pipe(
        switchMap(() => this.http.get<{ status: string }>('/api/status')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => this.status.set(res.status));
  }
}
```

בלי ארגומנט, ‏`takeUntilDestroyed` מוצא את הקומפוננטה דרך `inject`, ולכן עובד רק ב-injection context. במתודה שרצה בלחיצה הוא זורק `NG0203`, ולכן מזריקים `DestroyRef` בשדה ומעבירים אותו, כמו ש[המדריך](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed) ממליץ. בבדיקה, אחרי הריסת הקומפוננטה לא יצאה אף בקשה נוספת.

## ‏outputFromObservable

```typescript
// search-box.ts
import { Component } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-search-box',
  template: `<input #box (input)="input$.next(box.value)" aria-label="Search" />`,
})
export class SearchBox {
  protected readonly input$ = new Subject<string>();
  readonly search = outputFromObservable(this.input$.pipe(debounceTime(300), distinctUntilChanged()));
}
```

‏`outputFromObservable` הופך Observable ל-[output](he/posts/angular-outputs-model/): ההורה כותב `(search)="..."` כרגיל ומקבל רק את הערך אחרי ה-debounce. הכיוון ההפוך הוא `outputToObservable(box.search)`, שמחזיר Observable מ-output של קומפוננטה ([output interop](https://angular.dev/ecosystem/rxjs-interop/output-interop)).

## ‏async pipe מול toSignal

```typescript
// user-views.ts
import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';

interface User {
  name: string;
  email: string;
}

@Component({
  selector: 'app-user-async',
  imports: [AsyncPipe],
  template: `<p>{{ (user$ | async)?.name }}</p><p>{{ (user$ | async)?.email }}</p>`,
})
export class UserAsync {
  protected readonly user$ = inject(HttpClient).get<User>('/api/me');
}

@Component({
  selector: 'app-user-signal',
  template: `<p>{{ user()?.name }}</p><p>{{ user()?.email }}</p>`,
})
export class UserSignal {
  protected readonly user = toSignal(inject(HttpClient).get<User>('/api/me'));
}
```

```text
async pipe requests: 2
toSignal requests: 1
```

שתיהן נרשמות ומבטלות לבד. ההבדל: כל `| async` בתבנית הוא רישום נפרד, ול-Observable של HTTP זו בקשה נפרדת. ‏`toSignal` נרשם פעם אחת, וה-signal נקרא כמה פעמים שצריך, גם ב-`computed` ובקוד ה-TypeScript.

### בגרסאות קודמות

```typescript
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, interval, takeUntil } from 'rxjs';

@Component({ selector: 'app-old-clock', template: `{{ seconds }}` })
export class OldClock implements OnInit, OnDestroy {
  seconds = 0;
  private subscription?: Subscription;

  ngOnInit() {
    this.subscription = interval(1000).subscribe(() => this.seconds++);
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}

@Component({ selector: 'app-old-clock-2', template: `{{ seconds }}` })
export class OldClock2 implements OnInit, OnDestroy {
  seconds = 0;
  private readonly destroy$ = new Subject<void>();

  ngOnInit() {
    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => this.seconds++);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

לפני `rxjs-interop` שמרו את ה-`Subscription` וביטלו אותו ב-[`ngOnDestroy`](he/posts/angular-lifecycle/), או יצרו Subject בשם `destroy$` ש-`takeUntil` מסיים איתו את כל הרישומים. שתי הדרכים עדיין עובדות, אבל קל לשכוח שלב. בקוד כזה הערך נשמר בשדה רגיל, ובאפליקציה [בלי Zone.js](he/posts/angular-zoneless/), ברירת המחדל מגרסה 21, שום דבר לא מודיע ל-Angular שהוא השתנה: בבדיקה השדה הגיע ל-3 והמסך נשאר על 0. ‏`toSignal` פותר את שתי הבעיות.

## טעויות נפוצות של מתחילים

- **לקרוא ל-`toSignal` בתוך מתודה.** זה יוצר רישום חדש בכל קריאה ונכשל מחוץ ל-injection context. יוצרים אותו פעם אחת, בשדה.
- **‏`takeUntilDestroyed` לא אחרון ב-`pipe`.** אופרטור שבא אחריו, כמו `switchMap`, עלול להמשיך לרוץ אחרי ההריסה.
- **כמה `| async` על אותו Observable של HTTP.** כל אחד שולח בקשה; ‏`toSignal` שולח אחת.

## מה הלאה

בפוסט הבא מתחילים את רמת הטפסים: שלוש הדרכים לבנות טופס ב-Angular, ‏template-driven, ‏reactive ו-Signal Forms, ומתי לבחור כל אחת.
