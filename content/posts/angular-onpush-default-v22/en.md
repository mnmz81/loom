---
title: "OnPush by default in Angular 22: what changes in existing code"
summary: "What v22 does to components without an explicit strategy, what ng update adds (Eager, strictTemplates: false), what breaks without Eager, and how to adopt OnPush one component at a time."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 24 }
---

The [v22 changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#2200-2026-06-03) puts the change in one sentence: components without `changeDetection` are now OnPush by default, and to keep the previous behavior you write `ChangeDetectionStrategy.Eager`. This post is about what that means for code written before.

Every example was checked with Angular 22.2, zone.js 0.16 and Vitest 5. The update ran on a real project created with `ng new` in v21.

## What `ng update` does

The project got three extra components: one with no strategy, one with `Default` and one with `OnPush`. To simulate an older project, `strictTemplates` was also removed from `tsconfig.json` (`ng new` in v21 sets it to `true`). Then `ng update @angular/core@22 @angular/cli@22` ran. Part of the output:

```text
** Executing migrations of package '@angular/core' **

❯ Adds `ChangeDetectionStrategy.Eager` to all components.
UPDATE src/app/app.ts (362 bytes)
UPDATE src/app/legacy-list.ts (265 bytes)
UPDATE src/app/old-list.ts (213 bytes)
  Migration completed (3 files modified).

❯ Adds 'strictTemplates: false' in tsconfig.json when not set.
UPDATE tsconfig.app.json (638 bytes)
  Migration completed (1 file modified).
```

The component that had no strategy looks like this after the update:

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-legacy-list',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<p>{{ items.length }} items</p>`,
})
export class LegacyList {
  items: string[] = [];
}
```

- Every component without a strategy, `App` included, got `Eager`.
- `ChangeDetectionStrategy.Default` was replaced with `Eager`.
- The `OnPush` component was left alone.

`tsconfig.app.json` got this:

```json
"angularCompilerOptions": {
  "extendedDiagnostics": {
    "checks": {
      "nullishCoalescingNotNullable": "suppress",
      "optionalChainNotNullable": "suppress"
    }
  },
  "strictTemplates": false
}
```

The `extendedDiagnostics` part comes from another migration in the same run. In Angular 22 [`strictTemplates` defaults to `true`](https://angular.dev/reference/configs/angular-compiler-options), so the migration writes `false` explicitly in a project that didn't set it. The result: after `ng update` the app behaves exactly as before. OnPush by default only affects components written from now on, or components you remove the `Eager` from.

## What breaks when Eager is missing

An old-style component that changes a plain field in a timer, in an app that still runs on [Zone.js](en/posts/angular-zone-js/):

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `<p>Count: {{ count }}</p>`,
})
export class Counter {
  protected count = 0;

  constructor() {
    setTimeout(() => this.count++, 50);
  }
}
```

The test runs it with `provideZoneChangeDetection()`, once as is and once with `changeDetection: ChangeDetectionStrategy.Eager`:

```text
OnPush (default): Count: 0
Eager: Count: 1
```

Zone.js saw the timer and ran a check in both cases. With `Eager` the component was checked. As OnPush it was skipped, because a timer isn't one of [the OnPush rules](en/posts/angular-onpush/). That is what happens to code copied from an old tutorial into a v22 project. In a zoneless app the same component won't update even with `Eager`, because nothing runs a check after a timer there.

## Moving to OnPush one component at a time

The `Eager` lines the migration added are a to-do list. For each component:

1. Delete `changeDetection: ChangeDetectionStrategy.Eager`.
2. Look for state that changes outside template events: assigning a plain field inside `setTimeout`, `subscribe` or `then`. Turn it into a [signal](en/posts/angular-signals/), or show the observable with `async`.
3. Look for inputs changed in place (`push`, assigning to an object's field) and create a new reference instead.
4. Run the tests with `await fixture.whenStable()`.

The same Counter after steps 1–2:

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `<p>Count: {{ count() }}</p>`,
})
export class Counter {
  protected readonly count = signal(0);

  constructor() {
    setTimeout(() => this.count.update((n) => n + 1), 50);
  }
}
```

```text
OnPush + signal, Zone.js: Count: 1
OnPush + signal, zoneless: Count: 1
```

With a signal the component works with and without Zone.js, which is exactly what you need before [moving to zoneless](en/posts/angular-zoneless-migration/). A tool that finds silent updates across the whole app is in [the post that wraps up level 3](en/posts/angular-reactivity-model/).

## Mistakes beginners make

- **Deleting every `Eager` at once after the update.** Every component that relies on plain fields stops updating, and it is hard to tell which.
- **Copying a component from an old tutorial without checking how it updates state.** In v22 it is OnPush, even if the tutorial doesn't say so.
- **Keeping `strictTemplates: false` forever.** The migration preserves the old behavior, but the new default catches more template errors.

## What's next

Next post: zoneless, the default since v21. What triggers rendering, what no longer works, and `PendingTasks` for SSR.
