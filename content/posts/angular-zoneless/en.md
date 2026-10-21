---
title: "Angular without Zone.js: what zoneless means"
summary: "Zoneless, the default since v21: what makes Angular render, why NgZone.onStable no longer emits, PendingTasks for SSR, TestBed with whenStable, and what about reactive forms."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 25 }
---

Since v21, a new app doesn't load Zone.js. Angular no longer guesses when something changed: it renders only when told. According to the [zoneless guide](https://angular.dev/guide/zoneless#enabling-zoneless-in-an-application), there is nothing to do to turn it on, only make sure `provideZoneChangeDetection` doesn't appear anywhere.

Every example was checked with Angular 22.2 and Vitest 5.

## What triggers rendering

[`provideZonelessChangeDetection`](https://angular.dev/api/core/provideZonelessChangeDetection) lists the APIs that schedule change detection in a zoneless app:

- `ChangeDetectorRef.markForCheck()`, including the automatic call from `AsyncPipe`;
- `ComponentRef.setInput()`;
- updating a signal read in a template;
- a template or host listener running;
- attaching a view marked dirty by one of these, and removing a view;
- registering a render hook such as `afterNextRender` (templates refresh only if the hook does one of the above).

That's all. `setTimeout`, a resolved promise and a server response aren't on the list, unless their code updates a signal or calls `markForCheck`.

## What no longer works

An old-style component: `Eager`, a plain field changed in a timer, and a subscription to `NgZone.onStable`:

```typescript
import { ChangeDetectionStrategy, Component, NgZone, inject } from '@angular/core';

@Component({
  selector: 'app-clock',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<p>Seconds: {{ seconds }}</p>`,
})
export class Clock {
  protected seconds = 0;
  readonly zone = inject(NgZone);
  stableEvents = 0;

  constructor() {
    this.zone.onStable.subscribe(() => this.stableEvents++);
    setTimeout(() => this.seconds++, 1000);
  }
}
```

The test waits for the timer to finish and prints the screen and the zone state:

```text
Seconds: 0
onStable events: 0 | isStable: true
```

- `seconds` is 1 in memory, but nobody said so, so the screen shows 0. `Eager` doesn't help: it decides who is checked when a check runs, not when it runs.
- According to [the docs](https://angular.dev/guide/zoneless#remove-ngzoneonmicrotaskempty-ngzoneonunstable-ngzoneisstable-or-ngzoneonstable), `onMicrotaskEmpty`, `onUnstable` and `onStable` never emit in a zoneless app, and `isStable` is always `true`. Code that waited for `onStable` to act after rendering should move to [`afterNextRender`](https://angular.dev/api/core/afterNextRender) or `afterEveryRender`.
- `NgZone.run` and `runOutsideAngular` keep working, and there is no need to delete them.

## PendingTasks and SSR

In SSR, Angular waits for the app to be "stable" before turning it into HTML. Zone.js used to decide when that happens. Without it, async work that has to make it into the HTML is registered with [`PendingTasks`](https://angular.dev/api/core/PendingTasks):

```typescript
import { Component, PendingTasks, inject, signal } from '@angular/core';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Component({
  selector: 'app-report',
  template: `<p>{{ status() }}</p>`,
})
export class Report {
  protected readonly status = signal('Loading...');
  private readonly tasks = inject(PendingTasks);

  load(tracked: boolean) {
    const work = async () => {
      await delay(50);
      this.status.set('Ready');
    };
    if (tracked) this.tasks.run(work);
    else work();
  }
}
```

The same stability is what `fixture.whenStable()` waits for in tests, so the difference is easy to check:

```typescript
import { TestBed } from '@angular/core/testing';
import { Report } from './report';

for (const tracked of [false, true]) {
  it(`whenStable with tracked=${tracked}`, async () => {
    const fixture = TestBed.createComponent(Report);
    fixture.componentInstance.load(tracked);
    await fixture.whenStable();
    console.log(`tracked=${tracked}:`, fixture.nativeElement.textContent);
    expect(fixture.nativeElement.textContent).toBe(tracked ? 'Ready' : 'Loading...');
  });
}
```

```text
tracked=false: Loading...
tracked=true: Ready
```

Without `PendingTasks`, stability came right away, and SSR would have sent "Loading...". `HttpClient` and Router navigation are already registered with `PendingTasks` internally, and observables have `pendingUntilEvent` from `@angular/core/rxjs-interop`. SSR is covered in [the SSR and hydration post](en/posts/angular-ssr-hydration/).

## Tests and forms

- **TestBed** is [zoneless by default](https://angular.dev/guide/zoneless#using-zoneless-in-testbed), even when zone.js is loaded. The docs recommend `await fixture.whenStable()` over `fixture.detectChanges()`, which runs a check even when Angular wouldn't have scheduled one.
- **Reactive forms:** according to [the docs](https://angular.dev/guide/zoneless#reactive-forms-in-zoneless-applications), `setValue`, `patchValue` and `FormArray.push` update the form and emit observables, but don't schedule change detection. A template that depends on form state needs `markForCheck` or a signal. [Signal Forms](en/posts/angular-signal-forms/) are built on signals from the start.

### In older versions

Before v21 you had to ask for zoneless explicitly. In v20:

```typescript
import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';

bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
});
```

According to the [changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md), the provider was added as experimental in v18 under the name `provideExperimentalZonelessChangeDetection`, got its current name in v20.0 and became stable in v20.2.

## Mistakes beginners make

- **Waiting for `NgZone.onStable` in zoneless code.** It never emits. Use `afterNextRender`.
- **Async work in SSR without `PendingTasks`.** The HTML is sent before the data arrives.
- **Adding `Eager` hoping for automatic updates.** No notification, no check, whatever the strategy.

## What's next

Next post: moving an existing app from Zone.js to zoneless, step by step, on a real app.
