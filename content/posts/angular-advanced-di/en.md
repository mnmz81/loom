---
title: "Advanced DI in Angular: multi, provideAppInitializer, environment injectors and injectAsync"
summary: "Providers with multi: true, code that runs before the app starts with provideAppInitializer, your own environment injector, and lazy-loading a service with Angular 22's injectAsync."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 31 }
---

Four DI tools you don't need every day, but when you do, there's no simple substitute.

Every example was checked with Angular 22.2 and Vitest, and the `ng build` output is from a real run.

## Several values for one token: multi: true

Normally a new provider for a token replaces the previous one. With `multi: true` they add up, and `inject` returns an array:

```typescript
import { InjectionToken } from '@angular/core';

export const VALIDATORS = new InjectionToken<((value: string) => string | null)[]>('VALIDATORS');

export const validatorProviders = [
  { provide: VALIDATORS, multi: true, useValue: (v: string) => (v ? null : 'required') },
  { provide: VALIDATORS, multi: true, useValue: (v: string) => (v.length <= 5 ? null : 'too long') },
];
```

`inject(VALIDATORS)` returns an array of both functions, and for `'too long value'` they return `[null, 'too long']`. Each library or feature can add a function without knowing about the others. Angular's own tokens work this way too, such as `HTTP_INTERCEPTORS` and `APP_INITIALIZER` at the end of this post.

## Code that runs before startup: provideAppInitializer

[`provideAppInitializer`](https://angular.dev/api/core/provideAppInitializer) runs a function while the app starts. If it returns a Promise or an Observable, the app waits for it before it finishes starting:

```typescript
import { Service, provideAppInitializer, inject } from '@angular/core';

@Service()
export class Settings {
  locale = 'en';

  async load() {
    await new Promise((resolve) => setTimeout(resolve, 50));
    this.locale = 'he';
  }
}

export const settingsInitializer = provideAppInitializer(() => inject(Settings).load());
```

Add `settingsInitializer` to `providers` in `app.config.ts`, and every component already sees `locale` as `'he'`. The function runs in an injection context, so `inject` is allowed in it. The common use is loading settings or translations from the server. Any wait here delays the first render, so keep it short.

## Your own environment injector

[`createEnvironmentInjector`](https://angular.dev/api/core/createEnvironmentInjector) creates a new injector with its own providers, under an existing one:

```typescript
import { EnvironmentInjector, InjectionToken, Service, createEnvironmentInjector, inject } from '@angular/core';

export const REPORT_LABEL = new InjectionToken<string>('REPORT_LABEL');

@Service()
export class ReportsFeature {
  private readonly parent = inject(EnvironmentInjector);
  private injector?: EnvironmentInjector;

  open() {
    this.injector ??= createEnvironmentInjector(
      [{ provide: REPORT_LABEL, useValue: 'Q3' }],
      this.parent,
      'reports',
    );
    return this.injector.get(REPORT_LABEL);
  }

  close() {
    this.injector?.destroy();
    this.injector = undefined;
  }
}
```

`open()` returns `'Q3'`. The new injector sees everything in root (`Settings`, for example), but root doesn't see `REPORT_LABEL`. `destroy()` destroys the services created in it and runs their cleanup functions. The string `'reports'` shows up in error messages. The router does this for you: for every route with `providers` it [creates an environment injector](https://angular.dev/guide/di/defining-dependency-providers#route-providers), so most apps never call this function directly.

## A service loaded only when needed: injectAsync

A heavy service used only on a button click doesn't need to be in the initial bundle. [`injectAsync`](https://angular.dev/guide/di/lazy-loading-services), new in Angular 22, loads it with a dynamic `import()`. The service must be registered in root, with `@Service()` or `providedIn: 'root'`:

```typescript
import { Service } from '@angular/core';

@Service()
export default class ReportExporter {
  export() {
    return 'report.csv';
  }
}
```

```typescript
import { Component, injectAsync, onIdle, signal } from '@angular/core';

@Component({
  selector: 'app-report',
  template: `<button (click)="export()">Export</button> {{ file() }}`,
})
export class Report {
  private readonly exporter = injectAsync(() => import('./report-exporter'), { prefetch: onIdle });
  protected readonly file = signal('');

  async export() {
    const exporter = await this.exporter();
    this.file.set(exporter.export());
  }
}
```

`injectAsync` returns a function. The first call loads the file and returns a Promise of the instance, and later calls reuse the same Promise. Because `ReportExporter` is an `export default`, you can pass the `import()` as is. Without `prefetch` the file loads only on click, and `onIdle` loads it ahead of time when the browser is idle. `ng build` shows the service went into a separate file:

```text
Initial chunk files | Names           |  Raw size | Estimated transfer size
chunk-7LX2AGXN.js   | -               | 105.73 kB |                31.93 kB
main-KAZJBYU6.js    | main            |  88.87 kB |                22.58 kB
styles-5INURTSO.css | styles          |   0 bytes |                 0 bytes

                    | Initial total   | 194.60 kB |                54.51 kB

Lazy chunk files    | Names           |  Raw size | Estimated transfer size
chunk-DOF22DY3.js   | report-exporter | 204 bytes |               204 bytes
```

### In older versions

Before `provideAppInitializer`, an init function was registered through the `APP_INITIALIZER` token, with `multi: true` and a factory that returns a function:

```typescript
import { APP_INITIALIZER } from '@angular/core';
import { Settings } from './config';

export const oldInitializer = {
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: (settings: Settings) => () => settings.load(),
  deps: [Settings],
};
```

`APP_INITIALIZER` is [deprecated since version 19](https://angular.dev/api/core/APP_INITIALIZER), but it still works and is common in existing code.

## Mistakes beginners make

- **Forgetting `multi: true` on one of the providers.** Angular doesn't mix both kinds on one token, and throws `Cannot mix multi providers and regular providers`.
- **Also importing the `injectAsync` service the regular way.** A regular `import` of `ReportExporter` in another file puts its code in the initial bundle, and the separate chunk is left almost empty.

## What's next

The next post starts the router: `provideRouter`, `<router-outlet>`, `routerLink`, redirects and a 404 page.
