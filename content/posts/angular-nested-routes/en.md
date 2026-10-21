---
title: "Nested routes in Angular: children, an inner outlet and relative navigation"
summary: "Routes inside routes: children and a router-outlet inside a component, a default child route, a layout component on an empty path, a 404 page outside the layout, and relative links with ../."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 33 }
---

A settings page has a fixed heading and menu, and only the part below them switches between "Profile" and "Security". That's what nested routes do: every route can have `children`, and its component shows them in a `<router-outlet>` of its own.

Every example was checked with Angular 22.2 and Vitest.

## children and an outlet inside a component

Three components. `Settings` has its own `<router-outlet />`:

```typescript
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-settings',
  imports: [RouterLink, RouterOutlet],
  template: `
    <h1>Settings</h1>
    <a routerLink="profile">Profile</a> <a routerLink="security">Security</a>
    <router-outlet />
  `,
})
export class Settings {}

@Component({ selector: 'app-profile', template: `<h2>Profile</h2>` })
export class Profile {}

@Component({
  selector: 'app-security',
  imports: [RouterLink],
  template: `
    <h2>Security</h2>
    <a routerLink="../profile">Back to profile</a>
    <button (click)="done()">Done</button>
  `,
})
export class Security {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  done() {
    this.router.navigate(['../..'], { relativeTo: this.route });
  }
}
```

And in the routes file:

```typescript
import { Routes } from '@angular/router';
import { Home, NotFound, Shell } from './shell';
import { Profile, Security, Settings } from './settings';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', component: Home },
      {
        path: 'settings',
        component: Settings,
        children: [
          { path: '', redirectTo: 'profile', pathMatch: 'full' },
          { path: 'profile', component: Profile },
          { path: 'security', component: Security },
        ],
      },
    ],
  },
  { path: '**', component: NotFound },
];
```

At `/settings/security`, the app's outlet shows `Settings`, and the outlet of `Settings` shows `Security`. A child's URL is the parent's path plus its own. A child with `path: ''` is the default: here `/settings` redirects to `/settings/profile`, so the lower part is never empty. ([nested outlets](https://angular.dev/guide/routing/show-routes-with-outlets))

## A layout on an empty path

The top route is `path: ''` with `Shell`. An empty path adds nothing to the URL, so `Home` is at `/` and `Settings` at `/settings`, but both are shown inside the layout:

```typescript
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterOutlet],
  template: `
    <header><a routerLink="/">Loom</a> <a routerLink="/settings">Settings</a></header>
    <main><router-outlet /></main>
  `,
})
export class Shell {}

@Component({ selector: 'app-home', template: `<h1>Home</h1>` })
export class Home {}

@Component({ selector: 'app-not-found', template: `<h1>Page not found</h1>` })
export class NotFound {}
```

## A 404 page outside the layout

The `**` sits outside `Shell`, at the top level. `/missing` matches none of `Shell`'s children, so the router moves on to `**` and shows only `Page not found`, without the header. If you want the 404 inside the layout, move `**` to the end of `Shell`'s `children`.

## Relative navigation

A `routerLink` without a leading `/` is relative to the route of the component it's written in ([navigating to routes](https://angular.dev/guide/routing/navigate-to-routes)):

- `routerLink="security"` in `Settings` produces `href="/settings/security"`.
- `routerLink="../profile"` in `Security` goes up one level, to `settings`, and from there to `profile`: `href="/settings/profile"`.
- In code, `router.navigate` needs `relativeTo` to know what the path is relative to. `['../..']` from `Security` goes up two levels, to `Shell`'s route, that is `/`.

Without `relativeTo`, `navigate` treats the path as starting from the root.

Relative links keep a component self-contained: if `settings` moves to another path, the links inside it keep working unchanged.

## Mistakes beginners make

- **Forgetting the `<router-outlet />` in the parent component.** The URL changes, but the child isn't shown anywhere.
- **Writing `routerLink="/profile"` when you mean `/settings/profile`.** A leading `/` makes the link absolute.

## What's next

Next: parameters in the URL. `users/:id`, query params, and receiving them as `input()` with `withComponentInputBinding`.
