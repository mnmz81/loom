---
title: "Lazy loading in Angular: loadComponent and loadChildren"
summary: "How to split an Angular app by route: loadComponent for one component, loadChildren for a whole routes file, what the ng build output shows, and preloading with withPreloading."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 35 }
---

When a route points to a `component`, that component goes into the initial bundle the browser downloads, even if the user never visits its page. [Lazy loading](https://angular.dev/guide/routing/loading-strategies) moves pages into separate files that load only when you navigate to them.

Every example was checked with Angular 22.2 and Vitest, and the `ng build` output is from a real run.

## loadComponent

A component with `export default`:

```typescript
import { Component } from '@angular/core';

@Component({ selector: 'app-admin', template: `<h1>Admin</h1>` })
export default class Admin {}
```

In the route, replace `component` with `loadComponent`, a function that returns a dynamic `import()`:

```typescript
import { Routes } from '@angular/router';
import { Home } from './home';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'admin', loadComponent: () => import('./admin/admin') },
  { path: 'shop', loadChildren: () => import('./shop/shop.routes').then((m) => m.SHOP_ROUTES) },
];
```

The router detects the `default` and uses it. With a regular export you write `import('./admin/admin').then((m) => m.Admin)`. The file loads on the first navigation to `/admin`, and on later navigations it's already in memory.

## loadChildren

`shop` in the routes file above loads a whole group of routes. The shop's routes file defines paths relative to `shop`:

```typescript
import { Routes } from '@angular/router';
import { ProductList } from './product-list';
import { ProductDetails } from './product-details';

export const SHOP_ROUTES: Routes = [
  { path: '', component: ProductList },
  { path: ':id', component: ProductDetails },
];
```

`/shop` shows `ProductList` and `/shop/41` shows `ProductDetails`. Everything this file imports, including both components, goes together into a separate file. That's how you split an app by area: each area has its own routes file, and the main routes file knows only the entry point.

## What the build shows

`ng build` separates files loaded at startup from lazy ones:

```text
Initial chunk files | Names         |  Raw size | Estimated transfer size
chunk-FDWX6F6V.js   | -             | 103.92 kB |                31.27 kB
main-A34LOHPF.js    | main          |  90.59 kB |                23.01 kB
styles-5INURTSO.css | styles        |   0 bytes |                 0 bytes

                    | Initial total | 194.51 kB |                54.27 kB

Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-BH4NR5GD.js   | shop-routes   | 679 bytes |               679 bytes
chunk-QCPCTACV.js   | admin         | 293 bytes |               293 bytes
```

The components here are tiny, so the saving is small. In a real app an admin area with tables and charts can be hundreds of KB, and every user who doesn't go there doesn't download them. The name in the `Names` column comes from the imported file's name.

## Loading ahead: withPreloading

The downside: the first navigation to a lazy page waits for the download. [`withPreloading(PreloadAllModules)`](https://angular.dev/api/router/withPreloading) downloads all lazy files in the background after the app has started: `provideRouter(routes, withPreloading(PreloadAllModules))`. The initial bundle stays small, and navigation feels instant. You can also write your own strategy that picks which routes to preload.

### In older versions

Before routes of standalone components, `loadChildren` loaded an NgModule that registered the routes with `RouterModule.forChild`:

```typescript
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SHOP_ROUTES } from './shop.routes';

@NgModule({
  imports: [RouterModule.forChild(SHOP_ROUTES)],
})
export class ShopModule {}
```

and the route was `loadChildren: () => import('./shop/shop.module').then((m) => m.ShopModule)`. That still works. Even older code has a string: `loadChildren: './shop/shop.module#ShopModule'`. That syntax was [deprecated in version 8](https://github.com/angular/angular/blob/cf420194ed91076afb66d9179245b9dbaabc4fd4/aio/content/guide/deprecations.md), and the type of `loadChildren` in version 22 no longer accepts a string.

## Mistakes beginners make

- **Also importing the lazy component the regular way.** A regular `import` of `Admin` in another file that uses it moves its code into the initial bundle, and the lazy file is left almost empty. Check the `ng build` output.
- **Writing `path: 'shop/...'` inside `SHOP_ROUTES`.** The paths there are relative to `shop`, so `shop` is added twice.

## What's next

Next: guards and resolvers. Who may enter a route, and how to load data before the page is shown.
