---
title: "Migrating an existing Angular app to zoneless, step by step"
summary: "A real move from Zone.js to zoneless: zoneless tests first, signals instead of plain fields, afterNextRender instead of onStable, removing zone.js from angular.json, and the build size compared."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 26 }
---

An app still running on Zone.js was usually created before v21, or updated with `ng update` (the v21 migration adds `provideZoneChangeDetection` to it, as explained in [the Zone.js post](en/posts/angular-zone-js/)). This post moves a small app like that to zoneless, following the [zoneless guide](https://angular.dev/guide/zoneless), and shows the real output of every step.

Every example was checked with Angular 22.2, zone.js 0.16 and Vitest 5.

## The starting point

The app is set up as in the Zone.js post: `provideZoneChangeDetection({ eventCoalescing: true })` in `app.config.ts` and `"polyfills": ["zone.js"]` in `angular.json`. It has one component that depends on Zone.js in two ways:

```typescript
import { ChangeDetectionStrategy, Component, ElementRef, NgZone, inject, viewChild } from '@angular/core';
import { take } from 'rxjs';

@Component({
  selector: 'app-inbox',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <input #search placeholder="Search" />
    <p>Unread: {{ unread }}</p>
  `,
})
export class Inbox {
  protected unread = 0;
  private readonly search = viewChild.required<ElementRef<HTMLInputElement>>('search');

  constructor() {
    inject(NgZone).onStable.pipe(take(1)).subscribe(() => {
      this.search().nativeElement.focus();
    });
    setTimeout(() => (this.unread = 3), 50);
  }
}
```

- `unread` changes in a timer, and only Zone.js's automatic check shows it.
- Focusing the search box waits for `onStable`, which doesn't emit without Zone.js.

## Step 1: zoneless tests

Before touching the app, run the tests without a zone. TestBed is supposed to be [zoneless by default](https://angular.dev/guide/zoneless#using-zoneless-in-testbed), but in this run, with zone.js still loaded and no provider in the test, the component still updated after the timer. Only an explicit `provideZonelessChangeDetection()`, which the docs describe as optional, made the test truly zoneless:

```typescript
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Inbox } from './inbox';

it('shows unread count and focuses search', async () => {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(Inbox);
  await new Promise((r) => setTimeout(r, 100));
  await fixture.whenStable();

  const el: HTMLElement = fixture.nativeElement;
  expect(el.querySelector('p')!.textContent).toBe('Unread: 3');
  expect(document.activeElement).toBe(el.querySelector('input'));
});
```

The test fails, as it should (output shortened):

```text
 FAIL  |ng-template| src/app/inbox.spec.ts > shows unread count and focuses search
AssertionError: expected 'Unread: 0' to be 'Unread: 3' // Object.is equality
 ❯ src/app/inbox.spec.ts:12:46
 ❯ _ZoneDelegate.invoke node_modules/zone.js/fesm2015/zone.js:356:158
 ❯ _ZoneImpl.run node_modules/zone.js/fesm2015/zone.js:125:35
```

The stack trace shows one of the reasons to leave Zone.js too: most of its frames belong to zone.js.

## Step 2: fix the component

```typescript
import { Component, ElementRef, afterNextRender, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-inbox',
  template: `
    <input #search placeholder="Search" />
    <p>Unread: {{ unread() }}</p>
  `,
})
export class Inbox {
  protected readonly unread = signal(0);
  private readonly search = viewChild.required<ElementRef<HTMLInputElement>>('search');

  constructor() {
    afterNextRender(() => this.search().nativeElement.focus());
    setTimeout(() => this.unread.set(3), 50);
  }
}
```

- `unread` became a [signal](en/posts/angular-signals/), and updating it schedules a check regardless of any zone. When a field can't become a signal, `markForCheck` after the assignment does the same job.
- `onStable` was replaced with [`afterNextRender`](https://angular.dev/api/core/afterNextRender), which runs once after the next render.
- `Eager` is gone: the component reports every change itself, so OnPush is enough.

Now the test passes, with the provider and without it.

## Step 3: take Zone.js out

1. Delete `provideZoneChangeDetection` from `app.config.ts`. Since v21 zoneless is the default, and there is nothing to add. On v20, replace it with `provideZonelessChangeDetection()`.
2. Delete `"zone.js"` from `polyfills` in `angular.json`. In a Karma project also delete `zone.js` and `zone.js/testing` from the `test` target, and in a project with `polyfills.ts` their import lines. The Vitest builder takes the polyfills from the `build` target.
3. Remove the package:

```bash
npm uninstall zone.js
```

`ng build` before and after:

```text
Initial chunk files   | Names         |  Raw size | Estimated transfer size
main-2E3XIAPI.js      | main          | 202.50 kB |                54.89 kB
polyfills-LVNOU2XZ.js | polyfills     |  35.88 kB |                11.64 kB
styles-5INURTSO.css   | styles        |   0 bytes |                 0 bytes

                      | Initial total | 238.38 kB |                66.53 kB

Initial chunk files | Names         |  Raw size | Estimated transfer size
main-434R6XQB.js    | main          | 201.93 kB |                55.01 kB
styles-5INURTSO.css | styles        |   0 bytes |                 0 bytes

                    | Initial total | 201.93 kB |                55.01 kB
```

The polyfills file is gone, and the initial bundle shrank by 36 kB raw (about 11.5 kB transferred). In this app zone.js was the only polyfill.

## Step 4: hunt for what's left

A real app has more than one component. This search finds direct zone usage (here, on the files from the starting point):

```bash
grep -rnE "onStable|onMicrotaskEmpty|onUnstable|isStable|provideZoneChangeDetection|zone\.js" src/
```

```text
src/app/inbox.ts:17:    inject(NgZone).onStable.pipe(take(1)).subscribe(() => {
src/app/app.config.ts:1:import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
src/app/app.config.ts:8:    provideZoneChangeDetection({ eventCoalescing: true }),
```

The silent changes, a plain field changed in `subscribe` or a timer, don't show up in grep. For those you have zoneless tests and [an exhaustive check during development](en/posts/angular-reactivity-model/). Two more places to check: templates that depend on [reactive forms](https://angular.dev/guide/zoneless#reactive-forms-in-zoneless-applications), and async work in SSR that needs [`PendingTasks`](en/posts/angular-zoneless/).

## Mistakes beginners make

- **Removing zone.js from `polyfills` before the tests pass zoneless.** The app still builds, but components stop updating without any error.
- **Sprinkling `markForCheck` everywhere instead of signals.** It works, but a signal fixes the template and OnPush in one go.
- **Deleting `runOutsideAngular` calls.** They are [zoneless-compatible](https://angular.dev/guide/zoneless#remove-ngzoneonmicrotaskempty-ngzoneonunstable-ngzoneisstable-or-ngzoneonstable), and there is no need to touch them.

## What's next

Next post: how signals, OnPush and zoneless work together, and a checklist for when the screen doesn't update.
