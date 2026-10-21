---
title: "Signals, OnPush and zoneless together: Angular 22's reactivity model"
summary: "How signals, OnPush and zoneless fit together: who says what changed, who decides when and what to check. A checklist for \"the screen doesn't update\", a dev-time check, and Angular DevTools."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 27 }
---

Three pieces from level 3 work together in every Angular 22 app: signals say *what* changed, the zoneless scheduler decides *when* to check, and OnPush decides *which* components to check. This post connects them and gives an ordered list for when something doesn't update.

Every example was checked with Angular 22.2 and Vitest 5.

## Three pieces, one flow

Shared state in a service, and a component that shows it:

```typescript
import { Component, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartStore {
  readonly count = signal(0);

  syncFromServer() {
    setTimeout(() => this.count.set(3), 50);
  }
}

@Component({
  selector: 'app-cart-badge',
  template: `<span>Cart: {{ store.count() }}</span>`,
})
export class CartBadge {
  protected readonly store = inject(CartStore);
}
```

The test calls `syncFromServer()` from outside the component and waits:

```text
before: Cart: 0
after:  Cart: 3
```

No event happened in `CartBadge`, and none of its inputs changed. Still:

1. `count.set(3)` updated a signal that `CartBadge`'s template reads, and Angular marked its view dirty.
2. The zoneless scheduler scheduled a check, with no Zone.js and no wrapped timer.
3. The check reached `CartBadge`, a marked OnPush component, and refreshed it. Other OnPush components that weren't marked were skipped.

The service is written with `@Injectable` and `inject()`. Both are explained in the next post.

## Checklist: "the screen doesn't update"

A recommended order:

1. **Is the value a plain field changed outside a template event** (`setTimeout`, `subscribe`, `then`, a third-party library listener, a WebSocket)? Turn it into a [signal](en/posts/angular-signals/), or call `markForCheck`.
2. **Was an object or array changed in place**, in an input or inside a signal? Create a new reference. `Object.is` doesn't see content changes ([the mutation trap](en/posts/angular-onpush/)).
3. **Is an observable shown without `async`?** A manual subscription that updates a plain field is item 1 again. `async` or `toSignal` fixes it.
4. **A reactive form?** `setValue` and `patchValue` [don't schedule a check](https://angular.dev/guide/zoneless#reactive-forms-in-zoneless-applications).
5. **Code waiting for `NgZone.onStable`?** It doesn't emit in a zoneless app. Move to `afterNextRender` ([the zoneless post](en/posts/angular-zoneless/)).
6. **Did the component call `ChangeDetectorRef.detach()`?** A detached view [isn't checked](https://angular.dev/api/core/ChangeDetectorRef) until `reattach()`, even when marked dirty.
7. **The test passes but the app doesn't?** Maybe `fixture.detectChanges()` hides a missing notification. Try `await fixture.whenStable()`.

## Catching silent updates during development

[`provideCheckNoChangesConfig`](https://angular.dev/api/core/provideCheckNoChangesConfig) (developer preview since v20) runs a periodic check over all views, as if they were all `Eager`, and reports a binding that changed without a notification:

```typescript
import { ApplicationConfig, isDevMode, provideCheckNoChangesConfig } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    ...(isDevMode() ? [provideCheckNoChangesConfig({ exhaustive: true, interval: 1000 })] : []),
  ],
};
```

With the `Ticks` component from [the OnPush post](en/posts/angular-onpush/), when it changes `ticks` without `markForCheck`, the `ErrorHandler` receives:

```text
NG0100: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: '0'. Current value: '1'. Expression location: _Ticks component. Find more at https://v22.angular.dev/errors/NG0100
```

The message names the component, and the value on screen next to the real one. This is the tool that finds what grep can't when moving to [OnPush](en/posts/angular-onpush-default-v22/) or to [zoneless](en/posts/angular-zoneless-migration/).

## Angular DevTools

The [Profiler](https://angular.dev/tools/devtools/profiler) in Angular DevTools shows every change detection cycle as a bar, and how long each component took in it. The Change detection checkbox highlights the components that were checked and leaves the skipped ones gray, such as OnPush components that weren't marked. When the screen updates too often instead, that is the place to look. [The post on DevTools and profiling](en/posts/angular-devtools-profiling/) shows how to work with it.

### In older versions

| | Typical app up to v20 | Angular 22 |
|---|---|---|
| What schedules a check | Zone.js, after every async event | Notifications: signals, template events, `markForCheck`, `AsyncPipe`, `setInput` |
| Default strategy | `Default` (now `Eager`) | `OnPush` |
| Where state lives | Plain fields | Signals |
| Acting after render | `NgZone.onStable` | `afterNextRender` |

## Mistakes beginners make

- **Calling `detectChanges()` before finding the missing notification.** The screen updates, but the cause stays, and the next change breaks again.
- **Leaving `provideCheckNoChangesConfig` in the production build.** It is a development tool. `isDevMode()` keeps it out of production.

## What's next

Level 4 starts in the next post: dependency injection, and the `inject()` function that already appeared in the examples.
