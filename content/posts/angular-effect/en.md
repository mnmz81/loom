---
title: "effect in Angular: code that runs when a signal changes, and when not to use it"
summary: "effect syncs signals to APIs that don't know about signals, such as localStorage. When it runs, why derived values belong in computed, untracked, cleanup with onCleanup, and injection context."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 13 }
---

[`computed`](en/posts/angular-signals/) derives a value from signals. Sometimes you need an action instead: write to localStorage, send a log, update a charting library. That's what [`effect`](https://angular.dev/guide/signals/effect) is for: a function that runs once after it's created, and again whenever a signal it read changes.

Every example was checked with Angular 22.2.

## Syncing with localStorage

```typescript
import { Component, effect, signal } from '@angular/core';

@Component({
  selector: 'app-theme-toggle',
  template: `<button (click)="toggle()">Theme: {{ theme() }}</button>`,
})
export class ThemeToggle {
  protected readonly theme = signal(localStorage.getItem('theme') ?? 'light');

  constructor() {
    effect(() => {
      localStorage.setItem('theme', this.theme());
    });
  }

  protected toggle() {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }
}
```

The effect reads `theme()`, so it depends on it. Every click saves the new value, and on the next load the signal starts from it.

An effect doesn't run the moment the signal changes. Angular [schedules it as part of change detection](https://angular.dev/guide/signals/effect#execution-of-effects): an effect created in a component (a view effect) runs before that component is checked, and an effect in a root service runs before all components. In a test of this code, right after the click `localStorage` still held `light`, and `dark` arrived only when the screen updated. A component's effect is [destroyed with it](https://angular.dev/guide/signals/effect#destroying-effects), so there is nothing to cancel by hand.

## When you need a value, not an action

```typescript
import { Component, effect, signal } from '@angular/core';

@Component({
  selector: 'app-full-name',
  template: `<p>{{ fullName() }}</p>`,
})
export class FullName {
  readonly firstName = signal('Dana');
  readonly lastName = signal('Levi');
  readonly fullName = signal(''); // a copy that an effect keeps in sync

  constructor() {
    effect(() => {
      this.fullName.set(`${this.firstName()} ${this.lastName()}`);
    });
  }
}
```

The code shows the right name, but [the docs](https://angular.dev/guide/signals/effect#use-cases-for-effects) say effects "should be the last API you reach for". In a test, right after `firstName.set('Noa')`, `fullName()` still returned `Dana Levi` until the effect ran. According to the docs, propagating state between signals with an effect can also cause `ExpressionChangedAfterItHasBeenChecked` errors, infinite update loops and unnecessary change detection cycles.

The fix is one line:

```typescript
readonly fullName = computed(() => `${this.firstName()} ${this.lastName()}`);
```

A value derived from other signals is a `computed`. If you also need to write to it, there's [`linkedSignal`](en/posts/angular-linked-signal/).

## untracked: reading without subscribing

```typescript
import { Component, effect, signal, untracked } from '@angular/core';

@Component({
  selector: 'app-user-log',
  template: `<button (click)="clicks.update((n) => n + 1)">Click</button>`,
})
export class UserLog {
  readonly user = signal('dana');
  readonly clicks = signal(0);

  constructor() {
    effect(() => {
      console.log(`User: ${this.user()}, clicks so far: ${untracked(this.clicks)}`);
    });
  }
}
```

An effect subscribes to every signal it reads. Here the log should run only when the user changes; the click count is extra information. [`untracked`](https://angular.dev/guide/signals#reading-without-tracking-dependencies) reads `clicks` without creating a dependency: two clicks printed nothing, and switching the user to `noa` printed `User: noa, clicks so far: 2`. You can also pass untracked a whole function, for example a call to a service that reads signals of its own.

## Cleanup with onCleanup

```typescript
import { Component, effect, signal } from '@angular/core';

@Component({
  selector: 'app-draft',
  template: `<textarea #box [value]="text()" (input)="text.set(box.value)"></textarea>`,
})
export class Draft {
  protected readonly text = signal(localStorage.getItem('draft') ?? '');

  constructor() {
    effect((onCleanup) => {
      const value = this.text();
      const timer = setTimeout(() => localStorage.setItem('draft', value), 500);
      onCleanup(() => clearTimeout(timer));
    });
  }
}
```

The effect function receives [`onCleanup`](https://angular.dev/guide/signals/effect#effect-cleanup-functions). Angular runs what you register there before the effect's next run, or when the effect is destroyed. Here every keystroke cancels the previous timer, so the draft is saved only after half a second without typing. In a test, `h`, `hi` and `hi!` were typed 100ms apart, and `setItem` was called once, with `hi!`.

## Injection context

An effect binds itself to the `DestroyRef` of the place it was created in, so it needs an [injection context](https://angular.dev/guide/signals/effect#injection-context): a constructor or a field initializer. Calling it from a regular method, say after a click, fails:

```text
NG0203: effect() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`.
```

The fix is to keep an `Injector` and pass it in the options (`inject` has [its own post](en/posts/angular-inject/)):

```typescript
import { Component, Injector, effect, inject, signal } from '@angular/core';

@Component({
  selector: 'app-logger',
  template: `<button (click)="startLogging()">Start logging</button>`,
})
export class Logger {
  readonly count = signal(0);
  private readonly injector = inject(Injector);

  startLogging() {
    effect(() => console.log(`count: ${this.count()}`), { injector: this.injector });
  }
}
```

### In older versions

Until version 19, an effect triggered outside change detection ran as a microtask, and writing to a signal inside an effect was blocked unless you passed `allowSignalWrites: true`:

```typescript
import { Component, effect, signal } from '@angular/core';

@Component({
  selector: 'app-full-name-old',
  template: `<p>{{ fullName() }}</p>`,
})
export class FullNameOld {
  readonly firstName = signal('Dana');
  readonly fullName = signal('');

  constructor() {
    effect(() => this.fullName.set(this.firstName()), { allowSignalWrites: true });
  }
}
```

[Version 19](https://github.com/angular/angular/blob/main/CHANGELOG.md) moved effects into change detection and made the flag a no-op. [`CreateEffectOptions`](https://angular.dev/api/core/CreateEffectOptions) still accepts it and marks it deprecated. If you see it in code you can delete it, and usually replace the whole effect with a `computed` too.

## Mistakes beginners make

- **Copying a signal into a signal with an effect.** That's a `computed`, or a `linkedSignal` if you also need to write.
- **Reading a signal after `await`.** The [reactive context](https://angular.dev/guide/signals#reactive-context-and-async-operations) exists only in synchronous code, and a signal read after `await` isn't tracked. Read it before.
- **Touching the DOM from an effect.** An effect runs before Angular updates the DOM. For DOM work there's [`afterRenderEffect`](https://angular.dev/guide/signals/effect#side-effects-on-dom-elements) and `afterNextRender`, covered in the post on the [component lifecycle](en/posts/angular-lifecycle/).

## What's next

Next: `linkedSignal`, a writable signal that resets when its source changes.
