---
title: "Modules in TypeScript: import, export and extensions"
summary: "A file without import or export is a script with global names. Named and default exports, export type and re-exports, and when an import needs an extension: nodenext vs bundler."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 14 }
---

Every TypeScript file is either a module or a script. In a module, the names defined in the file belong only to it, and other files use them through `export` and `import`. In a script, they're global.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## Script vs module

```ts
// script.ts
const name = "Dana";
console.log(name);
```

```bash
npx tsc --noEmit script.ts
```

```text
node_modules/typescript/lib/lib.dom.d.ts(43468,15): error TS2451: Cannot redeclare block-scoped variable 'name'.
script.ts(2,7): error TS2451: Cannot redeclare block-scoped variable 'name'.
```

The file has no `import` and no `export`, so TypeScript treats it as a script, and its `name` clashes with the global `name` declared in `lib.dom.d.ts` (the browser's `window.name`). Two fixes:

- Add `export {}` to the file. That makes it a module without exporting anything.
- Set [`"moduleDetection": "force"`](https://www.typescriptlang.org/tsconfig/#moduleDetection) in `tsconfig.json`: every file counts as a module.

With `"module": "nodenext"` and `"type": "module"` in `package.json` (the configuration [from the setup post](en/posts/typescript-setup/)), the default `auto` already treats every file as a module.

## export and import

```typescript
// user.ts
export type User = { name: string; age: number };

export function greet(user: User) {
  return `Hello, ${user.name}`;
}

export default function createUser(name: string): User {
  return { name, age: 0 };
}
```

```typescript
// index.ts
export { greet, type User } from "./user.ts";
export { default as createUser } from "./user.ts";
```

```typescript
// main.ts
import { createUser, greet, type User } from "./index.ts";

const dana: User = createUser("Dana");
console.log(greet(dana));
```

```bash
npx tsc && node main.ts
```

```text
Hello, Dana
```

- **Named export** (`export function greet`): imported in curly braces, under the same name.
- **Default export**: one per file, and the importer picks its name (`import createUser from "./user.ts"`).
- **Re-export** (`export { ... } from`): `index.ts` exports again what another file defines, so users import from one place.
- `type` before a name (`type User`) marks it as a type only, and it's erased before the code runs. Why Node needs this is [in the setup post](en/posts/typescript-setup/). With `verbatimModuleSyntax`, `export { User }` without `type` is error TS1205.

## Extensions in imports

```typescript
// app.ts
import { greet } from "./user";

console.log(greet({ name: "Dana", age: 30 }));
```

```bash
npx tsc
```

```text
app.ts(2,23): error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './user.js'?
```

Whether you need an extension depends on who loads the files, and that's what [`moduleResolution`](https://www.typescriptlang.org/docs/handbook/modules/reference.html) describes:

- **`nodenext`**: Node doesn't complete extensions in an `import`, so `tsc` requires one too. Write `./user.js` (the file name after compiling), or `./user.ts` with `rewriteRelativeImportExtensions` as in the setup post.
- **`bundler`**: a bundler (Vite, esbuild) finds the file without an extension, and `./user` passes. `"module": "preserve"` implies `bundler`, and it's the setting in a new Angular project.

### In older versions

Before JavaScript had modules, TypeScript code was organized with [`namespace`](https://www.typescriptlang.org/docs/handbook/namespaces-and-modules.html): a named global object. Very old versions called it an "internal module" and wrote `module` instead of `namespace`. In [6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) that's an error:

```typescript
// legacy.ts (run with tsx)
module Geometry {
  export const PI = 3.14;
}

namespace Units {
  export const cm = 0.01;
}

console.log(Geometry.PI, Units.cm);
```

```text
legacy.ts(2,8): error TS1540: A 'namespace' declaration should not be declared using the 'module' keyword. Please use the 'namespace' keyword instead.
3.14 0.01
```

`namespace` still works, but the handbook recommends modules for new code, and a `namespace` with code doesn't run in Node without tsx. In CommonJS code you'll find `require` and `module.exports`, and TypeScript's equivalents: `import fs = require("fs")` and `export =`.

## Mistakes beginners make

- **A scratch file without `import` or `export`.** Variables like `name` or `status` clash with global names. Add `export {}`.
- **`import greet from "./user.ts"` when the function is a named export.** You get the default, here `createUser`. Write `import { greet }`.
- **Copying an extensionless `import` from a Vite project into a Node project.** Under `nodenext` it's error TS2835.

## What's next

Next: decorators, the difference between the standard version and `experimentalDecorators`, and which one Angular uses.
