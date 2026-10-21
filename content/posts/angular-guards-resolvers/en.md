---
title: "Guards and resolvers in Angular: CanActivateFn, CanMatchFn and ResolveFn"
summary: "Restricting routes with functional guards, redirecting with UrlTree and RedirectCommand, canMatch, canDeactivate, and loading data before the page shows with a resolver. Old class guards too."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 36 }
---

A [guard](https://angular.dev/guide/routing/route-guards) is a function the router runs before entering or leaving a route, and a [resolver](https://angular.dev/guide/routing/data-resolvers) is a function that fetches data before the page is shown. Both run in an injection context, so `inject` is allowed in them.

Every example was checked with Angular 22.2 and Vitest.

## canActivate and UrlTree

A `CanActivateFn` returns `true` to continue, or a `UrlTree` to redirect elsewhere. Here, a page that requires a logged-in user:

```typescript
import { Service, inject, signal } from '@angular/core';
import { CanActivateFn, CanMatchFn, RedirectCommand, Router } from '@angular/router';

@Service()
export class Auth {
  readonly user = signal<{ name: string; admin: boolean } | null>(null);
}

export const authGuard: CanActivateFn = () => {
  const loggedIn = inject(Auth).user() !== null;
  return loggedIn || inject(Router).createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (inject(Auth).user()?.admin) return true;
  return new RedirectCommand(router.parseUrl('/login'), { skipLocationChange: true });
};

export const isAdmin: CanMatchFn = () => inject(Auth).user()?.admin === true;
```

Attach them to routes:

```typescript
import { Routes } from '@angular/router';
import { adminGuard, authGuard, isAdmin } from './guards';
import { Editor, unsavedChanges } from './editor';
import { Profile, userName } from './resolver';
import { Account, AdminDashboard, Login, UserDashboard } from './pages';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'account', component: Account, canActivate: [authGuard] },
  { path: 'admin', component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'dashboard', component: AdminDashboard, canMatch: [isAdmin] },
  { path: 'dashboard', component: UserDashboard },
  { path: 'editor', component: Editor, canDeactivate: [unsavedChanges] },
  { path: 'users/:id', component: Profile, resolve: { userName } },
];
```

A user who isn't logged in and goes to `/account` lands on `/login`. The page isn't shown, and the URL becomes `/login`. You can also return `false`, but then navigation just stops with no explanation. [The guide recommends](https://angular.dev/guide/routing/route-guards) returning a `UrlTree` or `RedirectCommand` instead of blocking and then navigating manually.

When there are several guards in an array, they start in order but don't wait for each other. If one doesn't return `true`, the result of the first one in the array that didn't return `true` wins.

> A client-side guard isn't security. Anyone who wants to bypass it can, so permissions must be checked on the server too.

## RedirectCommand

`RedirectCommand` is a `UrlTree` with navigation options. In `adminGuard`, `skipLocationChange: true` shows `Login` without changing the address bar: a regular user who came from `/account` to `/admin` sees `Login` and the URL stays `/account`. Other options are the same as `router.navigate`'s, such as `replaceUrl`. [Since version 22.2](https://github.com/angular/angular/blob/main/CHANGELOG.md) you can also throw a `RedirectCommand` from a guard or resolver.

## canMatch

A `canActivate` that returns `false` stops navigation. A `canMatch` that returns `false` says the route "doesn't match", and the router keeps looking. Here two routes have the path `dashboard`: an admin gets `AdminDashboard`, and everyone else falls through to `UserDashboard`. Same URL, different component. `canMatch` replaces the old `canLoad`.

## canDeactivate

`CanDeactivateFn<T>` receives the component being left as its first argument:

```typescript
import { Component, signal } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

@Component({
  selector: 'app-editor',
  template: `<textarea (input)="dirty.set(true)"></textarea>`,
})
export class Editor {
  readonly dirty = signal(false);
}

export const unsavedChanges: CanDeactivateFn<Editor> = (editor) =>
  !editor.dirty() || confirm('Discard unsaved changes?');
```

After typing, navigating to `/login` shows a prompt. If the user declines, navigation stops and the URL stays `/editor`.

## resolver

[`ResolveFn<T>`](https://angular.dev/api/router/ResolveFn) fetches a value before the route is activated, and its name is the key in `resolve`:

```typescript
import { Component, Service, inject, input } from '@angular/core';
import { ResolveFn } from '@angular/router';

@Service()
export class Users {
  async name(id: string) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return `User #${id}`;
  }
}

export const userName: ResolveFn<string> = (route) => inject(Users).name(route.paramMap.get('id')!);

@Component({ selector: 'app-profile', template: `<h1>{{ userName() }}</h1>` })
export class Profile {
  readonly userName = input.required<string>();
}
```

With `withComponentInputBinding()` ([URL parameters](en/posts/angular-route-params/)) the result arrives in an `input.required` of the same name, and `/users/42` shows `User #42` from the first render, with no empty intermediate state. Know the price: navigation is blocked until the resolver finishes, and an error in it fails the navigation. So fetch only what the page can't do without. Information that can appear gradually is better loaded in the component.

### In older versions

Guards were written as classes implementing an interface:

```typescript
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Auth } from './guards';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private auth: Auth,
    private router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    return this.auth.user() !== null || this.router.createUrlTree(['/login']);
  }
}
```

and registered in the route as the class itself: `canActivate: [AuthGuard]`. That still works, but since version 15.2 passing classes and `InjectionToken`s as guards and resolvers is [deprecated](https://github.com/angular/angular/blob/main/CHANGELOG.md), and the direction is functions. An existing class can still be used inside a function: `canActivate: [() => inject(AuthGuard).canActivate()]`. `canLoad` and `CanLoadFn` are deprecated too, and the API points to `canMatch`.

## Mistakes beginners make

- **Returning `false` and navigating manually afterwards.** Return a `UrlTree` or `RedirectCommand` and let the router do the redirect.
- **Relying on a guard alone for permissions.** It hides pages, not data. The server has to check on its own.

## What's next

Next: router extras. The page title, view transitions, scroll restoration and anchor scrolling.
