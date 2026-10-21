---
title: "בדיקות לשירותים ב-Angular: ‏TestBed.inject, ‏HTTP וראוטר"
summary: "איך בודקים שירותים ב-Angular: ‏TestBed.inject, החלפת תלות ב-provider מדומה, בקשות HTTP עם provideHttpClientTesting ו-HttpTestingController, ו-guards וניווט עם RouterTestingHarness."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 58 }
---

שירות הוא מחלקה בלי תבנית, ולכן הבדיקה שלו פשוטה יותר משל קומפוננטה: מבקשים אותו מה-injector וקוראים למתודות. העבודה האמיתית היא בתלויות: שירות אחר, השרת והראוטר.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest 5.

## ‏TestBed.inject

```typescript
import { Service, computed, inject, signal } from '@angular/core';
import { TaxRates } from './tax-rates';

@Service()
export class Cart {
  private readonly rates = inject(TaxRates);
  readonly items = signal<number[]>([]);
  readonly total = computed(() => {
    const sum = this.items().reduce((a, b) => a + b, 0);
    return sum * (1 + this.rates.vat());
  });

  add(price: number) {
    this.items.update((items) => [...items, price]);
  }
}
```

```typescript
import { TestBed } from '@angular/core/testing';
import { Cart } from './cart';
import { TaxRates } from './tax-rates';

describe('Cart', () => {
  it('adds VAT to the total', () => {
    const cart = TestBed.inject(Cart);
    cart.add(100);
    cart.add(50);
    expect(cart.total()).toBeCloseTo(177);
  });

  it('uses the provided tax rates', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: TaxRates, useValue: { vat: () => 0 } }],
    });
    const cart = TestBed.inject(Cart);
    cart.add(100);
    expect(cart.total()).toBe(100);
  });
});
```

- ‏`Cart` מוגדר עם [`@Service()`](he/posts/angular-service-decorator/), ולכן הוא זמין בכל האפליקציה בלי רישום. ‏`TestBed.inject(Cart)` מחזיר מופע מה-injector של הבדיקה, כמו [`inject()`](he/posts/angular-inject/) בקוד האפליקציה. ‏TestBed מתאפס לפני כל `it`, כך שכל בדיקה מקבלת `Cart` חדש.
- ‏`TaxRates` האמיתי מחזיר 18%. בבדיקה השנייה `{ provide: TaxRates, useValue: ... }` מחליף אותו באובייקט עם מע"מ 0. כך בודקים את `Cart` בלי לתלות אותו בשירות אחר. ‏providers מוסברים ב[פוסט משלהם](he/posts/angular-providers/).
- ‏`computed` נקרא כמו בכל מקום, בלי לחכות: ‏signals מתעדכנים מיד.

## ‏HTTP עם HttpTestingController

```typescript
import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface User {
  id: number;
  name: string;
}

@Service()
export class UsersApi {
  private readonly http = inject(HttpClient);

  getUser(id: number) {
    return firstValueFrom(this.http.get<User>(`/api/users/${id}`));
  }
}
```

```typescript
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UsersApi } from './users-api';

describe('UsersApi', () => {
  let api: UsersApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(UsersApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads a user', async () => {
    const user = api.getUser(7);
    const req = http.expectOne('/api/users/7');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 7, name: 'Dana' });
    expect(await user).toEqual({ id: 7, name: 'Dana' });
  });

  it('rejects on a server error', async () => {
    const user = api.getUser(7);
    http.expectOne('/api/users/7').flush('Boom', { status: 500, statusText: 'Server Error' });
    await expect(user).rejects.toMatchObject({ status: 500 });
  });
});
```

לפי [התיעוד](https://angular.dev/guide/http/testing):

- ‏`provideHttpClientTesting()` בא אחרי `provideHttpClient()`, כי הוא דורס חלקים ממנו. אף בקשה לא יוצאת לרשת.
- ‏`expectOne` נכשל אם לא נשלחה בדיוק בקשה אחת לכתובת. ‏`flush` עונה עליה בנתונים, או בשגיאה עם `status`. לשגיאת רשת יש `req.error(new ProgressEvent('error'))`.
- ‏`verify()` ב-`afterEach` מכשיל בדיקה שהשאירה בקשה בלי תשובה.

‏`HttpClient` עצמו מוסבר ב[פוסט על HttpClient](he/posts/angular-http-client/).

## ראוטר עם RouterTestingHarness

‏guard ([פוסט משלו](he/posts/angular-guards-resolvers/)) שמפנה ל-`/login`, ושני routes:

```typescript
import { Component, inject, input } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';

@Component({ template: `<h1>User {{ id() }}</h1>` })
export class UserPage {
  readonly id = input.required<string>();
}

@Component({ template: `<h1>Login</h1>` })
export class LoginPage {}

export class Session {
  loggedIn = false;
}

export const authGuard: CanActivateFn = () =>
  inject(Session).loggedIn || inject(Router).parseUrl('/login');

export const routes: Routes = [
  { path: 'users/:id', component: UserPage, canActivate: [authGuard] },
  { path: 'login', component: LoginPage },
];
```

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Session, UserPage, routes } from './routes';

describe('routes', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: Session, useValue: session },
      ],
    });
  });

  it('shows the user page when logged in', async () => {
    session.loggedIn = true;
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/users/42', UserPage);
    expect(page.id()).toBe('42');
    expect(harness.routeNativeElement?.textContent).toBe('User 42');
  });

  it('redirects to login when logged out', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/users/42');
    expect(harness.routeNativeElement?.textContent).toBe('Login');
  });
});
```

‏[התיעוד](https://angular.dev/guide/routing/testing) ממליץ לתת לבדיקה את ה-routes האמיתיים ב-`provideRouter`, ולא לדמות את הראוטר. ‏`RouterTestingHarness` מנווט באמת, ו-`navigateByUrl` עם מחלקת קומפוננטה מחזיר את המופע שלה (ונכשל אם הניווט לא הגיע אליה). ‏`routeNativeElement` הוא מה שה-`router-outlet` מציג. רק `Session` מוחלף, כך שה-guard נבדק כמו שהוא.

### בגרסאות קודמות

בבדיקות ישנות מופיעים מודולים במקום פונקציות `provide...`:

```typescript
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { UsersApi } from './users-api';

describe('UsersApi (old style)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule.withRoutes([])],
    });
  });

  it('loads a user', async () => {
    const api = TestBed.inject(UsersApi);
    const http = TestBed.inject(HttpTestingController);
    const user = api.getUser(7);
    http.expectOne('/api/users/7').flush({ id: 7, name: 'Dana' });
    expect(await user).toEqual({ id: 7, name: 'Dana' });
  });
});
```

שני המודולים עדיין עובדים, אבל מסומנים כ-deprecated: ה-API של `HttpClientTestingModule` אומר להוסיף `provideHttpClientTesting()`, ושל `RouterTestingModule` להשתמש ב-`provideRouter`. בקוד ישן עוד יותר מופיע `TestBed.get(...)`, ש-[הוסר בגרסה 20](https://github.com/angular/angular/blob/main/CHANGELOG.md) לטובת `TestBed.inject`.

## טעויות נפוצות של מתחילים

- **לשכוח `provideHttpClientTesting()`.** ‏`TestBed.inject(HttpTestingController)` נכשל ב-`NullInjectorError`, והשירות מנסה לפנות לשרת אמיתי.
- **לשים את `provideHttpClientTesting()` לפני `provideHttpClient()`.** הסדר הפוך מהנדרש, וההחלפה לא תופסת.
- **לדמות את הראוטר.** ‏mock של `Router` בודק את ה-mock. ‏`RouterTestingHarness` עם ה-routes האמיתיים בודק את מה שהמשתמש יקבל.

## מה הלאה

בפוסט הבא: בדיקות ל-signals, ל-`computed` ול-effects, עם `TestBed.tick()`, ו-component harnesses.
