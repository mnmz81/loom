---
title: "keyof, typeof and indexed access types in TypeScript"
summary: "keyof gives the property names, typeof in a type position gives a variable's type, and T[\"prop\"] looks up a property's type. Plus what (typeof arr)[number] means and a type-safe get(obj, key)."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 20 }
---

Three operators that build a type from another type or from an existing value, so the same information is written once.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## keyof: the property names

```typescript
// keyof.ts
type Book = { title: string; year: number; inStock: boolean };
type BookKey = keyof Book;

const sortKey: BookKey = "year";
const typo: BookKey = "yaer";
console.log(sortKey);
```

```text
keyof.ts(6,7): error TS2322: Type '"yaer"' is not assignable to type 'keyof Book'.
year
```

[`keyof`](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html) gives a union of the property names: `"title" | "year" | "inStock"`. When you add a property to `Book`, `BookKey` follows.

## typeof in a type position

```typescript
// typeof.ts
const defaults = { theme: "dark", fontSize: 14, autosave: true };
type Settings = typeof defaults;

const mine: Settings = { theme: "light", fontSize: 16, autosave: false };
console.log(typeof defaults, typeof mine.fontSize);
const broken: Settings = { theme: "light", fontSize: "16", autosave: false };
```

```text
typeof.ts(7,44): error TS2322: Type 'string' is not assignable to type 'number'.
object number
```

There are two different `typeof`s:

- Inside an expression, as in `console.log`, it's JavaScript's `typeof`. It runs and returns a string such as `"object"`.
- After `type X =` or `:`, it's [TypeScript's `typeof`](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html). It gives the type inferred for the variable, here `{ theme: string; fontSize: number; autosave: boolean }`, and is erased at compile time.

The type-level `typeof` works only on a variable name or one of its properties, not on a function call.

## Indexed access: T["prop"]

```typescript
// indexed.ts
type Order = {
  id: number;
  customer: { name: string; email: string };
  items: { sku: string; qty: number }[];
};
type Customer = Order["customer"];
type Item = Order["items"][number];

function totalQty(items: Item[]) {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

console.log(totalQty([{ sku: "a1", qty: 2 }, { sku: "b2", qty: 3 }]));
type Total = Order["total"];
```

```text
indexed.ts(15,20): error TS2339: Property 'total' does not exist on type 'Order'.
5
```

An [indexed access type](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html) looks like a property access, but with a type in the brackets. `Order["customer"]` is the customer's type. `[number]` on an array type gives the element type, because every numeric index returns an element. The brackets must hold a type: `Order[key]`, where `key` is a `const`, is an error.

## (typeof arr)[number]

The [unions post](en/posts/typescript-unions-literals/) built a union from an array. Now it can be taken apart:

```typescript
// roles.ts
const roles = ["admin", "editor", "viewer"] as const;
type Role = (typeof roles)[number];

const loose = ["admin", "editor", "viewer"];
type Loose = (typeof loose)[number];

const ok: Role = "editor";
const bad: Role = "owner";
const anything: Loose = "owner";
console.log(ok, anything, roles.length);
```

```text
roles.ts(9,7): error TS2322: Type '"owner"' is not assignable to type '"admin" | "editor" | "viewer"'.
editor owner 3
```

1. `typeof roles` is `readonly ["admin", "editor", "viewer"]`, thanks to `as const`.
2. `[number]` looks up the element type, which is `"admin" | "editor" | "viewer"`.

Without `as const`, `typeof loose` is `string[]`, and `Loose` is just `string`. The parentheses around `typeof roles` aren't required, only more readable.

## Together: a type-safe get(obj, key)

```typescript
// get.ts
function getLoose<T>(obj: T, key: keyof T) {
  return obj[key];
}

function get<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const settings = { theme: "dark", fontSize: 14 };
console.log(get(settings, "fontSize").toFixed(1));
getLoose(settings, "fontSize").toFixed(1);
get(settings, "color");
```

```text
get.ts(12,32): error TS2339: Property 'toFixed' does not exist on type 'string | number'.
  Property 'toFixed' does not exist on type 'string'.
get.ts(13,15): error TS2345: Argument of type '"color"' is not assignable to parameter of type '"fontSize" | "theme"'.
14.0
```

`getLoose` returns `T[keyof T]`, the type of any property: `string | number`. In `get`, `K` is the specific key passed in, here `"fontSize"`, and `T[K]` is exactly `number`. `K extends keyof T` also rejects a key that doesn't exist.

## Mistakes beginners make

- **`type T = defaults` instead of `typeof defaults`.** A variable is a value, not a type. TypeScript suggests `typeof` in the error message.
- **Forgetting `as const` before `[number]`.** You get `string` instead of a union of the values.
- **`key: keyof T` when you need the value's type.** Add a `K extends keyof T` parameter and return `T[K]`.

## What's next

Next: utility types.
