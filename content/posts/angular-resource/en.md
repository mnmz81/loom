---
title: "resource and rxResource in Angular: async data loading with signals"
summary: "resource() and rxResource() in Angular 22: params and loader, status, value, hasValue and error, cancelling with abortSignal, reload, and chaining resources with chain."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 41 }
---

In the previous post we managed loading and errors with three hand-written signals. [`resource()`](https://angular.dev/guide/signals/resource) does it for you: it takes signals that decide what to load and an async function that loads it, and returns the result, the status and the error as signals. `resource` and `rxResource` are stable since version 22.

Every example was checked with Angular 22.2 and RxJS 7.8, in Vitest specs with a stubbed `fetch` and `HttpTestingController`.

## params and loader

```typescript
// user-card.ts
import { Component, resource, signal } from '@angular/core';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-user-card',
  template: `
    <button (click)="id.set(id() + 1)">Next user</button>
    <button (click)="user.reload()">Reload</button>
    @if (user.hasValue()) {
      <p>{{ user.value().name }}</p>
    } @else if (user.error()) {
      <p role="alert">{{ user.error()?.message }}</p>
    }
    <small>{{ user.status() }}</small>
  `,
})
export class UserCard {
  protected readonly id = signal(1);
  protected readonly user = resource({
    params: () => ({ id: this.id() }),
    loader: async ({ params, abortSignal }) => {
      const res = await fetch(`/api/users/${params.id}`, { signal: abortSignal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as User;
    },
  });
}
```

- `params` works like [computed](en/posts/angular-signals/): it reads signals and returns a value. Every time the value changes, `loader` runs again.
- `loader` receives `params`, `abortSignal` and `previous` (the previous status), and returns a Promise.
- If `params` returns `undefined`, the loader doesn't run and the status is `idle`. That's how you wait for a value you don't have yet, such as an empty search box.

## status, value and hasValue

| `status()` | When | `value()` |
|---|---|---|
| `idle` | `params` returned `undefined` | `undefined` |
| `loading` | `params` changed and the loader is running | `undefined` |
| `reloading` | `reload()` was called | the previous value |
| `resolved` | the loader succeeded | the result |
| `error` | the loader threw | throws an error |
| `local` | the value was set with `set()` or `update()` | the value you set |

`isLoading()` is `true` in `loading` and `reloading`, and `error()` returns the last error. In the spec, reading `value()` in the `error` state did throw. That's why the template asks `hasValue()` first: it's `false` on error, and inside the `@if` it narrows the type so `value()` no longer includes `undefined`.

## Cancelling and reload

When `id` changes while the previous load is still running, the resource cancels it through `abortSignal`. In the spec, two quick clicks on "Next user" left the first request's `abortSignal` with `aborted: true`. Pass it to `fetch`, and an old response can't overwrite the new one.

`user.reload()` runs the loader again with the same `params`, and meanwhile `value()` keeps the previous value (`reloading`), so the screen doesn't flicker. `user.set(...)` replaces the value locally and moves the status to `local`.

## rxResource and HttpClient

```typescript
// user-card-rx.ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-user-card-rx',
  template: `<p>{{ user.value()?.name ?? '…' }}</p>`,
})
export class UserCardRx {
  private readonly http = inject(HttpClient);
  readonly id = signal(1);
  protected readonly user = rxResource({
    params: () => ({ id: this.id() }),
    stream: ({ params }) => this.http.get<User>(`/api/users/${params.id}`),
  });
}
```

`rxResource` is the same, but instead of a `loader` that returns a Promise it has a `stream` that returns an Observable, which fits [HttpClient](en/posts/angular-http-client/). When `id` changes, rxResource unsubscribes from the previous Observable, and `HttpTestingController` shows the previous request was cancelled (`cancelled: true`). A plain GET has a shortcut, `httpResource`, in the next post.

## Chaining with chain

```typescript
// team-name.ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';

interface User { id: number; teamId: number; }
interface Team { name: string; }

@Component({
  selector: 'app-team',
  template: `<p>{{ team.status() }} {{ team.value()?.name }}</p>`,
})
export class TeamName {
  private readonly http = inject(HttpClient);
  readonly userId = signal(1);
  readonly user = rxResource({
    params: () => this.userId(),
    stream: ({ params }) => this.http.get<User>(`/api/users/${params}`),
  });
  readonly team = rxResource({
    params: ({ chain }) => chain(this.user)?.teamId,
    stream: ({ params }) => this.http.get<Team>(`/api/teams/${params}`),
  });
}
```

`chain(this.user)` returns the value of `user` only when it's `resolved` or `local`. In any other state it passes the status on: while `user` is loading, `team` stays in `loading` and sends no request, and an error in `user` becomes an error in `team`. The `?.` is needed because the type of `user` includes `undefined`. [The guide](https://angular.dev/guide/signals/resource) recommends `chain` only when the second resource does its own loading that depends on the first; for a synchronous calculation `computed` is enough.

### In older versions

`resource` appeared in version 19 and was [marked experimental](https://v21.angular.dev/api/core/resource) through version 21, and its option names changed along the way. In [version 19](https://v19.angular.dev/guide/signals/resource) the option was called `request` and the loader received `({ request })`, and `rxResource` had a `loader` option that returned an Observable. In version 20 `request` became `params` and `rxResource`'s `loader` became `stream`. An old tutorial with `request:` shows the same idea under the old names.

## Mistakes beginners make

- **Reading `value()` without checking.** In the `error` state it throws; check `hasValue()` first.
- **Using a resource to save (POST, PUT).** [The API reference](https://angular.dev/api/core/resource) warns that a resource cancels a load when its params change, which can cut off an operation that changes data. To save, call `HttpClient` directly.
- **Forgetting `abortSignal`.** Without it the old `fetch` keeps running in the background even after it was cancelled.

## What's next

Next post: `httpResource()`, a resource built on `HttpClient`, with a reactive URL and response validation with `parse`.
