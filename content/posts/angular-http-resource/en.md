---
title: "httpResource in Angular: a reactive GET request with validation"
summary: "httpResource() in Angular 22: a URL built from signals, a request with params, defaultValue, validating the response with parse, and a comparison with HttpClient plus toSignal and switchMap."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 42 }
---

[`httpResource()`](https://angular.dev/guide/http/http-resource) is a [resource](en/posts/angular-resource/) built on `HttpClient`: you pass a function that returns a URL, and every time the signals in it change, a new request goes out. Because it goes through `HttpClient`, [interceptors](en/posts/angular-interceptors/) and testing with `HttpTestingController` work as usual. It's stable since version 22.

Every example was checked with Angular 22.2, in Vitest specs with `HttpTestingController`.

## Search: a URL from a signal

```typescript
// user-search.ts
import { Component, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-user-search',
  template: `
    <input #box (input)="query.set(box.value)" aria-label="Search users" />
    @if (users.isLoading()) {
      <p>Searching…</p>
    }
    <ul>
      @for (user of users.value(); track user.id) {
        <li>{{ user.name }}</li>
      }
    </ul>
  `,
})
export class UserSearch {
  readonly query = signal('');
  protected readonly users = httpResource<User[]>(
    () => (this.query() ? { url: '/api/users', params: { q: this.query() } } : undefined),
    { defaultValue: [] },
  );
}
```

- The function can return a string (`` `/api/users/${id}` ``) or a request object with `url`, `params`, `headers` and more. Here it returns `{ url, params }`, and the request goes to `/api/users?q=ad`.
- When the box is empty the function returns `undefined`: no request, and the status is `idle`.
- `defaultValue: []` is the value during `idle` and `loading`, so `value()` is always an array and `@for` needs no `undefined` check.
- Every keystroke changes `query` and sends a request, and the previous request is cancelled (in the spec: `cancelled: true`). Waiting until the user stops typing needs `debounceTime`, in the RxJS post.

## Validating the response with parse

```typescript
// user-detail.ts
import { Component, input } from '@angular/core';
import { httpResource } from '@angular/common/http';

interface User {
  id: number;
  name: string;
}

function parseUser(raw: unknown): User {
  const u = raw as Partial<User>;
  if (typeof u?.id !== 'number' || typeof u.name !== 'string') {
    throw new Error('Invalid user from server');
  }
  return { id: u.id, name: u.name };
}

@Component({
  selector: 'app-user-detail',
  template: `
    @if (user.hasValue()) {
      <h2>{{ user.value().name }}</h2>
    } @else if (user.error(); as err) {
      <p role="alert">{{ err.message }}</p>
    }
  `,
})
export class UserDetail {
  readonly id = input.required<number>();
  protected readonly user = httpResource(() => `/api/users/${this.id()}`, { parse: parseUser });
}
```

`HttpClient`'s `get<T>` only assumes the type. `parse` receives the JSON as `unknown` and returns a value of the right type, and that sets the type of `value()`. If it throws, the resource moves to `error`: in the spec, the response `{ "id": "7", "title": "x" }` showed `Invalid user from server`. [According to the guide](https://angular.dev/guide/http/http-resource) you can also pass a zod `schema.parse` (see [validating data at runtime](en/posts/typescript-runtime-validation/)). The `id` comes from an [input](en/posts/angular-inputs/), and when it changes a new request goes out.

There are variants for responses other than JSON: `httpResource.text()`, `.blob()` and `.arrayBuffer()`. Beyond the signals every resource has, `httpResource` also has the response's `headers()` and `statusCode()`.

## Comparison: HttpClient with toSignal

```typescript
// user-search-rx.ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-user-search-rx',
  template: `@for (user of users(); track user.id) { <li>{{ user.name }}</li> }`,
})
export class UserSearchRx {
  private readonly http = inject(HttpClient);
  readonly query = signal('');
  protected readonly users = toSignal(
    toObservable(this.query).pipe(
      switchMap((q) => (q ? this.http.get<User[]>('/api/users', { params: { q } }) : of([]))),
    ),
    { initialValue: [] },
  );
}
```

The same search without `httpResource`: turn the signal into an Observable, `switchMap` cancels the previous request, and `toSignal` returns a signal. The result is the same, but there's no `isLoading()` and no `error()`, and an error is thrown from the signal on its next read. This version's advantage is that any RxJS operator fits into the chain, `debounceTime` for example.

## Mistakes beginners make

- **Sending POST or PUT with httpResource.** [The guide](https://angular.dev/guide/http/http-resource) says to avoid it; to save, use `HttpClient`.
- **Building a query string into the URL.** `params` in the request object encodes the values.
- **Returning `''` instead of `undefined`.** Only `undefined` stops the request.

## What's next

Next post: the RxJS you need in Angular: Observable, `pipe`, `map`, `switchMap`, `debounceTime` and Subject.
