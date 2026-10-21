---
title: "Zone.js: how Angular used to know something changed"
summary: "How Zone.js wraps the browser's async APIs so Angular checks the tree after every event, what NgZone and runOutsideAngular do, and how to turn it on in Angular 22."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 21 }
---

Up to v20, every new Angular app loaded Zone.js. Since v21 [zoneless is the default](https://angular.dev/guide/zoneless), but many existing apps still run on it, and it is worth knowing what it does before you take it out.

Every example was checked with Angular 22.2, zone.js 0.16 and Vitest 5.

## What Zone.js does

Zone.js wraps (monkey-patches) the browser's async APIs: DOM events, `setTimeout`, promises, network requests. Angular runs the app inside a zone of its own, "the Angular zone", so every callback registered from it runs through Zone.js:

1. Something async happens: a click, a timer, a server response.
2. The callback runs inside the Angular zone.
3. When the zone's task queue empties, [`NgZone`](https://angular.dev/api/core/NgZone) emits `onMicrotaskEmpty`.
4. Angular runs change detection from the root.

According to [the docs](https://angular.dev/guide/zoneless#why-use-zoneless), Zone.js has no insight into whether state actually changed, so the check runs more often than necessary.

## Turning Zone.js on in Angular 22

An app that needs Zone.js installs the package (`npm install zone.js`), adds the provider in `app.config.ts`:

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true })],
};
```

and loads it in the `polyfills` of `angular.json`:

```json
"build": {
  "builder": "@angular/build:application",
  "options": {
    "browser": "src/main.ts",
    "polyfills": ["zone.js"]
  }
}
```

[`provideZoneChangeDetection`](https://angular.dev/api/core/provideZoneChangeDetection) sets up `NgZone`-based change detection. `eventCoalescing` merges several events into one check. An app updated from v20 with `ng update` got this provider automatically: according to [the v21 changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#2100-2025-11-19), a migration adds it.

## Inside and outside the Angular zone

Two timers, a normal one and one registered inside `runOutsideAngular`:

```typescript
import { ChangeDetectionStrategy, Component, NgZone, inject } from '@angular/core';

@Component({
  selector: 'app-poller',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<p>Inside: {{ inside }} | Outside: {{ outside }}</p>`,
})
export class Poller {
  protected inside = 0;
  protected outside = 0;
  private readonly zone = inject(NgZone);

  constructor() {
    setTimeout(() => {
      this.inside++;
      console.log('inside, in Angular zone:', NgZone.isInAngularZone());
    }, 50);

    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        this.outside++;
        console.log('outside, in Angular zone:', NgZone.isInAngularZone());
      }, 100);
    });
  }
}
```

TestBed is zoneless by default even when zone.js is loaded, so the test adds the provider:

```typescript
import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Poller } from './poller';

it('Zone.js triggers a check after setTimeout', async () => {
  TestBed.configureTestingModule({ providers: [provideZoneChangeDetection()] });
  const fixture = TestBed.createComponent(Poller);
  fixture.autoDetectChanges();
  await new Promise((r) => setTimeout(r, 200));
  console.log(fixture.nativeElement.textContent);
  expect(fixture.nativeElement.textContent).toBe('Inside: 1 | Outside: 0');
});
```

```text
inside, in Angular zone: true
outside, in Angular zone: false
Inside: 1 | Outside: 0
```

No line of code asked for a render, yet `inside` showed up: Zone.js saw the timer finish and Angular checked the tree. `outside` changed outside the zone, so no check followed and the screen stayed at 0. `runOutsideAngular` is meant for work that doesn't need to update the screen, like polling or a third-party library that listens to many events ([zone pollution](https://angular.dev/best-practices/zone-pollution)). `zone.run(() => ...)` brings code back into the zone.

The `Eager` on the component is deliberate: since v22 the default is OnPush, and OnPush skips a component whose plain field changed even when Zone.js runs a check. The full explanation is in [the post on OnPush by default](en/posts/angular-onpush-default-v22/).

## Why Angular moved away from Zone.js

[The docs](https://angular.dev/guide/zoneless#why-use-zoneless) list four reasons:

- **Performance:** a check after every event, even when nothing changed.
- **Core Web Vitals:** Zone.js adds payload size and startup time.
- **Debugging:** stack traces are full of Zone.js frames, and it is hard to see why code running outside the zone doesn't update the screen.
- **Compatibility:** not every new browser API is patched, and `async`/`await` can't be patched at all, so it has to be downleveled at build time.

### In older versions

In the `angular.json` that `ng new` created in v20, Zone.js was loaded both in the app and in the tests (Karma):

```json
"test": {
  "builder": "@angular/build:karma",
  "options": {
    "polyfills": ["zone.js", "zone.js/testing"],
    "tsConfig": "tsconfig.spec.json"
  }
}
```

and its `app.config.ts` had `provideZoneChangeDetection({ eventCoalescing: true })`, exactly as in the example above.

## Mistakes beginners make

- **Updating a field from `runOutsideAngular` and expecting the screen to update.** Use `zone.run`, or a signal.
- **Thinking `provideZoneChangeDetection` brings back the old behavior in full.** It brings back the automatic checks, but an OnPush component still isn't checked without a notification.
- **Deleting `runOutsideAngular` calls when moving to zoneless.** [The docs](https://angular.dev/guide/zoneless#remove-ngzoneonmicrotaskempty-ngzoneonunstable-ngzoneisstable-or-ngzoneonstable) say they are zoneless-compatible, and removing them from a library can hurt the performance of apps that still use Zone.js.

## What's next

Next post: the `Eager` strategy, called `Default` until v22, which checks a component every time a check reaches it.
