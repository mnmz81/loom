---
title: "SSR and hydration in Angular: server rendering without rendering twice"
summary: "ng add @angular/ssr, RenderMode.Server, provideClientHydration and what it includes in v22, why direct DOM changes break hydration, afterNextRender for browser code, and PendingTasks."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 65 }
---

In a plain app the server sends an almost empty `index.html`, and the page appears only after the JavaScript loads and runs. With SSR (server-side rendering) Angular renders the page on the server and sends full HTML. Hydration is the step where Angular in the browser adopts the existing DOM and attaches events to it, instead of deleting it and building it again.

Every example was checked with Angular 22.2 and `@angular/ssr` 22.2.3: `ng build`, a running Node server, and `curl` plus the browser console.

## Adding SSR

In a new project: `ng new --ssr`. In an existing one, per the [SSR guide](https://angular.dev/guide/ssr):

```bash
ng add @angular/ssr
```

```text
CREATE src/main.server.ts (292 bytes)
CREATE src/app/app.config.server.ts (426 bytes)
CREATE src/app/app.routes.server.ts (166 bytes)
CREATE src/server.ts (1609 bytes)
UPDATE angular.json (2147 bytes)
UPDATE tsconfig.app.json (416 bytes)
UPDATE package.json (1021 bytes)
UPDATE src/app/app.config.ts (406 bytes)
```

`server.ts` is an Express server, and `app.config.server.ts` adds `provideServerRendering` to the browser config. `app.routes.server.ts` sets how each route renders. The default is `RenderMode.Prerender` for every route, meaning static HTML at build time (that's the [SSG](en/posts/angular-ssg/) post). To render on every request:

```typescript
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
```

After `ng build` you run `node dist/<project>/server/server.mjs`. `ng serve` renders on the server in development too.

## Hydration

`ng add` added one line to `app.config.ts`:

```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
  ],
};
```

In Angular 22, [`provideClientHydration()`](https://angular.dev/guide/hydration) includes DOM reuse, transferring `HttpClient` responses from the server to the browser (so the request isn't sent again), [incremental hydration](en/posts/angular-incremental-hydration/), and with it event replay: clicks that happen before hydration finishes are recorded and replayed after it. This is the HTML the server returned for a component with a button:

```text
<app-root ng-version="22.2.3" ngh="0" ng-server-context="ssr">
<app-counter ngh="0">
<button type="button" jsaction="click:;">Clicked 0 times</button>
```

`ngh` is the data hydration uses to match the DOM to components, and `jsaction` marks events that event replay captures. In dev mode the console confirms: "Angular hydrated 4 component(s) and 15 node(s), 0 component(s) were skipped".

## What breaks hydration

Hydration expects the browser DOM to be exactly what the template would produce. This component adds an element directly to the DOM:

```typescript
import { Component, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'app-badge-dom',
  template: `<span>New</span>`,
})
export class BadgeDom {
  constructor() {
    const host = inject(ElementRef).nativeElement as HTMLElement;
    const icon = host.ownerDocument.createElement('i');
    icon.textContent = '★';
    host.appendChild(icon);
  }
}
```

The server produced `<app-badge-dom><i>★</i><span>New</span></app-badge-dom>`, and the browser threw `NG0500: During hydration Angular expected <span> but found <i>.` The fix is to put the `<i>` in the template. Per the guide, invalid HTML (`<div>` inside `<p>`, a table without `<tbody>`) and `innerHTML` cause the same error. When there's no way around it, for example a chart library that draws on its own, you can put `ngSkipHydration` on the component's tag: it re-renders in the browser, without the benefits of hydration.

## Code that runs only in the browser

The server has no `window`, global `document` or `localStorage`. `signal(localStorage.getItem('theme'))` in a component field crashed server rendering with `ReferenceError: localStorage is not defined`. [`afterNextRender`](https://angular.dev/guide/ssr) runs only in the browser, after rendering:

```typescript
import { afterNextRender, Component, signal } from '@angular/core';

@Component({
  selector: 'app-theme-label',
  template: `<p>Theme: {{ theme() }}</p>`,
})
export class ThemeLabel {
  protected readonly theme = signal('light');

  constructor() {
    afterNextRender(() => {
      this.theme.set(localStorage.getItem('theme') ?? 'light');
    });
  }
}
```

The server sends `Theme: light`, and hydration finds the same text in the browser. Only then does `afterNextRender` read `localStorage`, and in the test the text changed to `Theme: dark`. `afterNextRender` is covered in the [lifecycle](en/posts/angular-lifecycle/) post. The guide recommends separate server and browser providers over `isPlatformBrowser` checks, and especially not using `isPlatformBrowser` inside `@if`: different content on server and browser breaks hydration and makes the page jump.

## PendingTasks: when the server is done

The server sends the HTML once the app is stable. Without Zone.js, Angular doesn't know about your `setTimeout` or `fetch`, so it waits only for tasks it knows, such as `HttpClient` requests ([zoneless](en/posts/angular-zoneless/)). [`PendingTasks`](https://angular.dev/guide/zoneless) adds a task of your own:

```typescript
import { Component, inject, PendingTasks, signal } from '@angular/core';

function loadQuote(): Promise<string> {
  return new Promise((resolve) => setTimeout(() => resolve('Simplicity is prerequisite for reliability.'), 50));
}

@Component({
  selector: 'app-quote',
  template: `<blockquote>{{ quote() ?? 'Loading…' }}</blockquote>`,
})
export class Quote {
  protected readonly quote = signal<string | undefined>(undefined);

  constructor() {
    inject(PendingTasks).run(async () => {
      this.quote.set(await loadQuote());
    });
  }
}
```

With `run`, the server returned the quote. The same component without `PendingTasks` returned `Loading…`, because the HTML was sent before the Promise settled. `run` is marked developer preview; the stable API is `add()`, which returns a function you call when done. Note that in the browser the constructor runs again and the data is loaded again. For HTTP data prefer `HttpClient`, whose response is transferred from the server.

### In older versions

Up to version 16, SSR came from the `@nguniversal/express-engine` package (Angular Universal); `@angular/ssr` replaced it from version 17. Code from before version 22 often has `withEventReplay()`:

```typescript
provideClientHydration(withEventReplay());
```

In 22 the incremental hydration that's on by default includes event replay, and the guide says `withEventReplay()` can be removed.

## Mistakes beginners make

- **Direct DOM changes** (`appendChild`, `innerHTML`, third-party libraries) in a component that gets hydrated. The result is `NG0500`.
- **Touching `window` or `localStorage` in the constructor or a field.** On the server that's a `ReferenceError`. Move it to `afterNextRender`.
- **Forgetting `allowedHosts`.** The production server rejected a request to `localhost` with `Header "host" with value "localhost:4383" is not allowed` and status 400. Add your domains to `security.allowedHosts` in `angular.json` or to the `NG_ALLOWED_HOSTS` environment variable ([security](https://angular.dev/best-practices/security)).

## What's next

Next: incremental hydration, `@defer` with `hydrate on` triggers, `hydrate never`, and how it differs from a plain `@defer`.
