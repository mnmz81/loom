---
title: ".d.ts declaration files in TypeScript: declaration, @types and declare module"
summary: "What's in a .d.ts file, how declaration: true emits it, where package types come from (@types), declare for a global, declare module for an untyped package, and what skipLibCheck skips."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 31 }
---

A `.d.ts` file holds only types: no code that runs and no values. TypeScript reads it to learn the shape of JavaScript whose source it doesn't have. That's how it knows `fetch` (from `lib.dom.d.ts`), the packages in `node_modules` and your own globals. The full explanation is in [the declaration files guide](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html).

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## declaration: true emits .d.ts

When you write a library in TypeScript and publish JavaScript, [`declaration`](https://www.typescriptlang.org/tsconfig/#declaration) writes a `.d.ts` next to every `.js` file, so the library's users get the types:

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true
  },
  "include": ["src"]
}
```

```typescript
// price.ts
export interface Price {
  amount: number;
  currency: "ILS" | "USD";
}

export function formatPrice(price: Price): string {
  return `${price.amount.toFixed(2)} ${price.currency}`;
}
```

```bash
tsc
ls dist
cat dist/price.d.ts
```

```text
price.d.ts
price.js
export interface Price {
    amount: number;
    currency: "ILS" | "USD";
}
export declare function formatPrice(price: Price): string;
```

The function body is gone, and only the signature with `declare` is left: "this function exists, and its code is somewhere else". `emitDeclarationOnly` writes only the `.d.ts` files, for example when another tool produces the JavaScript.

## Where package types come from

An npm package has types in one of two ways:

- **Inside the package.** A `types` field in its `package.json` points to a `.d.ts`. zod, for example, works this way, and there's nothing to install besides it.
- **An `@types/<name>` package** from DefinitelyTyped, installed separately: `npm install --save-dev @types/node`.

[According to the module resolution reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html), TypeScript looks in the package itself first and then in `node_modules/@types`. The [`types`](https://www.typescriptlang.org/tsconfig/#types) option affects only global types, like `process` from `@types/node`: since 6.0 the default is `[]`, and you need `"types": ["node"]`, as shown in [the tsconfig post](en/posts/typescript-tsconfig/). An `import` from a package with `@types` works regardless of that list.

## declare: a global that comes from outside

Sometimes a value is defined outside your code: a script loaded on the page, or a bundler that replaces a name with a value. `declare` tells TypeScript it exists, and creates nothing:

```typescript
// version.ts
declare const APP_VERSION: string;

console.log(APP_VERSION.toUpperCase());
```

```text
ReferenceError: APP_VERSION is not defined
```

`tsc` accepts the code, but at runtime nobody defined `APP_VERSION`, hence the error. In a project, such declarations go in a file like `globals.d.ts` inside `include`. A `.d.ts` file with no `import` or `export` is global, and every file in the project sees what it declares.

## declare module for a package without types

Say there's an old package written in JavaScript, with no `@types`. Here it's called `legacy-slug` and exports one function:

```typescript
// slug.ts
import slugify from "legacy-slug";

console.log(slugify("Hello World"));
```

```bash
tsc
```

```text
src/slug.ts(2,21): error TS7016: Could not find a declaration file for module 'legacy-slug'. '…/node_modules/legacy-slug/index.js' implicitly has an 'any' type.
  Try `npm i --save-dev @types/legacy-slug` if it exists or add a new declaration (.d.ts) file containing `declare module 'legacy-slug';`
```

The error comes from `noImplicitAny`, which is on with `strict`. Add a `src/legacy-slug.d.ts` file that describes only what you use:

```typescript
// legacy-slug.d.ts
declare module "legacy-slug" {
  export default function slugify(text: string): string;
}
```

```bash
tsc && node src/slug.ts
```

```text
hello-world
```

The short form the error suggests, `declare module "legacy-slug";` with no body, silences the error, but everything imported from the package becomes `any`.

## skipLibCheck

[`skipLibCheck`](https://www.typescriptlang.org/tsconfig/#skipLibCheck) skips type checking of all `.d.ts` files, both those in `node_modules` and your own. The build is faster, and your code is still checked against the declarations. The price: if two libraries define the same type in conflicting ways, you won't hear about it.

## Mistakes beginners make

- **Code inside a `.d.ts`.** `tsc` rejects a function body in a declaration file (TS1183).
- **An `import` at the top of `globals.d.ts`.** The file becomes a module, and its declarations are no longer global (TS2304 where they're used). If you need the `import`, wrap the declarations in `declare global { }`.
- **Installing `@types` for a package that already ships types.** The package brings its own `.d.ts`, and `@types` is redundant.

## What's next

Next: moving a JavaScript project to TypeScript.
