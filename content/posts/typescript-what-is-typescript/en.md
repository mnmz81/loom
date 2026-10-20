---
title: "What is TypeScript, and why add types to JavaScript?"
summary: "What TypeScript is, which bugs it catches before your code runs, why types vanish at runtime, and how TypeScript 6.0 and 7.0 differ."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 1 }
---

TypeScript is, in the words of [the official site](https://www.typescriptlang.org/), "JavaScript with syntax for types". Microsoft develops it as open source. You write JavaScript, add what each value is supposed to be where it helps, and the compiler `tsc` checks the code before it runs. What comes out is plain JavaScript that runs anywhere JavaScript runs.

The series assumes basic JavaScript. Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## What TypeScript catches

A typo in a property name. In JavaScript it only shows up when the line runs:

```typescript
// user.ts
const user = { name: "Dana", age: 31 };
console.log(user.nmae.toUpperCase());
```

```text
user.ts(3,18): error TS2339: Property 'nmae' does not exist on type '{ name: string; age: number; }'.
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

The first line is `tsc`: it knows `user` has only `name` and `age`, without us writing a type at all. The second line is what happens if you run it anyway. In an editor the error is underlined before you even save the file.

## Types describe what a function expects

```typescript
// total.ts
function total(prices: number[]): number {
  return prices.reduce((sum, p) => sum + p, 0);
}

console.log(total([10, 20]));
console.log(total(["10", "20"]));
```

```text
total.ts(7,20): error TS2322: Type 'string' is not assignable to type 'number'.
total.ts(7,26): error TS2322: Type 'string' is not assignable to type 'number'.
30
01020
```

`prices: number[]` means "an array of numbers", and `: number` after the parentheses says what the function returns. JavaScript doesn't complain about the second call: it concatenates strings and returns `"01020"`. TypeScript flags each of the two wrong values.

## Types disappear when the code runs

This is what `tsc` produces from the function:

```javascript
"use strict";
function total(prices) {
    return prices.reduce((sum, p) => sum + p, 0);
}
console.log(total([10, 20]));
```

The types are deleted and the rest stays as it was. [The docs](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html) state that TypeScript "never changes the runtime behavior of JavaScript code". That has two consequences:

- There's no runtime check. Data from a server or a user isn't checked against the type, so your code has to check it (a later post in the series covers this).
- Code runs even with type errors. Node.js runs `.ts` files directly by deleting the types, as in both examples above.

## You don't have to type everything

TypeScript infers types on its own. A variable that started as a number stays a number:

```typescript
let count = 5;
count = "five";
```

```text
example.ts(2,1): error TS2322: Type 'string' is not assignable to type 'number'.
```

In practice you write types mostly on function parameters and shared shapes, and let the compiler infer the rest.

## TypeScript 6.0 and 7.0

Microsoft released TypeScript in 2012. [Version 6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) (March 2026) is the last one whose compiler is written in TypeScript and runs on Node.js. It also made `strict` the default.

Version 7.0 (July 2026) is the same compiler ported to Go. The type rules and errors stayed the same, and builds are about 10 times faster. It doesn't yet have a stable API for use as a library (planned for 7.1), so tools built on the compiler stay on 6.0 for now. Angular 22, for example, [requires](https://angular.dev/reference/versions) TypeScript 6.0. Everything in this series works in both versions.

### In older versions

Before 6.0, `strict` was off unless `tsconfig.json` turned it on. Without `strict`, `tsc` doesn't check, for example, whether a value can be `null`, and a parameter without a type silently becomes `any` and isn't checked at all. Many older projects still work this way, so TypeScript catches less in them. The post on `tsconfig.json` covers the defaults.

## When TypeScript is worth it

- When the code is big, or several people work on it: types document what each function takes and returns.
- When renaming a property has to reach dozens of files: the compiler shows every place that broke.
- In frameworks like Angular, where TypeScript is the default.

In a ten-line script you run once, the check step is mostly an extra step.

## Mistakes beginners make

- **Thinking types protect you at runtime.** A JSON response from a server can be anything, even if you wrote a type for it.
- **Silencing errors with `any`.** `any` turns checking off for that value, and everything it touches stops being checked.
- **Ignoring an error because "it runs".** Code runs with errors, the way `total` returned `01020`. The error is the bug.

## What's next

Next: installing, running `tsc`, and running `.ts` files directly with Node.js.
