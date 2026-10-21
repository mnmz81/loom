---
title: "Angular bundle size: budgets, lazy loading and stats-json analysis"
summary: "Reading ng build's size table, how much lazy loading saves in the initial bundle, budgets in angular.json that fail a build, and finding which package takes the space with --stats-json."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 74 }
---

Every kilobyte in the initial bundle is downloaded, parsed and run before the user sees anything. The CLI measures the size on every build, can fail a build that crosses a limit, and writes a file that shows what each output file is made of.

Every example was checked with Angular 22.2.

## The size table

An app with two routes, `Home` and `Settings`. `Settings` uses `ReactiveFormsModule`, and both are loaded up front (`component:` in the routes):

```text
Initial chunk files | Names         |  Raw size | Estimated transfer size
main-YWYNTS7H.js    | main          | 248.96 kB |                66.56 kB
styles-5INURTSO.css | styles        |   0 bytes |                 0 bytes
                    | Initial total | 248.96 kB |                66.56 kB
```

`Initial chunk files` are the files the browser loads to start the app. `Raw size` is the size on disk, and `Estimated transfer size` is an estimate of the size after compression on the network.

## Lazy loading moves code out of the start

The same app, with `Settings` [lazy loaded](en/posts/angular-lazy-loading/):

```typescript
import { Routes } from '@angular/router';
import { Home } from './home';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'settings', loadComponent: () => import('./settings').then((m) => m.Settings) },
];
```

```text
Initial chunk files | Names         |  Raw size | Estimated transfer size
chunk-SSTZNX7T.js   | -             | 133.97 kB |                39.83 kB
main-SKNWJIPD.js    | main          |  88.21 kB |                22.47 kB
styles-5INURTSO.css | styles        |   0 bytes |                 0 bytes
                    | Initial total | 222.18 kB |                62.31 kB
Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-POAADIU2.js   | settings      |  28.68 kB |                 6.97 kB
```

The initial bundle went from 248.96 to 222.18 kB, and `Lazy chunk files` appeared: a `settings` file loaded only when you navigate to it. Most of its 28.68 kB is `@angular/forms`, as shown below. [`@defer`](en/posts/angular-defer/) does the same inside a template: when `<app-settings />` is wrapped in `@defer`, the component and its dependencies move to their own lazy chunk.

## Budgets: a limit that fails the build

In `angular.json`, under the build's `configurations.production`, there are `budgets`. A new project comes with a limit for `initial` (500kB warning, 1MB error) and for `anyComponentStyle`. Here the limits were lowered, and a limit was added for the lazy chunk by its name:

```json
"budgets": [
  { "type": "initial", "maximumWarning": "200kB", "maximumError": "210kB" },
  { "type": "bundle", "name": "settings", "maximumWarning": "20kB", "maximumError": "50kB" }
]
```

```text
Application bundle generation failed. [1.396 seconds]
▲ [WARNING] bundle initial exceeded maximum budget. Budget 200.00 kB was not met by 22.18 kB with a total of 222.18 kB.
▲ [WARNING] settings exceeded maximum budget. Budget 20.00 kB was not met by 8.68 kB with a total of 28.68 kB.
✘ [ERROR] bundle initial exceeded maximum budget. Budget 210.00 kB was not met by 12.18 kB with a total of 222.18 kB.
```

A warning is only printed. An error fails the build, and `ng build` exits with code 1, so CI stops. The limit is measured against `Raw size`, not the compressed size. `name` is the name from the `Names` column, not the hashed file name. More types (`allScript`, `any` and others) are listed in the [budgets docs](https://angular.dev/tools/cli/build#configuring-size-budgets).

## What each file is made of

The table says how much, not what. `ng build --stats-json` writes esbuild's metafile, and per the [command docs](https://angular.dev/cli/build) you can open it in the [esbuild analyzer](https://esbuild.github.io/analyze/), which shows each file as a map of the packages in it. In version 22.2 the file is `dist/<project>/browser-stats.json` (the docs still call it `stats.json`).

You can sum up the same data with a short script:

```javascript
// top-packages.mjs: bytes per npm package in each JS file of the build
import { readFileSync } from 'node:fs';

const { outputs } = JSON.parse(readFileSync('dist/ng-template/browser-stats.json', 'utf8'));
for (const [file, out] of Object.entries(outputs)) {
  if (!file.endsWith('.js')) continue;
  const sizes = {};
  for (const [input, { bytesInOutput }] of Object.entries(out.inputs)) {
    const pkg = input.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1] ?? 'your code';
    sizes[pkg] = (sizes[pkg] ?? 0) + bytesInOutput;
  }
  const top = Object.entries(sizes).sort((a, b) => b[1] - a[1]).slice(0, 3);
  console.log(file, top.map(([p, b]) => `${p} ${(b / 1000).toFixed(1)} kB`).join(', '));
}
```

```text
main-SKNWJIPD.js @angular/router 74.5 kB, @angular/platform-browser 12.1 kB, your code 0.7 kB
chunk-POAADIU2.js @angular/forms 27.9 kB, your code 0.4 kB
chunk-SSTZNX7T.js @angular/core 108.9 kB, rxjs 16.0 kB, @angular/common 5.7 kB
```

Now you can see that all of `@angular/forms` is in the lazy chunk, and that the big pieces of the initial code are `@angular/core` and the router. A heavy library that shows up in `main` is the first candidate to move into a lazy route or a `@defer`.

## Mistakes beginners make

- **Raising the budget so the build passes.** First check what grew with `--stats-json`, and only then decide whether the limit should move.
- **Also importing a lazy route the regular way.** `import { Settings } from './settings'` anywhere else that loads up front brings the code back into the initial bundle.
- **Comparing `Raw size` with `Estimated transfer size`.** The budget is measured against the first.

## What's next

Next: security in Angular. Sanitizing `[innerHTML]`, `DomSanitizer`, CSP, Trusted Types and XSRF.
