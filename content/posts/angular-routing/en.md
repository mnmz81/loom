---
title: "Routing in Angular: Routes, router-outlet and routerLink"
summary: "The Angular router: defining routes with provideRouter, <router-outlet>, links with routerLink and routerLinkActive, redirects with redirectTo and a 404 page with **."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 32 }
---

An Angular app is one HTML page. [The router](https://angular.dev/guide/routing) swaps the content by URL without reloading the page, and the address in the browser bar still changes, so the back button and bookmarks work.

Every example was checked with Angular 22.2 and Vitest.

## Routes and provideRouter

A route connects a path to a component. Three simple pages:

```typescript
import { Component } from '@angular/core';

@Component({ selector: 'app-home', template: `<h1>Home</h1>` })
export class Home {}

@Component({ selector: 'app-about', template: `<h1>About</h1>` })
export class About {}

@Component({ selector: 'app-not-found', template: `<h1>Page not found</h1>` })
export class NotFound {}
```

In `app.routes.ts`, which already exists in a project created by `ng new`:

```typescript
import { Routes } from '@angular/router';
import { About, Home, NotFound } from './pages';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'about', component: About },
  { path: 'info', redirectTo: 'about' },
  { path: '**', component: NotFound },
];
```

`path` is written without a leading `/`. [`provideRouter`](https://angular.dev/api/router/provideRouter) in `app.config.ts` hands the array to the router:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)],
};
```

## router-outlet and routerLink

`<router-outlet />` marks where the current route's component is shown. `routerLink` turns a link into in-app navigation:

```typescript
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav>
      <a routerLink="/home" routerLinkActive="active" ariaCurrentWhenActive="page">Home</a>
      <a routerLink="/about" routerLinkActive="active" ariaCurrentWhenActive="page">About</a>
    </nav>
    <router-outlet />
  `,
})
export class App {}
```

`routerLink` produces a real `href="/about"`, so the link can be opened in a new tab. A normal click navigates without reloading, and `About` appears under the `nav`. A plain `<a href="/about">` would reload the whole app.

[`routerLinkActive`](https://angular.dev/api/router/RouterLinkActive) adds the `active` class to the current page's link, and `ariaCurrentWhenActive="page"` adds `aria-current="page"` to it, so a screen reader also knows where the user is. `routerLinkActive` alone doesn't add `aria-current`. By default a link counts as active when the current URL is a child path of it too (`/about/team`), and `[routerLinkActiveOptions]="{ exact: true }"` limits it to an exact match.

## Redirects and a 404 page

The router walks the array in order, and the first route that matches wins:

- `redirectTo` replaces the URL. `/info` becomes `/about`, so old links keep working.
- `pathMatch: 'full'` is required on an empty-path redirect. The default, `'prefix'`, checks whether the path is the start of the URL, and an empty path is the start of every URL. [Without `'full'`](https://angular.dev/guide/routing/redirecting-routes) every URL would be redirected.
- `**` matches any URL, so it goes last. `/nope/deep` shows `Page not found`, and the URL stays as it is.

### In older versions

In NgModule apps, the router was registered with `RouterModule.forRoot` inside `AppModule`:

```typescript
import { Component, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes';

@Component({
  selector: 'app-root',
  standalone: false,
  template: `<a routerLink="/home" routerLinkActive="active">Home</a> <router-outlet></router-outlet>`,
})
export class AppComponent {}

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, RouterModule.forRoot(routes)],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

The routes array is the same. `RouterModule` brings `routerLink` and `router-outlet` to all of the module's components, instead of `imports` in each component. `<router-outlet></router-outlet>` with a closing tag shows up in old code, because self-closing tags on components are supported only since version 15.1.

## Mistakes beginners make

- **Putting `**` in the middle of the array.** No route after it will ever match.
- **Forgetting `pathMatch: 'full'` on a `''` redirect.** Every URL gets redirected, not only `/`.

## What's next

Next: nested routes. `children`, an outlet inside a component, and relative navigation.
