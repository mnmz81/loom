---
title: "A TypeScript monorepo: project references and tsc --build"
summary: "Several packages in one repo: a shared base tsconfig with extends, composite and references, building in order with tsc -b, and paths without baseUrl, which TypeScript 6.0 deprecated."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 28 }
---

In a repo with several packages, one `tsconfig.json` that checks everything gets slow, and any package can import any file from any other package. [Project references](https://www.typescriptlang.org/docs/handbook/project-references.html) split the repo into separate projects, and `tsc` builds them in order.

Every command ran with TypeScript 6.0.3 and 7.0.2, Node.js 24.21 and npm 11.19.

## The layout

Two packages: `core` with a function, and `app`, which uses it.

```text
package.json          "workspaces": ["packages/*"]
tsconfig.base.json
tsconfig.json
packages/
  core/  package.json  tsconfig.json  src/index.ts
  app/   package.json  tsconfig.json  src/main.ts
```

[npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces/) creates a link in `node_modules` for each package, so `app` imports by package name: `import { formatPrice } from "@demo/core"`. The `package.json` of `core` points to the compiled files:

```json
{
  "name": "@demo/core",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

## extends: shared settings

What's the same in every package sits in one base file:

```json
{
  "compilerOptions": {
    "target": "es2024",
    "module": "nodenext",
    "composite": true,
    "types": []
  }
}
```

Each package loads it with `extends` and adds its own folders. This is `packages/app/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"],
  "references": [{ "path": "../core" }]
}
```

[According to the docs](https://www.typescriptlang.org/tsconfig/extends.html), a relative path is resolved relative to the file it's written in, so `rootDir` and `outDir` stay in each package's file. `references` isn't inherited at all. The tsconfig of `core` is the same, without `references`.

## composite and references

`references` says that `app` depends on `core`. A referenced project must have [`composite`](https://www.typescriptlang.org/tsconfig/composite.html), which turns on `declaration` (so `.d.ts` files are created) and requires every file in the project to be covered by `include` or `files`. `app` doesn't read `core`'s source code, but its `dist/index.d.ts`.

The `tsconfig.json` at the root doesn't check any files itself, it only points to all the projects:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/app" }
  ]
}
```

## tsc --build

`tsc -b` (short for `--build`) finds all the projects, checks which are out of date and builds them in dependency order. `--verbose` explains each decision (I shortened the full paths):

```bash
npx tsc -b --verbose
node packages/app/dist/main.js
```

```text
11:20:21 PM - Projects in this build: 
    * packages/core/tsconfig.json
    * packages/app/tsconfig.json
    * tsconfig.json

11:20:21 PM - Project 'packages/core/tsconfig.json' is out of date because output file 'packages/core/tsconfig.tsbuildinfo' does not exist

11:20:21 PM - Building project '.../packages/core/tsconfig.json'...

11:20:21 PM - Project 'packages/app/tsconfig.json' is out of date because output file 'packages/app/tsconfig.tsbuildinfo' does not exist

11:20:21 PM - Building project '.../packages/app/tsconfig.json'...

$19.99
```

After a change inside the function in `core`, the next run builds only `core`. `app` isn't checked again, because `core`'s `.d.ts` file didn't change:

```text
11:20:22 PM - Project 'packages/core/tsconfig.json' is out of date because output 'packages/core/tsconfig.tsbuildinfo' is older than input 'packages/core/src/index.ts'

11:20:22 PM - Building project '.../packages/core/tsconfig.json'...

11:20:22 PM - Project 'packages/app/tsconfig.json' is up to date with .d.ts files from its dependencies
```

`tsc -b --clean` deletes everything that was built.

## paths without baseUrl

[`paths`](https://www.typescriptlang.org/tsconfig/paths.html) gives shortcuts for imports inside a package. Since TypeScript 6.0 you write the full path inside `paths`, without `baseUrl`:

```json
{
  "compilerOptions": {
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "paths": {
      "@app/*": ["./src/app/*"]
    }
  }
}
```

`allowImportingTsExtensions` (which only works with `noEmit`) allows a `.ts` extension in an import that doesn't start with `./`. `tsc` now understands `import { vat } from "@app/price.ts"`, but Node.js [doesn't read tsconfig](https://nodejs.org/api/typescript.html#paths-aliases), so `node src/main.ts` fails (path shortened):

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@app/price.ts' imported from .../src/main.ts
```

The alternative Node understands is [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) in `package.json`. Since Node 24.14 and 25.4 they can start with `#/`, and TypeScript 6.0 supports that with `module: nodenext` or `moduleResolution: bundler`:

```json
{
  "type": "module",
  "imports": {
    "#/*": "./src/*"
  }
}
```

Now `import { vat } from "#/app/price.ts"` passes both `tsc` and `node`, without `paths`.

### In older versions

Up to TypeScript 5.9 it was common to write `"baseUrl": "./src"` and only `"@app/*": ["app/*"]` inside `paths`. In 6.0 that's an error:

```text
tsconfig.json(5,5): error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
```

TypeScript 7.0 no longer supports `baseUrl` (error TS5102). Before Node 24.14, subpath imports needed a name after the `#`, like `#app/*`.

## Mistakes beginners make

- **Putting `rootDir` and `outDir` in the base file.** They're resolved relative to the repo root, and `tsc -b` fails with TS6059, because the files aren't under `rootDir`.
- **Running `tsc` without `-b` inside a package.** Without `--build`, `tsc` doesn't build the projects it depends on, and works against a stale or missing `.d.ts`.
- **Forgetting `"files": []` at the root.** Without it, the root tsconfig checks all the files a second time.

## What's next

Next: testing TypeScript with Vitest, including tests for the types themselves.
