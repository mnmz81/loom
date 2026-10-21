---
title: "Nx with Angular: a monorepo, nx affected and boundaries between libraries"
summary: "An Nx workspace with an Angular app and libraries: apps vs libs, nx affected running only what changed, the build cache, and a lint rule that enforces boundaries between libraries with tags."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 78 }
---

When several apps and libraries live in one repo, three problems show up: how to build only what changed, how not to build the same code twice, and how to stop one feature from importing the guts of another. [Nx](https://nx.dev) is a build tool for monorepos that solves them, and it works on top of the Angular CLI, not instead of it.

Every example was checked with create-nx-workspace 23.3.0. The workspace it created installed Nx 23.2.0 and Angular 22.1.

## Creating a workspace

```bash
npx create-nx-workspace@latest shop --preset=angular-monorepo --appName=store \
  --bundler=esbuild --unitTestRunner=vitest --linter=eslint --nxCloud=skip --interactive=false
```

In this version the `angular-monorepo` preset is mapped to the `nrwl/angular-template` template, which gives a full workspace rather than an empty skeleton: an Angular app (`shop`) with e2e, an API app (`api`) and several libraries. The options change between versions, so check with `npx create-nx-workspace@latest --help`. The official docs: [nx.dev](https://nx.dev/getting-started/intro).

## Apps and libraries

```text
apps/
  shop/              app (Angular)
  api/               app (Node)
  shop-e2e/          e2e
packages/
  shop/
    data/            lib
    feature-products/        lib
    feature-product-detail/  lib
    shared-ui/       lib
  shared/models/     lib
  api/products/      lib
```

- **An app** is what gets built and run. It should be thin: routing and composition.
- **A library** is code with an `index.ts` that defines what's exported. Libraries are imported by an alias from `tsconfig.base.json`, for example `@org/shop/data`.

Who depends on whom, as `nx graph` computes it from the imports:

```text
shop -> feature-products, feature-product-detail
feature-products -> data, models, shared-ui
feature-product-detail -> data, models, shared-ui
shared-ui -> models
data -> models
api -> products, models
```

## nx affected

Add a line to `data`'s `index.ts` and ask who is affected:

```bash
nx show projects --affected
```

```text
["data","feature-product-detail","shop","shop-e2e","feature-products"]
```

`shared-ui`, `models`, `api` and `products` aren't in the list. Per the [docs](https://nx.dev/docs/features/ci-features/affected), Nx asks git which files changed, maps each file to its project through the project graph, and adds every project that depends on it. By default it compares `main` with the working tree, and in CI you set `--base` and `--head` explicitly (here the changes were compared against `HEAD`):

```bash
nx affected -t build --base=HEAD
```

```text
 NX   Running target build for project shop:
✔  nx run shop:build:production
 NX   Successfully ran target build for project shop
```

Only `shop` has a `build` target (the libraries here aren't built on their own, the app compiles them), so that's all that ran.

## The cache

The first build of `shop` took 6.5 seconds. After I restored the files to a state that was already built, the same command built nothing:

```text
> nx run shop:build:production  [local cache]
 NX   Successfully ran target build for project shop
Nx read the output from the cache instead of running the command for 1 out of 1 tasks.
  Cache:             1/1 hit (100%)
```

Nx computes a key from the project's files and its dependencies', and if it already ran the same task with the same input, it restores the result from the cache.

## Boundaries with tags

Every project has `tags` in `project.json`:

```json
{
  "name": "feature-products",
  "tags": ["scope:shop", "type:feature"]
}
```

And in the workspace's `eslint.config.mjs`, the `@nx/enforce-module-boundaries` rule defines who may import from whom:

```javascript
{
  sourceTag: 'scope:shop',
  onlyDependOnLibsWithTags: ['scope:shop', 'scope:shared'],
},
```

If `feature-products` imports from an API library (`import '@org/api/products'`), `nx lint feature-products` fails:

```text
feature-products/src/lib/feature-products.routes.ts
  1:1  error  A project tagged with "scope:shop" can only depend on libs tagged with "scope:shop", "scope:shared"  @nx/enforce-module-boundaries
```

After removing the line, the same command passes. [Per the docs](https://nx.dev/docs/features/enforce-module-boundaries), an untagged project can't depend on any other project unless you allow everything with `"*"`. This way the architecture described in the [previous post](en/posts/angular-architecture/) is enforced by a tool, not only by agreement.

## Creating a new library

```bash
nx g @nx/angular:library packages/shop/cart --name=cart --tags=scope:shop,type:feature \
  --unitTestRunner=vitest-analog --dry-run
```

```text
CREATE packages/shop/cart/project.json
CREATE packages/shop/cart/src/index.ts
CREATE packages/shop/cart/src/lib/cart/cart.ts
CREATE packages/shop/cart/src/lib/cart/cart.html
UPDATE tsconfig.base.json
```

(Shortened.) `--dry-run` shows what would be created without writing it. The generator also adds an alias to `tsconfig.base.json`, so the library can be imported right away.

## Mistakes beginners make

- **Leaving projects untagged.** Without tags the rule limits nothing, and Nx won't let them depend on anything either.
- **Importing a library by a relative path.** `../../shop/data/src/...` bypasses `index.ts` and the boundaries check.
- **Running `nx run-many` on every CI change.** `nx affected` keeps CI time down as the repo grows.

## What's next

Next: Angular libraries. `ng generate library`, `public-api.ts` and ng-packagr, without Nx.
