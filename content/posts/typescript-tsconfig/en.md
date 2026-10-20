---
title: "tsconfig.json: the options that matter and TypeScript 6.0's defaults"
summary: "What's in tsconfig.json: which files are checked, target, module, rootDir and outDir, types, and what strict turns on. Plus how TypeScript 6.0's defaults changed from 5.x."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 3 }
---

`tsconfig.json` marks the root of a project. When you run `tsc` with no file names, it looks for this file and checks according to it. [The full reference for every option](https://www.typescriptlang.org/tsconfig/) is very long; this post covers only what matters in a normal project.

Every example was checked with TypeScript 6.0.3 and 7.0.2.

## A starting file

A Node project that compiles from `src` to `dist`:

```json
{
  "compilerOptions": {
    "target": "es2024",
    "module": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"]
  },
  "include": ["src"]
}
```

- `include`: which files are in the project. Without `include` or `files`, `tsc` takes every `.ts` file in the folder and below. `exclude` takes some of them out.
- `target`: which JavaScript version to compile to. Syntax newer than the target is translated into older syntax.
- `module`: which module system the code is checked against and written in. `nodenext` for code that runs in Node.js, and `preserve` (with `moduleResolution: "bundler"`) for code that goes through a bundler like Vite or esbuild. Angular, for example, uses `preserve`.

## rootDir and outDir

`outDir` is where the `.js` files go, and `rootDir` is which folder gets mirrored into it. Without `rootDir`, TypeScript 6.0 assumes the `tsconfig.json` folder and refuses:

```bash
tsc
```

```text
tsconfig.json(3,5): error TS5011: The common source directory of 'tsconfig.json' is './src'. The 'rootDir' setting must be explicitly set to this or another path to adjust your output's file layout.
  Visit https://aka.ms/ts6 for migration information.
```

The file is still written, to `dist/src/index.js` instead of `dist/index.js`. `"rootDir": "./src"` fixes both.

## types

`types` sets which `@types` packages load automatically. Since 6.0 the default is `[]`, meaning none. Without `"types": ["node"]`, even after `npm install --save-dev @types/node`:

```bash
tsc
```

```text
src/index.ts(1,13): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
```

## What strict turns on

`strict` is shorthand for a group of checks: `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `strictBuiltinIteratorReturn`, `noImplicitThis`, `useUnknownInCatchVariables` and `alwaysStrict`. Since 6.0 it's on by default. The two checks that catch the most:

```typescript
// strict.ts
function double(x) {
  return x * 2;
}

function firstChar(s: string | null) {
  return s.charAt(0);
}
```

```text
strict.ts(2,17): error TS7006: Parameter 'x' implicitly has an 'any' type.
strict.ts(7,10): error TS18047: 's' is possibly 'null'.
```

The first is `noImplicitAny`: a parameter without a type doesn't silently become `any`. The second is `strictNullChecks`: you can't call `charAt` on a value that might be `null`. You can turn off a single check (`"strictNullChecks": false`) and keep the rest.

## extends

Several projects can share one base: `"extends": "./tsconfig.base.json"` loads that file, and every option in the current file overrides it. That's how the `tsconfig.json` Angular generates works too: a base file, with `tsconfig.app.json` and `tsconfig.spec.json` on top.

### In older versions

[TypeScript 6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) changed several defaults. A tsconfig written for 5.x that didn't set them will behave differently:

| Option | Up to 5.9 | Since 6.0 |
|---|---|---|
| `strict` | `false` | `true` |
| `target` | `es5` | `es2025` (the current year) |
| `module` | `commonjs` | `esnext` |
| `types` | every `@types` package | `[]` |
| `rootDir` | the common folder of all files | the `tsconfig.json` folder |

6.0 also deprecated `target: "es5"`, `baseUrl` and `moduleResolution: "node"`. 7.0 no longer supports them, and you can silence the warning for now with `"ignoreDeprecations": "6.0"`.

## Mistakes beginners make

- **Running `tsc file.ts` in a project with a `tsconfig.json`.** Since 6.0 that's an error (TS5112), because the tsconfig isn't loaded. Run plain `tsc`.
- **Turning off `strict` to make the errors go away.** They go away from the screen, not from the code.
- **Forgetting `rootDir` when adding `outDir`.** That's the TS5011 error above.

## What's next

Next: the basic types, and when TypeScript infers them for you.
