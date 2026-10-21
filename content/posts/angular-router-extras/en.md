---
title: "Angular router extras: page title, view transitions, scrolling and navigation events"
summary: "Page titles with title and TitleStrategy, withViewTransitions, scroll restoration and anchor scrolling with withInMemoryScrolling, withRouterConfig, and the navigation events."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 37 }
---

Once navigation works, a few small details decide whether the app feels like a website: the tab title, scroll that returns to its place after "back", and a smooth transition between pages. All of them are set up as features of `provideRouter`.

Every example was checked with Angular 22.2. I also checked the scrolling and view transitions in a real browser (Chromium), because they don't work in jsdom.

## The page title

[`title`](https://angular.dev/guide/routing/define-routes#page-titles) on a route sets `document.title` when the route is activated. It can be a string or a `ResolveFn` ([resolvers](en/posts/angular-guards-resolvers/)). To add the site name to every title, replace the `TitleStrategy`:

```typescript
import { Service, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ResolveFn, RouterStateSnapshot, TitleStrategy } from '@angular/router';

@Service()
export class LoomTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot) {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} | Loom` : 'Loom');
  }
}

export const postTitle: ResolveFn<string> = (route) => `Post ${route.paramMap.get('slug')}`;
```

`buildTitle` returns the `title` of the deepest route, or `undefined` when there is none. Once the strategy is registered, `/docs` shows `Docs | Loom` and `/posts/intro` shows `Post intro | Loom`. `/` has no `title` and shows `Loom`.

## All the features in provideRouter

```typescript
import { ApplicationConfig } from '@angular/core';
import {
  Routes,
  TitleStrategy,
  provideRouter,
  withInMemoryScrolling,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';
import { Docs, Home, Post } from './pages';
import { LoomTitleStrategy, postTitle } from './title';

const routes: Routes = [
  { path: '', component: Home },
  { path: 'docs', component: Docs, title: 'Docs' },
  { path: 'posts/:slug', component: Post, title: postTitle },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
    { provide: TitleStrategy, useExisting: LoomTitleStrategy },
  ],
};
```

- **`withViewTransitions()`** runs the swap of components inside [`document.startViewTransition`](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API), so the browser performs a smooth transition, by default a fade between old and new. In a browser that doesn't support it, navigation is normal, with no animation. In the test, every navigation called `startViewTransition` once. To style the transition, write CSS on `::view-transition-old()` and `::view-transition-new()` in [global styles](https://angular.dev/guide/routing/route-transition-animations), not in a component's styles. `withViewTransitions` is still marked developer preview.
- **`scrollPositionRestoration: 'enabled'`**: navigating forward scrolls to the top of the page, and "back" returns to where the user was. On a long page I scrolled to `y: 500` on home, went to `/docs` and back, and the page returned to `y: 500`. The default, `'disabled'`, leaves scrolling as it is.
- **`anchorScrolling: 'enabled'`**: a link with `fragment="install"` leads to `/docs#install`, and the page scrolls to the element with `id="install"`. In the test the element reached the top of the window.
- **`onSameUrlNavigation: 'reload'`**: navigating to the URL that's already open runs the whole navigation cycle again, including guards and resolvers. The default, `'ignore'`, ignores it. This is one of the options of [`withRouterConfig`](https://angular.dev/guide/routing/customizing-route-behavior#router-configuration-options), next to `paramsInheritanceStrategy` from the post on parameters.

## Navigation events

The router publishes [events](https://angular.dev/guide/routing/lifecycle-and-events) on `router.events`. A successful navigation to a route with a resolver goes through:

```text
NavigationStart, RoutesRecognized, GuardsCheckStart, ChildActivationStart, ActivationStart,
GuardsCheckEnd, ResolveStart, ResolveEnd, ActivationEnd, ChildActivationEnd, NavigationEnd
```

Every navigation ends with one of `NavigationEnd`, `NavigationCancel`, `NavigationError` or `NavigationSkipped`. Usually you don't need to listen to all the events. For a loading indicator there's a signal, and to know about a loaded page you filter one event:

```typescript
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    @if (navigating()) {
      <p role="status">Loading…</p>
    }
    <router-outlet />
    <footer>Last page: {{ lastUrl()?.urlAfterRedirects }}</footer>
  `,
})
export class App {
  private readonly router = inject(Router);
  protected readonly navigating = computed(() => this.router.currentNavigation() !== null);
  protected readonly lastUrl = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    { initialValue: null },
  );
}
```

`router.currentNavigation()` is a signal that returns the navigation running right now, or `null`. While a resolver runs, `Loading…` is shown, and after navigating to `/docs` finishes the footer shows `Last page: /docs`.

### In older versions

In NgModule apps the same options went into `RouterModule.forRoot` as an object:

```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled',
      onSameUrlNavigation: 'reload',
      enableViewTransitions: true,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
```

`title` on a route and `TitleStrategy` were added in version 14, and view transitions in version 17. Before `title`, you set the title by hand with the `Title` service in each component. `router.getCurrentNavigation()` was replaced by `router.currentNavigation()` [in version 20.2](https://github.com/angular/angular/blob/main/CHANGELOG.md), and the old one is deprecated.

## Mistakes beginners make

- **Styling the view transition in a component's styles.** The `::view-transition-*` pseudo-elements belong to the whole page, and view encapsulation blocks them. The style belongs in `styles.css`.
- **Expecting scroll to be restored without enabling it.** By default the router neither returns to the previous position nor scrolls to anchors.

## What's next

Next: HttpClient. Calls to a server, `provideHttpClient` and the response types.
