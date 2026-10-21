---
title: "Angular libraries: ng generate library, public-api.ts and ng-packagr"
summary: "Creating an Angular library in a workspace, what goes in public-api.ts, building with ng-packagr and what lands in dist, a secondary entry point, and packing and publishing to npm."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 79 }
---

Components that several apps need move into a library: a package built separately that you import by name, in the same workspace or from npm.

Every example was checked with Angular 22.2 and ng-packagr 22.2.

## Creating a library

Inside an existing workspace:

```bash
ng generate library ui-kit
```

```text
CREATE projects/ui-kit/ng-package.json (155 bytes)
CREATE projects/ui-kit/package.json (210 bytes)
CREATE projects/ui-kit/tsconfig.lib.json (486 bytes)
CREATE projects/ui-kit/tsconfig.lib.prod.json (401 bytes)
CREATE projects/ui-kit/src/public-api.ts (70 bytes)
CREATE projects/ui-kit/src/lib/ui-kit.ts (194 bytes)
UPDATE angular.json (2659 bytes)
UPDATE package.json (816 bytes)
UPDATE tsconfig.json (1111 bytes)
```

(Shortened: the README, spec and test tsconfig are left out.) Besides the `projects/ui-kit` folder, the command added a `library` project to `angular.json`, `ng-packagr` to `devDependencies`, and a mapping in `tsconfig.json`: `"ui-kit": ["./dist/ui-kit"]`. Thanks to the mapping, `import ... from 'ui-kit'` in the app reaches the built library.

## public-api.ts

```typescript
// projects/ui-kit/src/lib/badge.ts
import { Component, input } from '@angular/core';
import { clamp } from './clamp';

@Component({
  selector: 'ui-badge',
  template: `<span class="badge">{{ label() }} ({{ shown() }})</span>`,
})
export class Badge {
  readonly label = input.required<string>();
  readonly count = input(0);
  protected shown = () => clamp(this.count(), 99);
}

// projects/ui-kit/src/public-api.ts
export { Badge } from './lib/badge';
```

Per [the guide](https://angular.dev/tools/libraries/creating-libraries), whatever `public-api.ts` exports is the library's public API. `clamp` (a function that returns the smaller of two numbers) isn't exported, so the built type file contains only `Badge`. Anything not exported here can change without breaking the library's users.

## Building with ng-packagr

```bash
ng build ui-kit
```

```text
Building entry point 'ui-kit'
------------------------------------------------------------------------------
✔ Compiling with Angular sources in partial compilation mode.
✔ Generating FESM and DTS bundles
✔ Copying assets
✔ Writing package manifest
✔ Built ui-kit
```

(The output is shortened.) A library builds with a different builder than an app, `@angular/build:ng-packagr`. The result in `dist/ui-kit`:

```text
dist/ui-kit/README.md
dist/ui-kit/fesm2022/ui-kit.mjs
dist/ui-kit/fesm2022/ui-kit.mjs.map
dist/ui-kit/package.json
dist/ui-kit/types/ui-kit.d.ts
```

`partial compilation mode` comes from `tsconfig.lib.prod.json`, which has `"compilationMode": "partial"`. The build uses it because `production` is the library's default configuration. Per the guide, this format is stable across Angular versions and so safe to publish, and the app that installs the library finishes the compilation.

## Using it in the app

```typescript
import { Component } from '@angular/core';
import { Badge } from 'ui-kit';

@Component({
  selector: 'app-root',
  imports: [Badge],
  template: `<ui-badge label="Inbox" [count]="3" />`,
})
export class App {}
```

You can't use a library before it's built: the mapping points to `dist`, not to the source. During development, `ng build ui-kit --watch` rebuilds it on every change. The library itself is tested with `ng test ui-kit`.

## A secondary entry point

A secondary entry point is a folder inside the library with its own `ng-package.json`, imported as a subpath, for example `ui-kit/testing`:

```json
{
  "lib": {
    "entryFile": "src/public-api.ts"
  }
}
```

This file in `projects/ui-kit/testing/`, with a `src/public-api.ts` next to it, is enough. `ng build ui-kit` now builds two:

```text
Building entry point 'ui-kit'
✔ Built ui-kit
Building entry point 'ui-kit/testing'
✔ Built ui-kit/testing
```

The built `package.json` gets `"./testing"` in `exports`. To import it in the same workspace you also need a `"ui-kit/*"` mapping in `tsconfig.json`. This way code used only in tests doesn't reach whoever imports `ui-kit`.

## Publishing

You publish from the `dist` folder, not from `projects`. `npm pack --dry-run` shows what would go into the package without creating it:

```bash
cd dist/ui-kit
npm pack --dry-run
```

```text
npm notice package: ui-kit@0.0.1
npm notice Tarball Contents
npm notice 1.4kB README.md
npm notice 114B fesm2022/ui-kit-testing.mjs
npm notice 239B fesm2022/ui-kit-testing.mjs.map
npm notice 1.7kB fesm2022/ui-kit.mjs
npm notice 1.4kB fesm2022/ui-kit.mjs.map
npm notice 600B package.json
npm notice 49B types/ui-kit-testing.d.ts
npm notice 581B types/ui-kit.d.ts
```

(The output is shortened.) Then `npm publish` from the same folder. The name and version come from `projects/ui-kit/package.json`, which also holds `peerDependencies`: `@angular/core` and `@angular/common` `^22.2.0`. The app brings its own Angular, and the library doesn't install a second copy.

## Mistakes beginners make

- **Importing from `projects/ui-kit/src/...` instead of `'ui-kit'`.** It bypasses the public API and the build, and breaks the separation.
- **Forgetting to rebuild.** The app sees what's in `dist`, and a source change doesn't reach it without `ng build ui-kit` or `--watch`.
- **Running `npm publish` from the project folder.** What gets published then is unbuilt TypeScript.

## What's next

Next: updating to a new version with `ng update`, and what its migrations change in your code.
