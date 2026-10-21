---
title: "SSG in Angular: prerendering and outputMode: 'static'"
summary: "How Angular writes HTML for every route at build time: outputMode: 'static', RenderMode.Prerender, getPrerenderParams for routes with parameters, what lands in dist, and a real example from this blog."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 67 }
---

With [SSR](en/posts/angular-ssr-hydration/), a Node server renders each page on request. With SSG (Static Site Generation, or prerendering), rendering happens once, at build time: every route gets an HTML file, and you upload the folder to any static host, with no server. This blog is built that way.

Every example was checked with Angular 22.2.

## outputMode: 'static'

`ng add @angular/ssr` adds the server files to an existing project:

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

The command writes `"outputMode": "server"` to `angular.json`, which also produces a server application. For a static site, switch it to `static`:

```json
"build": {
  "builder": "@angular/build:application",
  "options": {
    "browser": "src/main.ts",
    "server": "src/main.server.ts",
    "outputMode": "static",
    "ssr": {
      "entry": "src/server.ts"
    }
  }
}
```

Per the builder's option description, `static` "generates a static site build artifact for deployment on any static hosting service", and `server` is only required for hybrid rendering or APIs. `main.server.ts` is still needed: Angular uses it to render the pages during the build.

## Server routes and getPrerenderParams

`app.routes.server.ts` sets [how each route renders](https://angular.dev/guide/ssr): `RenderMode.Prerender` at build time, `RenderMode.Server` on every request, and `RenderMode.Client` in the browser only. For a route with a parameter, like `posts/:slug`, Angular can't guess which values exist, so `getPrerenderParams` returns them:

```typescript
import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { PostStore } from './post-store';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'posts/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const slugs = inject(PostStore).slugs();
      return slugs.map((slug) => ({ slug }));
    },
  },
  { path: '**', renderMode: RenderMode.Prerender },
];
```

Each object in the array is one page: `{ slug: 'signals' }` becomes `/posts/signals`. The function runs at build time, and `inject` works in it only [before the first `await`](https://angular.dev/guide/ssr). The `**` route prerenders every other route that has no parameters. In the example `PostStore` returns two slugs, and `Post` receives `slug` as an input through `withComponentInputBinding` ([route parameters](en/posts/angular-route-params/)).

## What the build produces

```text
Prerendered 3 static routes.
Application bundle generation complete. [2.481 seconds]
```

```text
dist/ng-template/3rdpartylicenses.txt
dist/ng-template/browser/favicon.ico
dist/ng-template/browser/index.csr.html
dist/ng-template/browser/index.html
dist/ng-template/browser/main-MHOOVQS5.js
dist/ng-template/browser/posts/hello-angular/index.html
dist/ng-template/browser/posts/signals/index.html
dist/ng-template/browser/styles-5INURTSO.css
dist/ng-template/prerendered-routes.json
```

Each route has its own `index.html` with the content already inside (`<h1>Post: signals</h1>`), so a static server serves `/posts/signals/` without any code. `index.csr.html` is an empty shell (`<app-root></app-root>`) for pages that weren't prerendered, and `prerendered-routes.json` lists what was generated. There's no `server/` folder: you upload `browser/` as is.

## A real example: this blog

[Loom](https://mnmz81.github.io/loom/) builds with `"outputMode": "static"`, and this is an excerpt of its `app.routes.server.ts`:

```typescript
export const serverRoutes: ServerRoute[] = [
  {
    path: ':lang/posts/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => entryParams(readIndexes(), 'post'),
  },
  // Unknown `/<lang>/...` paths render the not-found page in the browser (GitHub Pages serves 404.html).
  { path: ':lang/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender },
];
```

Before `ng build`, a script turns the Markdown files into JSON files. `readIndexes` reads them with `readFileSync`, because `getPrerenderParams` runs in Node, and `entryParams` returns `{ lang, slug }` for every post in every language. An unknown URL under a language renders in the browser, through the GitHub Pages 404 page ([deployment is post 72](en/posts/angular-deploy-github-pages/)).

### In older versions

Before server routes, prerendering was set in `angular.json`, and the list of routes with parameters lived in a text file:

```json
"prerender": {
  "routesFile": "routes.txt",
  "discoverRoutes": true
}
```

The `prerender` option is still in the `@angular/build:application` schema, but today's `ng add @angular/ssr` gives you server routes.

## Mistakes beginners make

- **Forgetting `getPrerenderParams`.** The build fails with `The 'posts/:slug' route uses prerendering and includes parameters, but 'getPrerenderParams' is missing.`
- **Calling `inject` after `await`.** The injection context is gone by then. Make every `inject` call at the start of the function.
- **Uploading `dist/<app>` instead of `dist/<app>/browser`.** The files the browser needs are only in `browser/`.

## What's next

Next: translating the app with Angular's built-in i18n, `@angular/localize` and a build per language.
