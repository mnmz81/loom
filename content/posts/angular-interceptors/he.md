---
title: "Interceptors ב-Angular: כותרת הרשאה, לוג וסדר הריצה"
summary: "‏interceptors פונקציונליים ב-Angular 22: ‏HttpInterceptorFn שמוסיף כותרת Authorization, ‏interceptor של לוג, רישום עם withInterceptors, למה הסדר חשוב, והגרסה הישנה עם מחלקה ו-HTTP_INTERCEPTORS."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 39 }
---

‏interceptor הוא פונקציה שכל בקשה של [HttpClient](he/posts/angular-http-client/) עוברת דרכה בדרך לשרת, וכל תשובה עוברת דרכה בדרך חזרה. זה המקום לקוד שחוזר על עצמו בכל בקשה: כותרת הרשאה, לוג, טיפול בשגיאות.

כל דוגמה נבדקה עם Angular 22.2 ו-RxJS 7.8, בבדיקות Vitest עם `HttpTestingController`.

## ‏interceptor שמוסיף כותרת הרשאה

```typescript
// auth.interceptor.ts
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthStore } from './auth-store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthStore).token();
  if (!token || !req.url.startsWith('/api/')) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
```

- ‏`req` הוא הבקשה, ו-`next(req)` מעביר אותה הלאה ומחזיר Observable של התשובה.
- בקשה היא immutable, ולכן משנים עותק: ‏`req.clone({ setHeaders })` מחזיר בקשה חדשה עם הכותרת.
- ‏[לפי המדריך](https://angular.dev/guide/http/interceptors), ‏interceptor רץ ב-injection context של ה-injector שרשם אותו, ולכן `inject()` עובד בתוכו. ‏`AuthStore` הוא שירות עם signal בשם `token`.
- בלי הבדיקה של `/api/` הטוקן נשלח גם לכל דומיין אחר שהאפליקציה פונה אליו.

## ‏interceptor של לוג

```typescript
// logging.interceptor.ts
import { HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  console.log(`${req.method} ${req.url}, auth: ${req.headers.has('Authorization')}`);
  return next(req).pipe(
    tap((event) => {
      if (event.type === HttpEventType.Response) {
        console.log(`${req.url} returned ${event.status}`);
      }
    }),
  );
};
```

השורה הראשונה רצה לפני שהבקשה יוצאת. מה שבתוך `pipe` רץ על מה שחוזר. ה-Observable של `next` מעביר כמה סוגי אירועים (למשל "נשלח" והתשובה עצמה), ולכן בודקים `event.type` כדי לרשום רק את התשובה.

## רישום וסדר

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';
import { loggingInterceptor } from './logging.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withInterceptors([loggingInterceptor, authInterceptor]))],
};
```

ה-interceptors רצים לפי סדר המערך: הבקשה עוברת קודם ב-`loggingInterceptor` ואז ב-`authInterceptor`, והתשובה חוזרת בסדר ההפוך. אותה בקשה ל-`/api/me`, פעם בסדר הזה ופעם בסדר הפוך:

```text
--- [loggingInterceptor, authInterceptor]
GET /api/me, auth: false
/api/me returned 200
--- [authInterceptor, loggingInterceptor]
GET /api/me, auth: true
/api/me returned 200
```

בסדר הראשון הלוג רץ לפני שהכותרת נוספה, ולכן לא רואה אותה. ‏interceptor שצריך לראות את הבקשה הסופית בא אחרון.

## בדיקה

```typescript
// auth.interceptor.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth-store';

it('adds the header to /api/ requests only', () => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
  });
  TestBed.inject(AuthStore).token.set('abc123');
  const http = TestBed.inject(HttpClient);
  const ctrl = TestBed.inject(HttpTestingController);

  http.get('/api/me').subscribe();
  http.get('https://cdn.example.com/a.json').subscribe();

  expect(ctrl.expectOne('/api/me').request.headers.get('Authorization')).toBe('Bearer abc123');
  expect(ctrl.expectOne('https://cdn.example.com/a.json').request.headers.has('Authorization')).toBe(false);
});
```

‏`HttpTestingController` מקבל את הבקשה אחרי כל ה-interceptors, כך שאפשר לבדוק בדיוק מה היה יוצא לרשת.

### בגרסאות קודמות

```typescript
import { Injectable, inject } from '@angular/core';
import {
  HTTP_INTERCEPTORS, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest,
  provideHttpClient, withInterceptorsFromDi,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthStore } from './auth-store';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly auth = inject(AuthStore);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.token();
    return next.handle(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
  }
}

export const providers = [
  provideHttpClient(withInterceptorsFromDi()),
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
];
```

בקוד ישן ה-interceptor הוא מחלקה שמממשת `HttpInterceptor`, נרשמת כ-multi provider של `HTTP_INTERCEPTORS` (ראו [providers](he/posts/angular-providers/)), ו-`next.handle(req)` במקום `next(req)`. עם `provideHttpClient` הן רצות רק אם מוסיפים `withInterceptorsFromDi()`. הסדר שלהן הוא סדר רישום ה-providers, ש[לפי המדריך](https://angular.dev/guide/http/interceptors) קשה לצפות אותו. ה-[API](https://angular.dev/api/common/http/withInterceptorsFromDi) ממליץ על interceptors פונקציונליים ומציין שהתמיכה במחלקות עשויה להיעלם בעתיד.

## טעויות נפוצות של מתחילים

- **לשנות את `req` ישירות.** הבקשה immutable; משנים עם `req.clone(...)` ומעבירים את העותק ל-`next`.
- **לשכוח להחזיר את `next(req)`.** ‏interceptor שלא מחזיר אותו עוצר את הבקשה.
- **לשלוח טוקן לכל כתובת.** בודקים את `req.url` לפני שמוסיפים `Authorization`.

## מה הלאה

בפוסט הבא: טיפול בשגיאות HTTP, ‏`HttpErrorResponse`, ניסיון חוזר עם `retry`, ומצב טעינה ושגיאה עם signals.
