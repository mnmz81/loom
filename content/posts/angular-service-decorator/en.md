---
title: "@Service() and @Injectable: defining a service in Angular"
summary: "Angular 22's @Service() decorator: one instance for the whole app, factory to swap the implementation, autoProvided: false for a per-component service, and when you still need @Injectable."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 29 }
---

In the previous post the `Cart` service was marked with `@Injectable({ providedIn: 'root' })`. Since version 22 the normal way to write such a service is `@Service()`, and the rest of this series uses it. Here's what the decorator does, which options it has, and when you still need `@Injectable`.

Every example was checked with Angular 22.2 and Vitest.

## What @Service() does

[`@Service()`](https://angular.dev/api/core/Service) was added in Angular 22. Per [the guide](https://angular.dev/guide/di/creating-and-using-services), a service marked with it is registered in the root injector, which means:

- there is one instance of it, shared by the whole app;
- you don't register it in any `providers` array;
- if no code injects it, the bundler leaves it out of the production build (tree-shaking).

It's equivalent to `@Injectable({ providedIn: 'root' })`, just shorter. The service's own dependencies come only through `inject()` in fields.

## Swapping the implementation with a factory

Sometimes the class you inject is an interface, and the implementation depends on configuration. `factory` decides what is returned:

```typescript
import { InjectionToken, Service, inject } from '@angular/core';

export const ANALYTICS_ENABLED = new InjectionToken<boolean>('ANALYTICS_ENABLED', {
  factory: () => false,
});

@Service()
export class ConsoleAnalytics {
  track(event: string) {
    return `sent: ${event}`;
  }
}

@Service({
  factory: () => (inject(ANALYTICS_ENABLED) ? inject(ConsoleAnalytics) : new NoopAnalytics()),
})
export class Analytics {
  track(event: string) {
    return `skipped: ${event}`;
  }
}

class NoopAnalytics extends Analytics {}
```

A component that injects `Analytics` gets `NoopAnalytics` by default, and `track('x')` returns `skipped: x`. When `ANALYTICS_ENABLED` is `true` (the next post shows how to give a token a value), it gets the shared `ConsoleAnalytics` instance, and `track('x')` returns `sent: x`. The factory runs in an injection context, so `inject` is allowed inside it.

## A service per component: autoProvided: false

Sometimes each component needs its own copy. Here each editor has a separate draft:

```typescript
import { Component, Service, inject, signal } from '@angular/core';

@Service({ autoProvided: false })
export class Draft {
  readonly text = signal('');
}

@Component({
  selector: 'app-editor',
  providers: [Draft],
  template: `<input #box (input)="draft.text.set(box.value)" /> {{ draft.text() }}`,
})
export class Editor {
  protected readonly draft = inject(Draft);
}

@Component({
  selector: 'app-editors',
  imports: [Editor],
  template: `<app-editor /><app-editor />`,
})
export class Editors {}
```

`autoProvided: false` turns off the root registration, and `providers: [Draft]` creates a new instance for each `app-editor`. Typing in the first editor doesn't change the second. Without `providers`, injection fails (class name from the test):

```text
NG0201: No provider found for `_Draft`. Find more at https://v22.angular.dev/errors/NG0201
```

## When you still need @Injectable

`@Service()` supports only `inject()`. A constructor with parameters doesn't compile:

```text
✘ [ERROR] NG2028: @Service class cannot use constructor dependency injection. Use the `inject` function instead. [plugin angular-compiler]
```

Per the guide, pick `@Injectable` when you need:

- injection through the constructor, for example in existing code;
- the `useClass`, `useValue`, `useExisting` or `useFactory` options inside the decorator;
- a scope other than root, such as `providedIn: 'platform'`, which is shared by all apps on the page.

`@Injectable` isn't deprecated, and it's in all code written before version 22.

### In older versions

The same two services with `@Injectable`:

```typescript
import { Injectable, inject, signal } from '@angular/core';
import { ANALYTICS_ENABLED, ConsoleAnalytics } from './analytics';

@Injectable({
  providedIn: 'root',
  useFactory: () => (inject(ANALYTICS_ENABLED) ? inject(ConsoleAnalytics) : new OldNoopAnalytics()),
})
export class OldAnalytics {
  track(event: string) {
    return `skipped: ${event}`;
  }
}

class OldNoopAnalytics extends OldAnalytics {}

@Injectable()
export class OldDraft {
  readonly text = signal('');
}
```

`providedIn: 'root'` matches `@Service()`, and `useFactory` matches `factory`. `@Injectable()` without `providedIn` matches `autoProvided: false`: you have to register the service in `providers`.

## Mistakes beginners make

- **Adding a service that's already in root to a component's `providers`.** The component gets its own new instance, and changes to it aren't seen by the rest of the app.
- **Forgetting `providers` after `autoProvided: false`.** The result is NG0201 at runtime, not a compile error.

## What's next

Next: providers in depth. `useClass`, `useValue` and `useFactory`, `InjectionToken`, and the injector hierarchy.
