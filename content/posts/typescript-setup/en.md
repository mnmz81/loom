---
title: "Setting up TypeScript: tsc, running directly in Node.js, and tsx"
summary: "Install TypeScript, write a minimal tsconfig.json, check with tsc and run .ts files directly in Node.js. What Node can't run, how erasableSyntaxOnly catches it, and when you need tsx."
date: 2026-10-20
tags: [typescript, dev-tools]
series: { key: typescript, order: 2 }
---

A TypeScript project has two separate steps: **checking** (`tsc` finds type errors) and **running** (Node.js runs the code). The tools here each do one of them, and it matters which does what.

Every command ran with TypeScript 6.0.3 and 7.0.2, Node.js 24.21 and tsx 4.23.

## Installing

Install TypeScript as a dev dependency of the project, not globally, so everyone working on it gets the same version:

```bash
npm install --save-dev typescript
npx tsc --version
```

```text
Version 6.0.3
```

## tsconfig.json

This file tells `tsc` how to check the code. It's the configuration [the Node.js docs](https://nodejs.org/api/typescript.html) recommend when running `.ts` directly:

```json
{
  "compilerOptions": {
    "noEmit": true,
    "target": "esnext",
    "module": "nodenext",
    "rewriteRelativeImportExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true
  }
}
```

- `noEmit`: `tsc` only checks and writes no `.js` files, because Node runs the `.ts` itself.
- `module: "nodenext"`: the code is checked against Node.js's rules for `import` and `export`.
- `erasableSyntaxOnly` and `verbatimModuleSyntax`: an error for anything Node can't run (details below).

In `package.json`, add `"type": "module"` so Node treats the files as ES modules. You don't need to write `strict`: since TypeScript 6.0 it's on by default. `npx tsc --init` creates a fuller file with comments, and the next post goes through the options.

## Checking with tsc

```typescript
// hello.ts
function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet("Dana"));
console.log(greet(42));
```

```bash
npx tsc
```

```text
hello.ts(7,19): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

With no file names, `tsc` checks the whole project according to `tsconfig.json`.

## Running directly in Node.js

```bash
node hello.ts
```

```text
Hello, Dana!
Hello, 42!
```

Node.js deletes the types and runs what's left. This is called type stripping: it's on by default since Node 22.18 and 23.6, and stable since 24.12. It doesn't check types, so `greet(42)` runs without any warning. It doesn't read `tsconfig.json` either. Two rules follow from that:

- An `import` must include the extension: `"./user.ts"`, not `"./user"`.
- A type-only import is written `import type { User }`. Without `type`, Node looks for a value called `User` and fails at runtime. `verbatimModuleSyntax` catches this in `tsc` with error TS1484.

### What Node can't run

Deleting only works for syntax you can remove and still get valid JavaScript. `enum` generates code at runtime, so it fails:

```typescript
// status.ts
enum Status {
  Active,
  Blocked,
}

console.log(Status.Blocked);
```

```text
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode
```

The same goes for a `namespace` with code, parameter properties in classes (`constructor(public x: number)`) and `import x = require(...)`.

## erasableSyntaxOnly

Without this option, `status.ts` passes `tsc` with no error and fails only when you run it. With it, `tsc` reports this too, up front:

```bash
npx tsc
```

```text
status.ts(2,6): error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

## tsx

[tsx](https://tsx.is/) is a tool that runs TypeScript with full syntax support, `enum` included:

```bash
npm install --save-dev tsx
npx tsx status.ts
```

```text
1
```

tsx doesn't check types either. It's useful when the code uses syntax Node can't run, or `paths` from `tsconfig.json`.

## Which tool when

| What you need | Tool |
|---|---|
| Find type errors | `npx tsc` |
| Run code that's all erasable syntax | `node file.ts` |
| Run code with `enum`, `namespace` or `paths` | `npx tsx file.ts` |
| Produce `.js` files to ship | `tsc` without `noEmit`, with `outDir` |

### In older versions

Before type stripping, Node ran only JavaScript. There were two ways: compile with `tsc` into a `dist` folder and run the `.js`, or run through ts-node, which compiled on the fly. In Node 22.6 to 22.17 type stripping already existed, but only with the `--experimental-strip-types` flag. `erasableSyntaxOnly` was added in TypeScript 5.8, so older projects usually don't have it.

## Mistakes beginners make

- **Running `node file.ts` and thinking the code was checked.** Only `tsc` checks. Run it before every commit, or in CI.
- **Importing without the extension.** `import { greet } from "./hello"` fails in Node. Write `"./hello.ts"`.
- **Installing TypeScript globally.** Every machine gets a different version. `npx tsc` runs the project's version.

## What's next

Next: `tsconfig.json` in depth, and what changed in TypeScript 6.0's defaults.
