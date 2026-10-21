---
title: "HTTP errors in Angular: HttpErrorResponse, retry and error state with signals"
summary: "What's in HttpErrorResponse, retry with a delay only for transient errors, loading and error state with signals, a fallback value with catchError, and a global error message from an interceptor."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 40 }
---

A request can fail in two ways: the server answers with an error status, or the request never reaches it. [HttpClient](en/posts/angular-http-client/) sends both to the Observable's error channel, and from there you decide what to show.

Every example was checked with Angular 22.2 and RxJS 7.8, in Vitest specs with `HttpTestingController`.

## What's in HttpErrorResponse

```typescript
// load-user.ts
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

export function loadUser(http: HttpClient) {
  http.get('/api/users/42').subscribe({
    error: (err: HttpErrorResponse) => console.log(err.status, err.error, err.message),
  });
}
```

Once the server answers 404 with a JSON body, and once the network fails:

```text
404 { reason: 'no such user' } Http failure response for /api/users/42: 404 Not Found
0 ProgressEvent { isTrusted: [Getter] } Http failure response for /api/users/42: 0 
```

- `status` is the server's status code. [According to the docs](https://angular.dev/guide/http/making-requests), a network error or a timeout gets `0`.
- `error` is the server's response body, or the browser's error object when there's no response.
- `message` is meant for logs, not for users.

## Loading, error and retry

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

- Three [signals](en/posts/angular-signals/) hold the state, and the template picks what to show with `@if`.
- [`retry`](https://rxjs.dev/api/operators/retry) subscribes to the Observable again, which sends the request again. `count: 2` means up to two more attempts. `delay` returns an Observable: `timer` waits one second, then two, and `throwError` gives up at once.
- Retrying makes sense only for transient errors (network, 5xx). A 404 won't succeed the second time, so it fails at once. In the spec, three 503 responses end in `Server error (503).` after three requests, and a 404 after one.
- `finalize` runs on success and on error, so it's the place to turn `loading` off.

## A fallback value with catchError

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

When the data isn't critical, [`catchError`](https://rxjs.dev/api/operators/catchError) replaces the error with a normal value. Here a 500 response becomes an empty list and the page shows `No tags`. Without `catchError`, `toSignal` would throw the error on the next read of the signal.

## A global message from an interceptor

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

Errors handled the same way across the app (an expired session, a server that's down) are handled once in an [interceptor](en/posts/angular-interceptors/). `ErrorNotifier` is a service with a signal named `message` that a banner at the top of the page shows. `throwError` passes the error on, so the component that made the request still knows it failed.

## Mistakes beginners make

- **`retry()` with no condition.** Every 404 or 400 gets sent again for nothing; limit it in `delay` to transient errors.
- **Swallowing an error in an interceptor.** A `catchError` that returns `of(null)` makes the component think the request succeeded.
- **Showing users `err.message`.** It's technical text; turn `status` into a clear message.

## What's next

Next post: `resource()`, which manages loading, error and value as signals without writing that state by hand.
