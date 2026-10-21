---
title: "URL parameters in Angular: :id, query params and withComponentInputBinding"
summary: "Path params and query params in the Angular router, receiving them as input() with withComponentInputBinding, ActivatedRoute with toSignal, and v22's new paramsInheritanceStrategy default."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 34 }
---

One user page shows any user by URL: `/users/42`, `/users/7`. The changing part is a parameter, and Angular can pass it straight to the component's `input()`.

Every example was checked with Angular 22.2 and Vitest.

## :id and withComponentInputBinding

A colon in `path` defines a parameter. [`withComponentInputBinding()`](https://angular.dev/api/router/withComponentInputBinding) tells the router to pass parameters to inputs with the same name:

```typescript
import { ApplicationConfig } from '@angular/core';
import { Routes, provideRouter, withComponentInputBinding } from '@angular/router';
import { User, UserPosts } from './user';

const routes: Routes = [
  { path: 'users/:id', component: User, children: [{ path: 'posts', component: UserPosts }] },
];

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withComponentInputBinding())],
};
```

```typescript
import { Component, input } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-user',
  imports: [RouterLink, RouterOutlet],
  template: `
    <h1>User {{ id() }}</h1>
    <p>Tab: {{ tab() ?? 'overview' }}</p>
    <a [routerLink]="['/users', 7]" [queryParams]="{ tab: 'posts' }">User 7, posts</a>
    <router-outlet />
  `,
})
export class User {
  readonly id = input<string>();
  readonly tab = input<string>();
}

@Component({ selector: 'app-user-posts', template: `<p>Posts of user {{ id() }}</p>` })
export class UserPosts {
  readonly id = input<string>();
}
```

At `/users/42` you see `User 42` and `Tab: overview`. Parameters always arrive as strings, even when they look like numbers, hence `input<string>()`. If you need a number, convert with `transform: numberAttribute` (transforms are in the [inputs post](en/posts/angular-inputs/)).

## Query params

Everything after the `?` in the URL. `[routerLink]` takes an array of path segments, and `[queryParams]` adds query params. The link above produces `href="/users/7?tab=posts"`, and clicking it shows `User 7` and `Tab: posts`.

`withComponentInputBinding` also passes query params, the route's static `data` and data from resolvers to inputs. When there's no value for an input's name, it gets `undefined`. That way `tab` doesn't keep a stale value when the query param leaves the URL, which is why the template has `??`.

## ActivatedRoute and toSignal

The other way is [`ActivatedRoute`](https://angular.dev/guide/routing/read-route-state), which holds the route state as Observables. [`toSignal`](en/posts/angular-rxjs-interop/) turns it into a signal:

```typescript
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({ selector: 'app-user-card', template: `<p>Card {{ id() }}</p>` })
export class UserCard {
  private readonly route = inject(ActivatedRoute);
  protected readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))));
}
```

Navigating from `/u/5` to `/u/6` changes the text from `Card 5` to `Card 6`. The router reuses the same component instance when only the parameter changes, so you need a source that updates, not a one-time read. Use `ActivatedRoute` when you need the route itself, for example in a service or when the component isn't displayed directly by the router.

## A child route gets the parent's parameters

`UserPosts` is a child of `users/:id`, and still `/users/42/posts` shows `Posts of user 42`. That's [`paramsInheritanceStrategy`](https://angular.dev/guide/routing/customizing-route-behavior#control-parameter-inheritance): since version 22 the default is `'always'`, and a route inherits the parameters, `data` and resolver data of all its parents.

Until version 22 the default was `'emptyOnly'`: a child inherited only when its path was empty or the parent had no component. With `withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' })` the same URL shows `Posts of user` with no number. An app upgraded to version 22 may suddenly see values in inputs that used to be `undefined`.

### In older versions

Without `withComponentInputBinding` (added in version 16), components subscribed to `paramMap` in `ngOnInit`:

```typescript
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({ selector: 'app-old-user', template: `<h1>User {{ id }}</h1>` })
export class OldUser implements OnInit {
  id: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => (this.id = params.get('id')));
  }
}
```

In Angular 22 this code shows the first id, but navigating from `/u/5` to `/u/6` leaves `User 5`: the component is OnPush by default, and changing a plain field from a subscription doesn't mark it for checking ([OnPush by default](en/posts/angular-onpush-default-v22/)). An even more common version, `route.snapshot.paramMap.get('id')`, reads the value once and never updates.

## Mistakes beginners make

- **Treating a parameter as a number.** The value is `'42'`, not `42`. Convert explicitly, or with `numberAttribute`.
- **Forgetting `withComponentInputBinding()`.** Without that line the inputs stay `undefined`, with no error.

## What's next

Next: lazy-loading routes with `loadComponent` and `loadChildren`, and how it looks in the `ng build` output.
