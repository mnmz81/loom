---
title: "Dependency injection in Angular: inject() and the injection context"
summary: "What dependency injection is, how components get a service with inject(), where inject may be called, and how runInInjectionContext fixes error NG0203."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 28 }
---

A component shouldn't create the things it needs. It asks, and Angular hands it a ready instance. This is called [dependency injection](https://angular.dev/guide/di) (DI), and it's the normal way to share data and logic between components.

Every example was checked with Angular 22.2 and Vitest.

## A first service

A service is a plain class that holds state or logic. Here's a shopping cart:

```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Cart {
  readonly items = signal<string[]>([]);

  add(item: string) {
    this.items.update((items) => [...items, item]);
  }
}
```

`@Injectable({ providedIn: 'root' })` tells Angular the class can be injected anywhere in the app, and that there's only one instance of it. Angular 22 has a shorter form for this, `@Service()`, which is the topic of the next post. `items` is a [signal](en/posts/angular-signals/), so every template that reads it updates when the cart changes.

## inject() in a component

Two components that don't know each other ask for the same cart:

```typescript
import { Component, inject } from '@angular/core';
import { Cart } from './cart';

@Component({
  selector: 'app-product',
  template: `<button (click)="cart.add('Book')">Add a book</button>`,
})
export class Product {
  protected readonly cart = inject(Cart);
}

@Component({
  selector: 'app-cart-badge',
  template: `<p>Items in cart: {{ cart.items().length }}</p>`,
})
export class CartBadge {
  protected readonly cart = inject(Cart);
}

@Component({
  selector: 'app-shop',
  imports: [Product, CartBadge],
  template: `<app-product /><app-cart-badge />`,
})
export class Shop {}
```

[`inject(Cart)`](https://angular.dev/api/core/inject) returns the instance Angular created, and both components get the same object. Clicking the button in `Product` changes `Items in cart: 0` to `Items in cart: 1` in `CartBadge`, with no input, output or shared parent passing data. `Cart` acts as the token here: the key Angular looks up. When Angular creates `Product`, it finds the `Cart` instance and passes it in.

## Where inject may be called

`inject` works only in an [injection context](https://angular.dev/guide/di/dependency-injection-context), that is, while Angular is creating something:

- the constructor of a class Angular creates (component, directive, service) and its field initializers;
- the `factory` function of an `InjectionToken` or a provider;
- functions Angular runs inside a context, such as a router guard.

A call from a method that runs on click is no longer in a context:

```typescript
import { Component, inject, Injector, runInInjectionContext } from '@angular/core';
import { Cart } from './cart';

@Component({ selector: 'app-checkout', template: `` })
export class Checkout {
  private readonly injector = inject(Injector);

  broken() {
    return inject(Cart); // runs on click, not while Angular creates the class
  }

  works() {
    return runInInjectionContext(this.injector, () => inject(Cart));
  }
}
```

`broken()` throws (the error is from the test run; the `_` in the class name was added by the bundler):

```text
NG0203: The `_Cart` token injection failed. `inject()` function must be called from an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`. Find more at https://v22.angular.dev/errors/NG0203
```

`works()` gets the `Injector` at creation time, and later [`runInInjectionContext`](https://angular.dev/api/core/runInInjectionContext) runs the function inside its context, so `inject` succeeds and returns the same cart. Usually the simpler fix is to inject into a field, as `Product` does, and use the field in the method. `inject` works only synchronously: after an `await` the context is gone.

### In older versions

Before `inject()`, dependencies came in as constructor parameters:

```typescript
import { Component, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OldCart {
  items: string[] = [];
}

@Component({
  selector: 'app-old-badge',
  template: `<p>Items in cart: {{ cart.items.length }}</p>`,
})
export class OldCartBadge {
  constructor(protected cart: OldCart) {}
}
```

`protected cart` in the constructor is a TypeScript [parameter property](en/posts/typescript-classes/): it creates a field and assigns the value to it. Angular reads the parameter's type and injects by it. This style still works and is common in existing code, and Angular has a [migration](https://angular.dev/reference/migrations/inject-function) that converts it to `inject()`. The `@Service()` decorator from the next post doesn't support it at all.

## Mistakes beginners make

- **Creating a service with `new`.** `new Cart()` gives a private cart no other component sees, and loses the ability to swap in another provider in tests.
- **Calling `inject` inside a method or after `await`.** Inject into a field and use the field.

## What's next

Next: `@Service()` and `@Injectable` in depth, how they differ and when to pick each.
