---
title: "Signals in Angular: signal, computed and asReadonly"
summary: "Holding state in Angular with signal: reading with (), set and update, derived values with computed, read-only exposure with asReadonly, and why push on an array doesn't update the screen."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 12 }
---

A signal is a wrapper around a value that notifies whoever reads it when the value changes. Angular uses that information to know which components to re-render, so in Angular 22 a component's state lives in signals. The [first post](en/posts/angular-what-is-angular/) showed a single counter; here is the whole API.

Every example was checked with Angular 22.2. TypeScript snippets without a component ran on Node.js 24 with the `@angular/core` package.

## Creating, reading and writing

`signal()` takes an initial value and returns a [WritableSignal](https://angular.dev/guide/signals#writable-signals). You read the value by calling it as a function, and write with `set` (a new value) or `update` (a new value computed from the previous one):

```typescript
// count.ts
import { signal } from '@angular/core';

const count = signal(0);
console.log(count());

count.set(5);
count.update((n) => n + 1);
console.log(count());
```

```text
0
6
```

Calling `count()` is what lets Angular track it: code that reads a signal in a reactive context (a template, `computed`, `effect`) becomes its consumer and learns when the value changes.

## computed: a value derived from other signals

```typescript
// total.ts
import { computed, signal } from '@angular/core';

const price = signal(40);
const quantity = signal(2);
const total = computed(() => {
  console.log('computing');
  return price() * quantity();
});

console.log('nothing computed yet');
console.log(total());
console.log(total());
quantity.set(3);
console.log(total());
```

```text
nothing computed yet
computing
80
80
computing
120
```

[`computed`](https://angular.dev/guide/signals#computed-signals) takes a function and returns a read-only signal. The output shows its two properties: it is lazy, so the function doesn't run until the first read, and it caches the result, so the second read didn't compute again. It ran again only after `quantity` changed, so expensive work, such as filtering a long array, is safe in a computed.

Dependencies are re-collected on every run, from the signals actually read: if an `if` skipped reading a signal, changing that signal won't trigger a computation. And a computed has no `set`, so trying to write to it is a compile error.

## Signals in a template

```typescript
import { Component, computed, signal } from '@angular/core';

@Component({
  selector: 'app-cart',
  template: `
    <button (click)="add()">Add item</button>
    <p>{{ items().length }} items, total {{ total() }}</p>
  `,
})
export class Cart {
  protected readonly items = signal<number[]>([]);
  protected readonly total = computed(() => this.items().reduce((sum, price) => sum + price, 0));

  protected add() {
    this.items.update((list) => [...list, 25]);
  }
}
```

The template reads `items()` and `total()`, so Angular registers them as dependencies of the component. When the button updates `items`, Angular [marks the component for check](https://angular.dev/guide/signals#reading-signals-in-onpush-components) and re-renders it, even under OnPush, the default since version 22. After two clicks it shows `2 items, total 50`. The template can access `protected` fields, so they aren't exposed outside the component.

## Read-only exposure with asReadonly

```typescript
// counter-store.ts
import { signal } from '@angular/core';

export class CounterStore {
  private readonly _count = signal(0);
  readonly count = this._count.asReadonly();

  increment() {
    this._count.update((n) => n + 1);
  }
}

const store = new CounterStore();
store.increment();
console.log(store.count()); // 1
// store.count.set(5);
```

[`asReadonly()`](https://angular.dev/guide/signals#converting-writable-signals-to-readonly) returns a signal that mirrors the original, without `set` and `update`. Whoever holds a `CounterStore` reads `count` and changes it only through `increment`. Uncomment the last line and:

```text
counter-store.ts(15,13): error TS2339: Property 'set' does not exist on type 'Signal<number>'.
```

The protection covers the signal, not its contents: if the value is an object, its fields can still be changed. In the post on [component communication](en/posts/angular-component-communication/) a class like this becomes a service that several components share.

## When a signal counts as "changed"

```typescript
// equality.ts
import { computed, signal } from '@angular/core';

const tags = signal(['angular']);
const tagCount = computed(() => tags().length);
console.log(tagCount());

tags().push('signals'); // mutates the array, the signal doesn't know
console.log(tagCount());

tags.update((list) => [...list, 'rxjs']); // new array, new reference
console.log(tagCount());

const user = signal({ id: 1, name: 'Dana' }, { equal: (a, b) => a.id === b.id });
const greeting = computed(() => `Hi ${user().name}`);
console.log(greeting());
user.set({ id: 1, name: 'Dana Levi' }); // same id: treated as no change
console.log(greeting());
```

```text
1
1
3
Hi Dana
Hi Dana
```

By default a signal compares a new value with the old one using [`Object.is`](https://angular.dev/guide/signals#signal-equality-functions), that is, by reference. That explains the first two lines: `push` changed the array, but the reference stayed the same and the signal didn't notify, so `tagCount` returned its cached value. `update` with a new array did notify, and the computation saw all three items.

The `equal` option replaces the comparison. Here two users with the same `id` count as equal, so `set` didn't change the value and `greeting` stayed as it was.

### In older versions

Signals arrived in version 16, and the core API was [marked stable in version 17](https://github.com/angular/angular/blob/main/CHANGELOG.md). Before that, state was a plain field (`count = 0`) and Zone.js checked the whole tree after every event, as in the [first post](en/posts/angular-what-is-angular/). Shared state usually lived in an RxJS `BehaviorSubject` inside a service:

```typescript
import { Component, Injectable, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly items$ = new BehaviorSubject<number[]>([]);
  readonly total$ = this.items$.pipe(map((items) => items.reduce((sum, price) => sum + price, 0)));

  add(price: number) {
    this.items$.next([...this.items$.value, price]);
  }
}

@Component({
  selector: 'app-cart',
  imports: [AsyncPipe],
  template: `
    <button (click)="cart.add(25)">Add item</button>
    <p>Total {{ cart.total$ | async }}</p>
  `,
})
export class CartComponent {
  protected readonly cart = inject(CartService);
}
```

`total$` is an Observable, and the template unwraps it with the `async` pipe. This code still works, but for synchronous state a signal is simpler: no subscribe, no `| async`. Converting between the two (`toSignal`, `toObservable`) is in the post on [RxJS and signals](en/posts/angular-rxjs-interop/).

## Mistakes beginners make

- **Forgetting the parentheses in the template.** `{{ count }}` instead of `{{ count() }}`. The build warns: `NG8109: count is a function and should be invoked: count()`.
- **Mutating an array or object in place.** `push` or assigning a field notifies no one. Replace the value with `update` and a new copy.
- **Keeping a copy of a derived value in a separate signal.** A sum, a filter or a full name is a `computed`, not a signal you update by hand.

## What's next

Next: `effect`, which runs code whenever a signal changes, and when you don't need it.
