---
title: "State management in Angular: a signal service and NgRx SignalStore"
summary: "A service with signals as the default way to manage state, when it stops being enough, and the same state in NgRx SignalStore with withState, withComputed, withMethods and patchState, with a test."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 76 }
---

State is everything the app remembers: a shopping cart, the logged-in user, filters. In a small app it lives in a component. When several screens need it, it moves to a service. This post shows the service, and NgRx SignalStore for when the service stops being enough.

Every example was checked with Angular 22.2, @ngrx/signals 22.0.1 and Vitest.

## A service with signals

```typescript
import { Service, computed, signal } from '@angular/core';

export type CartItem = { id: number; name: string; price: number };

@Service()
export class Cart {
  private readonly items = signal<CartItem[]>([]);
  readonly list = this.items.asReadonly();
  readonly total = computed(() => this.items().reduce((sum, i) => sum + i.price, 0));

  add(item: CartItem) {
    this.items.update((items) => [...items, item]);
  }
  remove(id: number) {
    this.items.update((items) => items.filter((i) => i.id !== id));
  }
}
```

[`@Service()`](en/posts/angular-service-decorator/) gives one instance for the whole app. The writable signal is private, and from outside you see only [`asReadonly()`](en/posts/angular-signals/) and `computed`. That leaves one place that changes the cart, and its methods describe what happened (`add`, `remove`), not how the data moves. A test that adds two items and removes one gets `['Pen']` and a total of 30.

This is the default, and it's enough for many apps: no library, no boilerplate, and OnPush updates on its own because templates read signals.

## When it stops being enough

The service doesn't impose a structure. In a large team every service is written a little differently: one exposes a writable signal, another forgets `asReadonly`, a third mixes server loading with calculations. [NgRx SignalStore](https://ngrx.io/guide/signals/signal-store) gives every store the same structure: state, computed values and methods, composed as features. Per its docs there are also ready-made features, such as managing lists of entities and lifecycle hooks, and you can write shared features of your own.

SignalStore is installed as a separate package. [The docs](https://ngrx.io/guide/signals/install) recommend `ng add @ngrx/signals@latest`; here it was installed with `npm install @ngrx/signals`.

## The same state in SignalStore

```typescript
import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { CartItem } from './cart';

type CartState = { items: CartItem[]; coupon: string | null };

export const CartStore = signalStore(
  { providedIn: 'root' },
  withState<CartState>({ items: [], coupon: null }),
  withComputed(({ items, coupon }) => ({
    subtotal: computed(() => items().reduce((sum, i) => sum + i.price, 0)),
    discount: computed(() => (coupon() === 'LOOM10' ? 0.1 : 0)),
  })),
  withComputed(({ subtotal, discount }) => ({
    total: computed(() => subtotal() * (1 - discount())),
  })),
  withMethods((store) => ({
    add(item: CartItem) {
      patchState(store, (state) => ({ items: [...state.items, item] }));
    },
    applyCoupon(code: string) {
      patchState(store, { coupon: code });
    },
  })),
);
```

- `signalStore` returns an injectable class. `{ providedIn: 'root' }` registers it in root; without it you add it to a component's or route's `providers`, and then it lives as long as the component does.
- `withState` creates a signal for each field: `store.items()`, `store.coupon()`.
- `withComputed` receives whatever was defined before it. The second `withComputed` uses `subtotal` from the first.
- `withMethods` defines the only way to change state, with `patchState`, which takes a partial object or a function of the previous state.

## State is protected from outside

SignalStore state is protected by default. Code outside the store can't call `patchState` on it:

```typescript
import { inject } from '@angular/core';
import { patchState } from '@ngrx/signals';
import { CartStore } from './cart-store';

export function clearCart() {
  patchState(inject(CartStore), { items: [] });
}
```

```text
error TS2345: Argument of type '{ items: Signal<CartItem[]>; ... } & StateSource<...>' is not assignable to parameter of type 'WritableStateSource<{ items: CartItem[]; coupon: string | null; }>'.
  The types of '[STATE_SOURCE].items' are incompatible between these types.
```

(The error message is shortened.) It's the same idea as the private signal in the service, except the library enforces it. `{ protectedState: false }` turns the protection off, and [the docs](https://ngrx.io/guide/signals/signal-store) recommend keeping it.

## Using and testing it

In a component you inject the store and call it like a service:

```typescript
import { Component, inject } from '@angular/core';
import { CartStore } from './cart-store';

@Component({
  selector: 'app-cart-summary',
  template: `
    <p>{{ store.items().length }} items, total {{ store.total() }}</p>
    <button (click)="store.applyCoupon('LOOM10')">Apply LOOM10</button>
  `,
})
export class CartSummary {
  protected readonly store = inject(CartStore);
}
```

And the test needs nothing special, because a store is a regular service:

```typescript
import { TestBed } from '@angular/core/testing';
import { CartStore } from './cart-store';

it('adds items and applies a coupon', () => {
  const store = TestBed.inject(CartStore);
  store.add({ id: 1, name: 'Book', price: 50 });
  store.add({ id: 2, name: 'Pen', price: 30 });
  store.applyCoupon('LOOM10');
  expect(store.subtotal()).toBe(80);
  expect(store.total()).toBe(72);
});
```

Another test of `CartSummary` with one item priced 50 found `1 items, total 50`, and after clicking the button `1 items, total 45`.

## Mistakes beginners make

- **Starting with a library before there's a problem.** A service with signals is enough until you see the structure drifting or the code repeating itself.
- **Putting everything in one global store.** State of a single screen belongs in a store provided in that screen's component or route.
- **Turning off `protectedState` to update from a component.** Add a method to `withMethods` instead.

## What's next

Next: the architecture of a large app. The official style guide, a folder per feature, and components that display versus components that manage.
