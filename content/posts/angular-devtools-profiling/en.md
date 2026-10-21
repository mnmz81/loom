---
title: "Angular DevTools: the component tree, signal graph, injectors and profiler"
summary: "The Angular DevTools browser extension per the official docs: the component tree, signal graph, injector tree and change detection profiler, and why it works only on a development build."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 73 }
---

When a component doesn't update, or the screen is slow, it's easy to guess. [Angular DevTools](https://angular.dev/tools/devtools) lets you look inside: an extension for Chrome and Firefox that adds an Angular tab to the developer tools.

I didn't run the extension, so what's described about it comes from the docs pages at [angular.dev/tools/devtools](https://angular.dev/tools/devtools). The code and the builds were checked with Angular 22.2.

## Installation and requirements

You install the extension from the Chrome Web Store or Firefox Add-ons, open the developer tools and pick the Angular tab. Per the docs:

- The extension works only on a [development build](https://angular.dev/tools/devtools#we-detected-an-application-built-with-production-configuration). A production build's optimizations remove what it needs.
- Per the docs, you can run an already deployed app if you build it with `"optimization": false`.

The difference between the two kinds of build, as it looks in a new project:

```bash
ng build --configuration development
ng build
```

```text
Initial chunk files | Names         | Raw size
main.js             | main          |  1.35 MB |
styles.css          | styles        | 95 bytes |
                    | Initial total |  1.35 MB |

main-777EMVSR.js    | main          | 195.05 kB |                53.36 kB
                    | Initial total | 195.05 kB |                53.36 kB
```

(The output is shortened: the first block is from the development build and the second from the production build.) The development build isn't minified (`optimization: false`) and creates source maps: `dist/ng-template/browser/main.js.map`. The production build created no map files. `ng serve` uses the development configuration by default.

## The component tree

The Components tab shows the app's structure as a tree of components and directives. Per the [docs](https://angular.dev/tools/devtools/component):

- Clicking a node shows its properties in the right-hand panel, and a search box filters the tree by name.
- You can edit a value: right-click it and enter a new value with Enter, when its type allows editing.
- `$ng0` in the console is the currently selected instance, and `$ng1` is the one before it.
- The picker in the corner lets you point at an element on the page and select its component. Double-clicking a node opens the element in the Elements tab, and an icon in the panel opens the source code.
- `@defer` blocks show in the tree with their triggers, and in apps with SSR the tree shows each component's hydration status.

## The signal graph

After you select a component and click Show Signal Graph, DevTools shows how its signals depend on each other. Per the [signal graph page](https://angular.dev/tools/devtools/signals), the nodes are `signal`, `computed`, `effect`, `linkedSignal`, the template (which reads signals while rendering) and `resource`, and the lines between them are dependencies. You can click a node to see its current value, jump to its definition, set a breakpoint on updates (Chromium-based browsers only) or follow updates in the console. The graph requires Angular 19 or later in development mode.

Nodes are labeled by `debugName`, so it's worth naming them:

```typescript
import { Component, computed, effect, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <button (click)="count.set(count() + 1)">+1</button>
    <p>{{ doubled() }}</p>
  `,
})
export class App {
  protected readonly count = signal(0, { debugName: 'count' });
  protected readonly doubled = computed(() => this.count() * 2, { debugName: 'doubled' });

  constructor() {
    effect(() => console.log('count is', this.count()), { debugName: 'logCount' });
  }
}
```

A Vitest test clicks the button and finds `2` in the `<p>`, so the code compiles and works. Per the docs, its graph should contain `count`, `doubled`, the effect named `logCount` and the template, which reads `doubled`. Without `debugName` you can only recognize an unnamed [effect](en/posts/angular-effect/) by its location. Background on signals themselves is in the [post on signals](en/posts/angular-signals/).

## The injector tree

The Injector Tree tab shows two trees: the environment injector hierarchy and the element injector hierarchy. Per the [docs](https://angular.dev/tools/devtools/injectors), selecting an injector highlights the path the DI algorithm takes from it to the root, including the move from element injectors to environment injectors when a dependency isn't found, plus its list of providers, each of which you can print to the console. This shows where an instance of a service comes from, for example when a component gets its own copy instead of the root one ([providers](en/posts/angular-providers/)). The tree is available for apps from version 17. The Router Tree tab shows the navigation tree.

## The profiler

The Profiler tab measures change detection. Per the [docs](https://angular.dev/tools/devtools/profiler):

- You start a recording with the circle in the corner, use the app, and stop. The recording collects events such as change detection and the running of lifecycle hooks.
- Each bar in the chart is one change detection cycle, and the taller it is, the longer the cycle took. Selecting a bar shows how long each component took, and an estimated frame rate if it drops below 60.
- The flame graph view shows time by element hierarchy, and color reflects time relative to the slowest tile.
- The Change detection checkbox filters to components that were checked. Components that weren't, such as an OnPush one that didn't update, appear gray.
- You can save a recording as a JSON file and load it later.

The docs don't mention how the profiler behaves in a zoneless app, so I don't know what the limits are there. It's especially useful for seeing the difference between [Eager and OnPush](en/posts/angular-onpush/) components: with OnPush, a component whose inputs didn't change stays gray.

## Mistakes beginners make

- **Trying the extension on a production app.** The production-build message doesn't mean something is broken, it means the information is missing.
- **Measuring performance under `ng serve` and drawing conclusions about production.** The code isn't minified, so absolute numbers don't reflect what users get.
- **Leaving signals without `debugName`.** In the graph of a large app it's hard to find a node without a name.

## What's next

Next: bundle size. Budgets in `angular.json`, the effect of lazy loading and `@defer`, and analysis with `--stats-json`.
