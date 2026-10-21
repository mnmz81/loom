---
title: "PWA in Angular: service worker, ngsw-config.json and SwUpdate"
summary: "Turning an Angular app into a PWA: what ng add @angular/pwa changes, caching strategies in ngsw-config.json, a new-version prompt with SwUpdate, and testing offline on a production build."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 69 }
---

A PWA (Progressive Web App) is a web app you can install and that keeps working without a network. A service worker handles the offline part: a script the browser runs between the app and the network. Angular's service worker caches the app's files according to a config file and serves them from there.

Every example was checked with Angular 22.2.

## ng add @angular/pwa

```text
CREATE ngsw-config.json (639 bytes)
CREATE public/manifest.webmanifest (1229 bytes)
CREATE public/icons/icon-128x128.png (2875 bytes)
CREATE public/icons/icon-512x512.png (16332 bytes)
UPDATE angular.json (1969 bytes)
UPDATE package.json (829 bytes)
UPDATE src/app/app.config.ts (538 bytes)
UPDATE src/index.html (432 bytes)
```

(Two of the eight icons are kept here.) The command installs `@angular/service-worker`, adds `"serviceWorker": "ngsw-config.json"` to the `production` configuration, links the manifest in `index.html`, and registers the worker in `app.config.ts`:

```typescript
provideServiceWorker('ngsw-worker.js', {
  enabled: !isDevMode(),
  registrationStrategy: 'registerWhenStable:30000',
}),
```

`enabled: !isDevMode()` means plain `ng serve` has no service worker. `registerWhenStable:30000` registers it once there are no pending async tasks, and no later than 30 seconds.

## ngsw-config.json

```json
{
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.csr.html", "/index.html", "/manifest.webmanifest", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": ["/**/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)"]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api",
      "urls": ["/api/**"],
      "cacheConfig": { "strategy": "freshness", "maxSize": 50, "maxAge": "1d", "timeout": "3s" }
    }
  ]
}
```

`ng add` generated the `assetGroups`; we added `dataGroups`. Per the [config docs](https://angular.dev/ecosystem/service-workers/config):

- `installMode: "prefetch"` downloads every listed file up front, so the app works offline from the first visit. `lazy` caches a file only when it's requested.
- `dataGroups` are for API requests. `freshness` goes to the network first and falls back to the cache only after the `timeout`. `performance`, the default, answers from the cache without going to the network, and the answer can be stale up to `maxAge`.

At build time this file becomes `ngsw.json`, with a hash for every file. That's how the worker knows a new version is out.

## A new version with SwUpdate

When a new version ships, the worker downloads it in the background, but the open tab keeps running the old one. [`SwUpdate`](https://angular.dev/ecosystem/service-workers/communications) tells you when the new version is ready:

```typescript
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs';

@Component({
  selector: 'app-update-banner',
  template: `
    @if (ready()) {
      <p>A new version is available.</p>
      <button (click)="reload()">Reload</button>
    }
  `,
})
export class UpdateBanner {
  private readonly updates = inject(SwUpdate);

  protected readonly ready = toSignal(
    this.updates.versionUpdates.pipe(
      filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'),
      map(() => true),
    ),
    { initialValue: false },
  );

  protected reload() {
    document.location.reload();
  }
}
```

`versionUpdates` emits several event types, and `VERSION_READY` is the moment you can reload. `toSignal` from [RxJS interop](en/posts/angular-rxjs-interop/) turns the Observable into a signal. A test with a fake `SwUpdate` confirmed the prompt appears only after `VERSION_READY`, not after `VERSION_DETECTED`. There's also `activateUpdate()`, which moves the tab to the new version without a reload, but the docs warn it can break the app, because files loaded later belong to another version.

## Testing offline

The worker doesn't run under plain `ng serve`, so you test a production build ([docs](https://angular.dev/ecosystem/service-workers/getting-started)):

```bash
ng build
npx http-server -p 8080 -c-1 dist/<project-name>/browser
```

The build adds three files next to the app:

```text
dist/ng-template/browser/ngsw-worker.js
dist/ng-template/browser/ngsw.json
dist/ng-template/browser/safety-worker.js
```

Open `http://localhost:8080`, pick **Offline** under Network in DevTools, and reload. The app loads, and Network shows the requests came from the ServiceWorker. Browsers register a service worker only over HTTPS, or on localhost for development ([docs](https://angular.dev/ecosystem/service-workers)).

### In older versions

Apps with an NgModule register the worker through `ServiceWorkerModule`, and old code listens to `updates.available`, which no longer exists on Angular 22's `SwUpdate`:

```typescript
@NgModule({
  imports: [
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
})
export class AppModule {}
```

## Mistakes beginners make

- **Testing with `ng serve` and concluding the worker is broken.** `enabled: !isDevMode()` turns it off in development.
- **Putting an API that changes under `performance`.** Users get the cached answer until `maxAge`. For data that must be current, use `freshness`.
- **`activateUpdate()` without a reload.** New files load next to old code. Reloading is safer.

## What's next

Next: heavy computations in a Web Worker, so the UI doesn't freeze.
