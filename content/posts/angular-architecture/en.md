---
title: "Angular app architecture: the style guide, features and where state lives"
summary: "What the official style guide says about file names and folder structure, a folder per feature, components that display versus components that manage, and where state goes: component, route or root."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 77 }
---

In an app with ten screens almost any structure works. With a hundred screens and several teams, the structure decides how hard it is to find code, change it and delete it. This post goes over what the official [style guide](https://angular.dev/style-guide) recommends, and a split into features built on it.

Every example was checked with Angular 22.2 and Vitest.

## File names

Per the guide, you separate words with hyphens, the test file has the same name with `.spec.ts`, and the file is named after the thing inside it. `ng generate` in version 22 already writes it that way:

```text
$ ng g c features/orders/order-list --dry-run
CREATE src/app/features/orders/order-list/order-list.css (0 bytes)
CREATE src/app/features/orders/order-list/order-list.spec.ts (554 bytes)
CREATE src/app/features/orders/order-list/order-list.ts (200 bytes)
CREATE src/app/features/orders/order-list/order-list.html (25 bytes)

$ ng g s features/orders/orders --dry-run
CREATE src/app/features/orders/orders.spec.ts (320 bytes)
CREATE src/app/features/orders/orders.ts (77 bytes)
```

No `.component` and no `.service` in the name, and the generated service is marked with `@Service()`. The guide also recommends avoiding generic names like `utils.ts` or `helpers.ts`.

## A folder per feature

The guide recommends organizing by area rather than by type of code: not `components/` and `services/` folders, but a folder per feature, with tests next to the code. The example here is an orders feature:

```text
src/app/
  app.routes.ts
  orders/
    orders.routes.ts
    orders-page.ts
    order-list.ts
    orders-store.ts
    orders-page.spec.ts
```

Everything about orders is in one place. Deleting the feature means deleting a folder, and changing it doesn't touch other features' files. The guide adds: when a folder grows too large, split it into subfolders.

## A component that displays and a component that manages

A common split (not a style guide term) is between a component that only displays and a component that connects it to the data:

```typescript
// order-list.ts: displays only
@Component({
  selector: 'app-order-list',
  template: `
    @for (order of orders(); track order.id) {
      <p>
        {{ order.title }}
        @if (!order.done) {
          <button (click)="done.emit(order.id)">Done</button>
        }
      </p>
    }
  `,
})
export class OrderList {
  readonly orders = input.required<Order[]>();
  readonly done = output<number>();
}

// orders-page.ts: connects the list to the store
@Component({
  selector: 'app-orders-page',
  imports: [OrderList],
  template: `<app-order-list [orders]="store.all()" (done)="store.markDone($event)" />`,
})
export class OrdersPage {
  protected readonly store = inject(OrdersStore);
}
```

(Import lines are left out.) `OrderList` doesn't know where the orders come from: it takes an [input](en/posts/angular-inputs/) and sends an [output](en/posts/angular-outputs-model/). You can reuse it on another screen and test it without any service. `OrdersPage` is the only one that knows the store. This matches the guide's rule: component code deals with the UI, and logic unrelated to it moves to separate functions or classes.

## Where state lives

Three levels, from narrow to wide:

- **In the component:** a signal inside the component, such as whether a menu is open.
- **In the feature:** a store provided in the feature's route, discarded when you leave it.
- **In root:** what the whole app needs, like the logged-in user. [`@Service()`](en/posts/angular-service-decorator/) with no options.

The orders store is at the middle level:

```typescript
// orders-store.ts
@Service({ autoProvided: false })
export class OrdersStore {
  private readonly orders = signal<Order[]>([
    { id: 1, title: 'Keyboard', done: false },
    { id: 2, title: 'Mouse', done: true },
  ]);
  readonly all = this.orders.asReadonly();

  markDone(id: number) {
    this.orders.update((list) => list.map((o) => (o.id === id ? { ...o, done: true } : o)));
  }
}

// orders.routes.ts
export const ORDERS_ROUTES: Routes = [
  { path: '', component: OrdersPage, providers: [OrdersStore] },
];

// app.routes.ts
export const routes: Routes = [
  { path: 'orders', loadChildren: () => import('./orders/orders.routes').then((m) => m.ORDERS_ROUTES) },
];
```

`autoProvided: false` prevents registration in root, and the route's `providers` creates an instance for that area. Because of `loadChildren`, the whole feature, store included, is built as a separate lazy chunk (`orders-routes`, 1.58 kB). A test with `RouterTestingHarness` navigates to `/orders`, clicks Done and checks that the button is gone. When a feature's state grows, the same store can become a [SignalStore](en/posts/angular-state-management/) without changing the components.

## A few more rules from the guide

- Inject with `inject()`, not in the constructor.
- Fields the template reads: `protected`. Fields Angular initializes (`input`, `output`, queries): `readonly`.
- `class` and `style` bindings instead of `NgClass` and `NgStyle`.
- An event handler's name describes the action (`saveUserData()`), not the event (`handleClick()`).
- Keep templates simple: complex logic moves to a `computed` in the class.

### In older versions

Before version 20, `ng generate` added the type to the file name, and structure by type of code was common:

```text
src/app/
  components/
    order-list/order-list.component.ts
  services/
    orders.service.ts
  orders/
    orders.module.ts
```

In the version 19 `ng generate component` schema, `type` defaults to `Component`, and in version 20 it no longer does. Today `--type=component` brings the suffix back if you want to stay consistent with existing code. A whole feature used to get its own NgModule; today its route and `providers` do that job.

## Mistakes beginners make

- **A `shared/` folder everyone dumps everything into.** Something used by one feature stays inside that feature.
- **A display component that injects a service.** Once it injects, you can't use it without that service.
- **All state in root.** State of one screen that stays in memory after you leave brings back stale data the next time.

## What's next

Next: Nx with Angular. A monorepo with several apps and libraries, `nx affected`, and a lint rule that enforces boundaries between features.
