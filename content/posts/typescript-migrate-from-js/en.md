---
title: "Moving from JavaScript to TypeScript: allowJs, checkJs and JSDoc"
summary: "How to move a JavaScript project to TypeScript one file at a time: allowJs, // @ts-check, JSDoc types, renaming to .ts, turning on strict gradually, and @ts-expect-error vs @ts-ignore."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 32 }
---

You don't have to rename every file to `.ts` in one day. TypeScript can check JavaScript files as they are, so you can move one file at a time while the project keeps running. [The official migration guide](https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html) describes the same order.

Every example was checked with TypeScript 6.0.3 and 7.0.2.

## allowJs: JS files inside the project

The starting point is a `tsconfig.json` that brings the existing JavaScript files into the project:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "noEmit": true,
    "module": "nodenext",
    "strict": false
  },
  "include": ["src"]
}
```

`allowJs` tells `tsc` to read `.js` files too, so a new `.ts` file can import from them. Since TypeScript 6.0 `strict` is on by default, and on code written without types it produces hundreds of errors at once. So you start with `"strict": false` and turn the checks on one by one later.

## `// @ts-check` in one file

With `allowJs` alone, `tsc` reports no errors in JS files. A `// @ts-check` comment at the top of a file turns checking on for that file only. In a JS file you write the types in [JSDoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html) comments, and TypeScript checks against them:

```javascript
// @ts-check

/**
 * @typedef {object} Item
 * @property {string} name
 * @property {number} price
 */

/**
 * @param {Item[]} items
 * @returns {number}
 */
export function total(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

total([{ name: "pen", price: "3" }]);
```

```bash
npx tsc
```

```text
src/cart.js(17,23): error TS2322: Type 'string' is not assignable to type 'number'.
```

`@typedef` defines a type (like `type`), and `@param` and `@returns` type the parameter and the return value. The code itself stays plain JavaScript that runs as it is.

## checkJs: every JS file

Once most files pass, add `"checkJs": true`. [According to the docs](https://www.typescriptlang.org/tsconfig/checkJs.html) it's the same as putting `// @ts-check` at the top of every JS file in the project. Now a file without the comment is checked too:

```javascript
export const age = parseInt(42);
```

```text
src/user.js(1,29): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

A file that isn't ready yet is taken out of checking with `// @ts-nocheck` on its first line. [TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) changed how JS files are checked to behave more like TS files, so JS code that passed in 6.0 can get new errors.

## Renaming to .ts and turning on strict

Rename one file: `cart.js` becomes `cart.ts`. `tsc` passes with no error, but in a `.ts` file TypeScript no longer reads types from JSDoc, and `items` silently became `any`. `noImplicitAny`, the first check worth turning on, exposes it:

```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true
  }
}
```

```text
src/cart.ts(13,23): error TS7006: Parameter 'items' implicitly has an 'any' type.
src/cart.ts(14,24): error TS7006: Parameter 'sum' implicitly has an 'any' type.
src/cart.ts(14,29): error TS7006: Parameter 'item' implicitly has an 'any' type.
```

Move the types from the JSDoc into TypeScript syntax, and the real error comes back:

```typescript
// cart.ts
type Item = { name: string; price: number };

export function total(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

total([{ name: "pen", price: "3" }]);
```

```text
cart.ts(8,23): error TS2322: Type 'string' is not assignable to type 'number'.
```

After `noImplicitAny` comes `strictNullChecks`, then the rest of the [`strict`](en/posts/typescript-tsconfig/) checks. When they're all on, delete `"strict": false` and the individual lines, and you're back to the default.

## `@ts-expect-error` vs `@ts-ignore`

Both comments silence an error on the line after them. [The difference](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html#-ts-expect-error-comments): `@ts-expect-error` reports when there's no longer an error to silence, and `@ts-ignore` always stays quiet:

```typescript
// suppress.ts
// @ts-expect-error
const a: number = "one";

// @ts-ignore
const b: number = "two";

// @ts-expect-error
const c: number = 3;
```

```text
suppress.ts(8,1): error TS2578: Unused '@ts-expect-error' directive.
```

During a migration prefer `@ts-expect-error`: when someone fixes the code, `tsc` reminds them to delete the comment, so it doesn't stay in the code forever.

## Mistakes beginners make

- **Renaming every file at once.** You get hundreds of errors and no way to know where to start. One file at a time, and a clean `tsc` before the next one.
- **Leaving types in JSDoc after renaming to `.ts`.** In a TS file they aren't checked. Move them into the syntax.
- **Silencing with `any` or `@ts-ignore` to "finish" a file.** The error stays in the code, just unmarked. `@ts-expect-error` at least reminds you to come back to it.

## What's next

Next: how to read a `tsc` error message, and what the common codes mean.
