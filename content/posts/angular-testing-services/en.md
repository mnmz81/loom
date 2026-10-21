---
title: "Testing Angular services: TestBed.inject, HTTP and the router"
summary: "How to test Angular services: TestBed.inject, replacing a dependency with a mock provider, HTTP requests with provideHttpClientTesting and HttpTestingController, and guards with RouterTestingHarness."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 58 }
---

A service is a class without a template, so its test is simpler than a component's: you ask the injector for it and call its methods. The real work is in the dependencies: another service, the server and the router.

Every example was checked with Angular 22.2 and Vitest 5.

## TestBed.inject

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

- `Cart` is declared with [`@Service()`](en/posts/angular-service-decorator/), so it's available app-wide without registration. `TestBed.inject(Cart)` returns an instance from the test's injector, like [`inject()`](en/posts/angular-inject/) in app code. TestBed resets before every `it`, so each test gets a fresh `Cart`.
- The real `TaxRates` returns 18%. In the second test `{ provide: TaxRates, useValue: ... }` replaces it with an object with 0 VAT. That's how you test `Cart` without tying it to another service. Providers have [their own post](en/posts/angular-providers/).
- `computed` is read as anywhere else, without waiting: signals update right away.

## HTTP with HttpTestingController

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

Per [the docs](https://angular.dev/guide/http/testing):

- `provideHttpClientTesting()` goes after `provideHttpClient()`, because it overrides parts of it. No request reaches the network.
- `expectOne` fails unless exactly one request was sent to the URL. `flush` answers it with data, or with an error that has a `status`. For a network error there's `req.error(new ProgressEvent('error'))`.
- `verify()` in `afterEach` fails a test that left a request unanswered.

`HttpClient` itself is covered in the [HttpClient post](en/posts/angular-http-client/).

## The router with RouterTestingHarness

A guard ([its own post](en/posts/angular-guards-resolvers/)) that redirects to `/login`, and two routes:

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

[The docs](https://angular.dev/guide/routing/testing) recommend giving the test the real routes in `provideRouter` rather than mocking the router. `RouterTestingHarness` really navigates, and `navigateByUrl` with a component class returns its instance (and fails if the navigation didn't reach it). `routeNativeElement` is what the `router-outlet` shows. Only `Session` is replaced, so the guard is tested as it is.

### In older versions

Older tests use modules instead of `provide...` functions:

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

Both modules still work, but they're deprecated: the `HttpClientTestingModule` API says to add `provideHttpClientTesting()`, and `RouterTestingModule`'s says to use `provideRouter`. Even older code has `TestBed.get(...)`, which was [removed in version 20](https://github.com/angular/angular/blob/main/CHANGELOG.md) in favor of `TestBed.inject`.

## Mistakes beginners make

- **Forgetting `provideHttpClientTesting()`.** `TestBed.inject(HttpTestingController)` fails with `NullInjectorError`, and the service tries to reach a real server.
- **Putting `provideHttpClientTesting()` before `provideHttpClient()`.** The order is the reverse of what's needed, and the override doesn't take.
- **Mocking the router.** A mock `Router` tests the mock. `RouterTestingHarness` with the real routes tests what the user will get.

## What's next

Next: testing signals, `computed` and effects with `TestBed.tick()`, and component harnesses.
