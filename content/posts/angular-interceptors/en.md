---
title: "Interceptors in Angular: auth header, logging and run order"
summary: "Functional interceptors in Angular 22: an HttpInterceptorFn that adds an Authorization header, a logging interceptor, withInterceptors, why order matters, and the old class with HTTP_INTERCEPTORS."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 39 }
---

An interceptor is a function that every [HttpClient](en/posts/angular-http-client/) request passes through on its way to the server, and every response passes through on its way back. It's the place for code that repeats on every request: an authorization header, logging, error handling.

Every example was checked with Angular 22.2 and RxJS 7.8, in Vitest specs with `HttpTestingController`.

## An interceptor that adds an authorization header

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

- `req` is the request, and `next(req)` passes it on and returns an Observable of the response.
- A request is immutable, so you change a copy: `req.clone({ setHeaders })` returns a new request with the header.
- [According to the guide](https://angular.dev/guide/http/interceptors), an interceptor runs in the injection context of the injector that registered it, so `inject()` works inside it. `AuthStore` is a service with a signal named `token`.
- Without the `/api/` check the token is also sent to every other domain the app calls.

## A logging interceptor

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

The first line runs before the request goes out. What's inside `pipe` runs on what comes back. The Observable from `next` carries several kinds of events (for example "sent" and the response itself), so you check `event.type` to log only the response.

## Registration and order

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

Interceptors run in array order: the request goes through `loggingInterceptor` first and then `authInterceptor`, and the response comes back in reverse order. The same request to `/api/me`, once in this order and once reversed:

```text
--- [loggingInterceptor, authInterceptor]
GET /api/me, auth: false
/api/me returned 200
--- [authInterceptor, loggingInterceptor]
GET /api/me, auth: true
/api/me returned 200
```

In the first order the log runs before the header is added, so it doesn't see it. An interceptor that needs to see the final request goes last.

## Testing

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

`HttpTestingController` receives the request after all the interceptors, so you can check exactly what would have gone out to the network.

### In older versions

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

In older code an interceptor is a class that implements `HttpInterceptor`, is registered as a multi provider of `HTTP_INTERCEPTORS` (see [providers](en/posts/angular-providers/)), and calls `next.handle(req)` instead of `next(req)`. With `provideHttpClient` these classes run only if you add `withInterceptorsFromDi()`. Their order is the order the providers were registered, which [the guide](https://angular.dev/guide/http/interceptors) calls hard to predict. The [API reference](https://angular.dev/api/common/http/withInterceptorsFromDi) recommends functional interceptors and says support for class interceptors may be phased out.

## Mistakes beginners make

- **Changing `req` directly.** The request is immutable; change it with `req.clone(...)` and pass the copy to `next`.
- **Forgetting to return `next(req)`.** An interceptor that doesn't return it stops the request.
- **Sending the token to every URL.** Check `req.url` before adding `Authorization`.

## What's next

Next post: handling HTTP errors, `HttpErrorResponse`, retrying with `retry`, and loading and error state with signals.
