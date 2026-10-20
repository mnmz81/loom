---
title: "Unions and literal types in TypeScript, and as const"
summary: "A union means 'one of several types', and a literal type is an exact value like \"md\". Why const and let get different types, and how as const turns an object or array into constants."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 9 }
---

You write a union with `|`: `string | number` is "a string or a number". When you join exact values this way, such as `"sm" | "md" | "lg"`, you get a closed list of options, and TypeScript checks that the code stays inside it.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## Literal types

```typescript
// literals.ts
type Size = "sm" | "md" | "lg";
let size: Size = "md";
size = "xl";

let a = "md";
const b = "md";
size = a;
size = b;
```

```text
literals.ts(4,1): error TS2322: Type '"xl"' is not assignable to type 'Size'.
literals.ts(8,1): error TS2322: Type 'string' is not assignable to type 'Size'.
```

`"xl"` isn't in the list. The interesting part is the difference between `a` and `b`: `let a = "md"` can change later, so its type is `string`. `const b` will never change, so its type is exactly `"md"`, which fits `Size`.

## as const

```typescript
// as-const.ts
const sizes = ["sm", "md", "lg"] as const;
type Size = (typeof sizes)[number];
const config = { retries: 3, mode: "fast" } as const;

config.retries = 4;
const s: Size = "lg";
console.log(sizes.length, s, config.mode);
```

```text
as-const.ts(6,8): error TS2540: Cannot assign to 'retries' because it is a read-only property.
3 lg fast
```

Without `as const`, `sizes` is `string[]` and `config.mode` is `string`. `as const` keeps the exact values and makes everything `readonly`. The second line builds the union `"sm" | "md" | "lg"` from the array, so the list is written once and is also available at runtime. `typeof` and `[number]` get their own post.

## A union of types

```typescript
// format.ts
function format(id: string | number) {
  return id.toUpperCase();
}
```

```text
format.ts(3,13): error TS2339: Property 'toUpperCase' does not exist on type 'string | number'.
  Property 'toUpperCase' does not exist on type 'number'.
```

On a union value you may only do what's allowed on **every** member. `toUpperCase` exists only on strings, so you have to check first: `typeof id === "string"`. That check is called narrowing, and it's the subject of the next post.

## Mistakes beginners make

- **`let` with a value meant to be a literal.** `let mode = "fast"` is a `string`. Use `const`, or an explicit type (`let mode: Mode = "fast"`).
- **A duplicated list of values.** A runtime array and a separate union drift apart. `as const` with `typeof` keeps one source.
- **Expecting `as const` to freeze at runtime.** It only affects types.

## What's next

Next: narrowing, discriminated unions and checking that every case is covered.
