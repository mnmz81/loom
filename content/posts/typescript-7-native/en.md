---
title: "TypeScript 7: the fast compiler written in Go"
summary: "What changed in TypeScript 7.0: a native compiler written in Go, the same tsc command and much faster builds. What to clean up in 6.0 first, and why tools that need the API, like Angular, stay on 6.0."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 30 }
---

[TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) came out on July 8, 2026. The language didn't change: the compiler was rewritten in Go, and runs as a native binary instead of JavaScript on Node.js. Code that passes 6.0 passes 7.0 too, with the same errors, as long as its tsconfig is free of options 6.0 deprecated.

Every command ran with TypeScript 6.0.3 and 7.0.2, on a Mac with an M2 and eight cores.

## Installing

```bash
npm install --save-dev typescript
npx tsc --version
```

```text
Version 7.0.2
```

7.0.2 is the `latest` version on npm, so a regular install already gets it. The command is still `tsc`, and npm installs next to it a package with the binary for your operating system (for me, `@typescript/typescript-darwin-arm64`).

## How fast

According to Microsoft, 7.0 is about 10 times faster, and on full builds usually 8 to 12 times. Part of the gain comes from type checking in parallel: `--checkers` sets how many checker workers run, and the default is 4.

I measured `tsc --noEmit` on a project I generated for the test: 2,000 files with interfaces, mapped types and generic functions, each importing the previous one. Three runs per version, real time (`time`):

```bash
time ./node_modules/.bin/tsc
```

| Version | Time |
|---|---|
| 6.0.3 | 1.65 to 1.93 seconds |
| 7.0.2 | 0.34 to 0.39 seconds |
| 7.0.2 with `--checkers 1` | 0.50 seconds |

On this small project it came out about 5 times faster. Even with a single checker 7.0 is about 3 times faster, so most of the gain comes from the native code itself, not only from parallelism.

## Before switching: 6.0 with no warnings

[TypeScript 6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) deprecated `target: es5`, `baseUrl`, `moduleResolution: node` (`node10`), `downlevelIteration` and more, and already removed `outFile`. In 6.0 you can silence the error with `"ignoreDeprecations": "6.0"`, but in 7.0 these options simply don't exist:

```bash
npx -p typescript@6.0.3 tsc
npx -p typescript@7.0.2 tsc
```

```text
tsconfig.json(3,15): error TS5107: Option 'target=ES5' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
tsconfig.json(3,15): error TS5108: Option 'target=ES5' has been removed. Please remove it from your configuration.
```

So the order is: upgrade to 6.0, fix every warning without `ignoreDeprecations`, and only then move to 7.0. You replace `baseUrl` as explained [in the monorepo post](en/posts/typescript-monorepo/).

One difference remains even in clean code: 7.0 orders types internally in a different order. That can change the order of union members in `.d.ts` files and in what the editor shows, and in rare cases even make an error appear or disappear. 6.0's `--stableTypeOrdering` flag makes it order like 7.0, so you can compare the output of the two versions. It slows checking by up to 25%, and is meant for diagnosis only, not for permanent use. [Checking of JS files](en/posts/typescript-migrate-from-js/) also changed in 7.0.

## What doesn't work yet: the API

7.0 doesn't include an API for use from code, the kind that tools like typescript-eslint or the Angular compiler are built on. Microsoft wrote that it expects 7.1 to come with a new and different API, and [7.1 beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/), released on October 20, 2026, already includes it.

Meanwhile, tools like these stay on 6.0. [Angular 22 requires](https://angular.dev/reference/versions) TypeScript from 6.0.0 up to but not including 6.1.0, so in an Angular project you stay on 6.0. Microsoft suggests such projects run 7.0 on the command line for a fast check of the whole project, and keep 6.0 for the editor. To run both side by side, it published the `@typescript/typescript6` package, with a command called `tsc6`.

### In older versions

Before 7.0, the new compiler was available as a preview in the `@typescript/native-preview` package, with a command called `tsgo`. In projects that tried it early, you now replace `tsgo` with the regular `tsc`.

## Mistakes beginners make

- **Moving to 7.0 with `ignoreDeprecations` in the tsconfig.** In 7.0 it doesn't help, and the old options become an error.
- **Upgrading an Angular project to 7.0.** Angular 22 supports only 6.0, and its compiler needs the API.
- **Not checking which `tsc` runs.** When I installed `@typescript/typescript6` next to `typescript@7.0.2`, `npx tsc` suddenly ran 6.0.3, because the package brings TypeScript 6 along with a command of the same name. Run `npx tsc --version` after every dependency change.

## What's next

This is the last post in the series. From here, continue to [Angular from beginner to expert](en/series/angular/), which builds on TypeScript.
