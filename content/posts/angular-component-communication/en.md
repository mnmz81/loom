---
title: "Component communication in Angular: inputs, outputs, model and a shared service"
summary: "Passing data between components in Angular 22: parent to child with input, child to parent with output, two-way with model, and between siblings through a shared service holding signals."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 19 }
---

The previous posts in this level showed each tool on its own. Here they come together in one small shop: a product card, a catalog and a cart badge, with each pair of components talking in the way that fits their relationship.

Every example was checked with Angular 22.2.

## Parent and child: input and output

```typescript
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-product-card',
  template: `
    <h3>{{ name() }}</h3>
    <button (click)="added.emit(name())">Add to cart</button>
  `,
})
export class ProductCard {
  readonly name = input.required<string>();
  readonly added = output<string>();
}
```

The card doesn't know where the product came from or what happens after the click. It receives `name` from the parent through an [input](en/posts/angular-inputs/) and reports the click through an [output](en/posts/angular-outputs-model/). That way you can use it in a catalog, a list of deals or a test, without changing it.

When the child also changes a value the parent holds, such as a quantity picker, `model()` with `[(value)]` replaces the input and output pair, as in the [previous post on model](en/posts/angular-outputs-model/).

## Siblings: a service that holds signals

```typescript
import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<string[]>([]);
  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);

  add(product: string) {
    this._items.update((items) => [...items, product]);
  }
}
```

The catalog and the cart badge are siblings: neither has a reference to the other. You could route the data through their common parent, but when the components are far apart in the tree that means inputs and outputs at every level in between. Instead, keep the state in a [service](https://angular.dev/guide/di/creating-and-using-services). `providedIn: 'root'` means Angular creates one instance for the whole app, and everyone who asks for it gets the same one. Inside it's the pattern from the [signals post](en/posts/angular-signals/): a private signal, a read-only version with `asReadonly`, `computed` for derived values, and one method allowed to change it. Angular 22 also has a shorthand, `@Service()`, covered in [its own post](en/posts/angular-service-decorator/).

```typescript
import { Component, inject } from '@angular/core';
import { CartStore } from './cart-store';
import { ProductCard } from './product-card';

@Component({
  selector: 'app-catalog',
  imports: [ProductCard],
  template: `
    @for (product of products; track product) {
      <app-product-card [name]="product" (added)="cart.add($event)" />
    }
  `,
})
export class Catalog {
  protected readonly products = ['Keyboard', 'Mouse'];
  protected readonly cart = inject(CartStore);
}

@Component({
  selector: 'app-cart-badge',
  template: `<span>Cart ({{ cart.count() }})</span>`,
})
export class CartBadge {
  protected readonly cart = inject(CartStore);
}

@Component({
  selector: 'app-shop',
  imports: [Catalog, CartBadge],
  template: `
    <app-cart-badge />
    <app-catalog />
  `,
})
export class Shop {}
```

`inject(CartStore)` gives both components the same instance (`inject` has [its own post](en/posts/angular-inject/)). The catalog turns the card's output into a call to `add`, and the badge reads `count()` in its template, so it updates on its own. Clicking `Add to cart` next to `Mouse` changes `Cart (0)` to `Cart (1)`, and the service holds `['Mouse']`. `Shop` passes nothing between the two.

## How to choose

| Relationship | Tool |
|---|---|
| Parent passes data to a child | `input()` |
| Child notifies the parent of an event | `output()` |
| Child changes a value the parent holds | `model()` with `[(value)]` |
| Distant components or siblings | A service with signals |
| Large state that many parts of the app change | A store, in the post on [state management](en/posts/angular-state-management/) |

Start with the simplest thing that works. A service with signals is enough for many apps. A store pays off when many features read and write the same state and you need uniform rules for how it changes.

### In older versions

The same approaches existed before, with a different API: `@Input()` and `@Output()` with `EventEmitter` between parent and child, and a service with an RxJS `BehaviorSubject` between siblings. The old forms appear at the end of the posts on [signals](en/posts/angular-signals/), [inputs](en/posts/angular-inputs/) and [outputs](en/posts/angular-outputs-model/).

## Mistakes beginners make

- **Exposing the service's writable signal.** Every component could then change it in its own way. Expose `asReadonly()` and methods.
- **Passing data through three levels of inputs and outputs.** When the levels in between only pass it along, a shared service is simpler.
- **Reaching into a child with a [query](en/posts/angular-queries/) and changing its state.** Data goes down through inputs and events come up through outputs.

## What's next

Level 2 ends here. Next level: how Angular knows when to update the screen, and what change detection is.
