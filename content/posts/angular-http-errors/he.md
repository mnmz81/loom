---
title: "שגיאות HTTP ב-Angular: ‏HttpErrorResponse, ‏retry ומצב שגיאה עם signals"
summary: "מה יש ב-HttpErrorResponse, ניסיון חוזר עם retry ו-delay רק לשגיאות זמניות, מצב טעינה ושגיאה עם signals, ערך חלופי עם catchError, והודעת שגיאה גלובלית מתוך interceptor."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 40 }
---

בקשה יכולה להיכשל בשתי דרכים: השרת עונה עם סטטוס שגיאה, או שהבקשה לא מגיעה אליו בכלל. ‏[HttpClient](he/posts/angular-http-client/) מעביר את שתיהן לערוץ השגיאה של ה-Observable, ומשם מחליטים מה להציג.

כל דוגמה נבדקה עם Angular 22.2 ו-RxJS 7.8, בבדיקות Vitest עם `HttpTestingController`.

## מה יש ב-HttpErrorResponse

```typescript
// load-user.ts
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

export function loadUser(http: HttpClient) {
  http.get('/api/users/42').subscribe({
    error: (err: HttpErrorResponse) => console.log(err.status, err.error, err.message),
  });
}
```

פעם אחת השרת עונה 404 עם גוף JSON, ופעם אחת הרשת נופלת:

```text
404 { reason: 'no such user' } Http failure response for /api/users/42: 404 Not Found
0 ProgressEvent { isTrusted: [Getter] } Http failure response for /api/users/42: 0 
```

- ‏`status` הוא קוד הסטטוס מהשרת. ‏[לפי התיעוד](https://angular.dev/guide/http/making-requests), שגיאת רשת או timeout מקבלות `0`.
- ‏`error` הוא גוף התשובה מהשרת, או אובייקט השגיאה של הדפדפן כשאין תשובה.
- ‏`message` נועד ללוגים, לא למשתמש.

## מצב טעינה, שגיאה וניסיון חוזר

```typescript
// profile.ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize, retry, throwError, timer } from 'rxjs';

interface User {
  name: string;
}

function describeError(err: HttpErrorResponse): string {
  if (err.status === 0) return 'No connection to the server.';
  if (err.status === 404) return 'User not found.';
  return `Server error (${err.status}).`;
}

@Component({
  selector: 'app-profile',
  template: `
    @if (loading()) {
      <p>Loading…</p>
    } @else if (error()) {
      <p role="alert">{{ error() }}</p>
      <button (click)="load()">Try again</button>
    } @else {
      <p>Hello, {{ user()?.name }}</p>
    }
  `,
})
export class Profile {
  private readonly http = inject(HttpClient);
  protected readonly user = signal<User | undefined>(undefined);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  constructor() {
    this.load();
  }

  protected load() {
    this.loading.set(true);
    this.error.set('');
    this.http
      .get<User>('/api/me')
      .pipe(
        retry({
          count: 2,
          delay: (err: HttpErrorResponse, attempt) =>
            err.status === 0 || err.status >= 500 ? timer(attempt * 1000) : throwError(() => err),
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (user) => this.user.set(user),
        error: (err: HttpErrorResponse) => this.error.set(describeError(err)),
      });
  }
}
```

- שלושה [signals](he/posts/angular-signals/) מחזיקים את המצב, והתבנית בוחרת מה להציג עם `@if`.
- ‏[`retry`](https://rxjs.dev/api/operators/retry) נרשם מחדש ל-Observable, וזה שולח את הבקשה שוב. ‏`count: 2` אומר עד שני ניסיונות נוספים. ‏`delay` מחזיר Observable: ‏`timer` ממתין שנייה ואז שתיים, ו-`throwError` מוותר מיד.
- ניסיון חוזר הגיוני רק לשגיאות זמניות (רשת, 5xx). על 404 הבקשה לא תצליח בפעם השנייה, ולכן היא נכשלת מיד. בבדיקה, שלוש תשובות 503 נגמרות ב-`Server error (503).` אחרי שלוש בקשות, ו-404 אחרי בקשה אחת.
- ‏`finalize` רץ גם בהצלחה וגם בשגיאה, ולכן הוא המקום לכבות את `loading`.

## ערך חלופי עם catchError

```typescript
// tags.ts
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-tags',
  template: `<p>{{ tags().join(', ') || 'No tags' }}</p>`,
})
export class Tags {
  protected readonly tags = toSignal(
    inject(HttpClient).get<string[]>('/api/tags').pipe(catchError(() => of([]))),
    { initialValue: [] },
  );
}
```

כשנתון לא קריטי, ‏[`catchError`](https://rxjs.dev/api/operators/catchError) מחליף את השגיאה בערך רגיל. כאן תשובת 500 נהפכת לרשימה ריקה והעמוד מציג `No tags`. בלי `catchError`, השגיאה הייתה נזרקת מ-`toSignal` בקריאה הבאה של ה-signal.

## הודעה גלובלית מתוך interceptor

```typescript
// error.interceptor.ts
import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ErrorNotifier } from './error-notifier';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifier = inject(ErrorNotifier);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) notifier.message.set('Your session expired. Sign in again.');
      else if (err.status >= 500) notifier.message.set('The server is having trouble. Try again later.');
      return throwError(() => err);
    }),
  );
};
```

שגיאות שהטיפול בהן זהה בכל האפליקציה (התחברות שפגה, שרת שנפל) מטופלות פעם אחת ב-[interceptor](he/posts/angular-interceptors/). ‏`ErrorNotifier` הוא שירות עם signal בשם `message` שבאנר בראש העמוד מציג. ‏`throwError` זורק את השגיאה הלאה, כך שהקומפוננטה שביקשה עדיין יודעת שהבקשה נכשלה.

## טעויות נפוצות של מתחילים

- **‏`retry()` בלי תנאי.** כל 404 או 400 יישלח שוב סתם; מגבילים ב-`delay` לשגיאות זמניות.
- **לבלוע שגיאה ב-interceptor.** ‏`catchError` שמחזיר `of(null)` גורם לקומפוננטה לחשוב שהבקשה הצליחה.
- **להציג למשתמש את `err.message`.** זה טקסט טכני; מתרגמים את `status` להודעה ברורה.

## מה הלאה

בפוסט הבא: ‏`resource()`, שמנהל טעינה, שגיאה וערך כ-signals בלי לכתוב את המצב הזה ידנית.
