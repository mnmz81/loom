---
title: "RxJS and signals in Angular: toSignal, toObservable and takeUntilDestroyed"
summary: "The bridge between RxJS and signals in Angular 22: toSignal with initialValue and requireSync, toObservable, takeUntilDestroyed, outputFromObservable, async pipe vs toSignal, and the old ngOnDestroy."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 44 }
---

In modern Angular, state lives in signals, but `HttpClient`, the router and events still return Observables. The [`@angular/core/rxjs-interop`](https://angular.dev/ecosystem/rxjs-interop) package converts between the two and cleans up subscriptions on its own.

Every example was checked with Angular 22.2 and RxJS 7.8, in Vitest specs with fake timers and `HttpTestingController`.

## toSignal: from Observable to signal

```typescript
// clock.ts
import { Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, interval, map } from 'rxjs';

const theme$ = new BehaviorSubject<'light' | 'dark'>('light');

@Component({
  selector: 'app-clock',
  template: `<p>{{ seconds() }} s, {{ theme() }}, {{ maybe() ?? 'nothing yet' }}</p>`,
})
export class Clock {
  protected readonly seconds = toSignal(interval(1000).pipe(map((n) => n + 1)), { initialValue: 0 });
  protected readonly theme = toSignal(theme$, { requireSync: true });
  protected readonly maybe = toSignal(interval(1000));
}
```

The first render shows `0 s, light, nothing yet`. `toSignal` subscribes right away, and until the Observable emits, the signal needs some value:

- **No options** (`maybe`): the value is `undefined`, and the type includes `undefined`.
- **`initialValue`** (`seconds`): a starting value, and a clean type.
- **`requireSync: true`** (`theme`): for an Observable that emits immediately on subscribe, such as a `BehaviorSubject`. If it doesn't, Angular throws:

```text
NG0601: `toSignal()` called with `requireSync` but `Observable` did not emit synchronously.
```

`toSignal` works only in an injection context (a field, the constructor), and unsubscribes when the component is destroyed. An error in the Observable is thrown when you read the signal.

## toObservable: from signal to RxJS

```typescript
// draft-editor.ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, skip, switchMap } from 'rxjs';

@Component({
  selector: 'app-draft-editor',
  template: `<textarea #box (input)="text.set(box.value)" aria-label="Draft"></textarea>`,
})
export class DraftEditor {
  private readonly http = inject(HttpClient);
  readonly text = signal('');

  constructor() {
    toObservable(this.text)
      .pipe(
        skip(1),
        debounceTime(1000),
        switchMap((text) => this.http.put('/api/draft', { text })),
        takeUntilDestroyed(),
      )
      .subscribe();
  }
}
```

Autosaving a draft: `toObservable` emits the signal's value and every change to it, and from there you can use the operators from [the previous post](en/posts/angular-rxjs-basics/). `skip(1)` skips the initial value (the empty text), and `debounceTime` saves only after a second without typing. [According to the docs](https://angular.dev/ecosystem/rxjs-interop), several synchronous changes in a row are emitted as one value, the last.

`takeUntilDestroyed()` ends the subscription when the component is destroyed. In the spec, a save that was in flight at the moment of destruction was cancelled.

## takeUntilDestroyed outside the constructor

```typescript
// status-badge.ts
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, switchMap } from 'rxjs';

@Component({
  selector: 'app-status-badge',
  template: `<p>{{ status() }}</p><button (click)="startPolling()">Watch</button>`,
})
export class StatusBadge {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly status = signal('unknown');

  protected startPolling() {
    interval(5000)
      .pipe(
        switchMap(() => this.http.get<{ status: string }>('/api/status')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => this.status.set(res.status));
  }
}
```

With no argument, `takeUntilDestroyed` finds the component through `inject`, so it works only in an injection context. In a method that runs on a click it throws `NG0203`, so you inject `DestroyRef` in a field and pass it in, as [the guide](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed) recommends. In the spec, no further request went out after the component was destroyed.

## outputFromObservable

```typescript
// search-box.ts
import { Component } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-search-box',
  template: `<input #box (input)="input$.next(box.value)" aria-label="Search" />`,
})
export class SearchBox {
  protected readonly input$ = new Subject<string>();
  readonly search = outputFromObservable(this.input$.pipe(debounceTime(300), distinctUntilChanged()));
}
```

`outputFromObservable` turns an Observable into an [output](en/posts/angular-outputs-model/): the parent writes `(search)="..."` as usual and receives only the value after the debounce. The other direction is `outputToObservable(box.search)`, which returns an Observable from a component's output ([output interop](https://angular.dev/ecosystem/rxjs-interop/output-interop)).

## async pipe vs toSignal

```typescript
// user-views.ts
import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';

interface User {
  name: string;
  email: string;
}

@Component({
  selector: 'app-user-async',
  imports: [AsyncPipe],
  template: `<p>{{ (user$ | async)?.name }}</p><p>{{ (user$ | async)?.email }}</p>`,
})
export class UserAsync {
  protected readonly user$ = inject(HttpClient).get<User>('/api/me');
}

@Component({
  selector: 'app-user-signal',
  template: `<p>{{ user()?.name }}</p><p>{{ user()?.email }}</p>`,
})
export class UserSignal {
  protected readonly user = toSignal(inject(HttpClient).get<User>('/api/me'));
}
```

```text
async pipe requests: 2
toSignal requests: 1
```

Both subscribe and unsubscribe on their own. The difference: every `| async` in the template is a separate subscription, and for an HTTP Observable that's a separate request. `toSignal` subscribes once, and the signal can be read as often as needed, also in `computed` and in TypeScript code.

### In older versions

```typescript
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, interval, takeUntil } from 'rxjs';

@Component({ selector: 'app-old-clock', template: `{{ seconds }}` })
export class OldClock implements OnInit, OnDestroy {
  seconds = 0;
  private subscription?: Subscription;

  ngOnInit() {
    this.subscription = interval(1000).subscribe(() => this.seconds++);
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}

@Component({ selector: 'app-old-clock-2', template: `{{ seconds }}` })
export class OldClock2 implements OnInit, OnDestroy {
  seconds = 0;
  private readonly destroy$ = new Subject<void>();

  ngOnInit() {
    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => this.seconds++);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

Before `rxjs-interop`, you kept the `Subscription` and unsubscribed in [`ngOnDestroy`](en/posts/angular-lifecycle/), or created a Subject named `destroy$` that `takeUntil` uses to end every subscription. Both still work, but it's easy to forget a step. In such code the value lives in a plain field, and in an app [without Zone.js](en/posts/angular-zoneless/), the default since version 21, nothing tells Angular it changed: in the spec the field reached 3 and the screen stayed at 0. `toSignal` solves both problems.

## Mistakes beginners make

- **Calling `toSignal` inside a method.** It creates a new subscription on every call and fails outside an injection context. Create it once, in a field.
- **`takeUntilDestroyed` not last in `pipe`.** An operator after it, such as `switchMap`, can keep running after destruction.
- **Several `| async` on the same HTTP Observable.** Each one sends a request; `toSignal` sends one.

## What's next

The next post starts the forms level: the three ways to build a form in Angular, template-driven, reactive and Signal Forms, and when to pick each.
