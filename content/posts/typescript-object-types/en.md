---
title: "Object types in TypeScript: optional, readonly and index signatures"
summary: "How to describe an object: required, optional and readonly properties, why an extra property is an error only sometimes, and index signatures for objects whose keys aren't known up front."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 7 }
---

Most data in code is objects: a user, an order, settings. An object type describes which properties it has and the type of each.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## Required, optional and readonly properties

```typescript
// user.ts
type User = {
  readonly id: number;
  name: string;
  email?: string;
};

const dana: User = { id: 1, name: "Dana" };
dana.name = "Dana L.";
dana.id = 2;
console.log(dana.email?.toLowerCase() ?? "no email");
```

```text
user.ts(10,6): error TS2540: Cannot assign to 'id' because it is a read-only property.
no email
```

- `type User = { ... }` gives the type a name, so you can use it in several places. `interface` does almost the same (next post).
- `email?` is optional. Its type is `string | undefined`, so you access it with `?.`.
- `readonly id` can be set only at creation. `readonly` is checked only by `tsc`: at runtime the line `dana.id = 2` runs and changes the value.

## An extra property: an error only in a fresh object

```typescript
// excess.ts
type Point = { x: number; y: number };

const p: Point = { x: 1, y: 2, z: 3 };
const raw = { x: 1, y: 2, z: 3 };
const q: Point = raw;
console.log(q);
```

```text
excess.ts(4,32): error TS2353: Object literal may only specify known properties, and 'z' does not exist in type 'Point'.
{ x: 1, y: 2, z: 3 }
```

TypeScript checks shape, not names: any object with numeric `x` and `y` is a `Point`, even with extra properties. That's why `q = raw` passes. The exception is an object written directly where a `Point` is expected: there a property the type doesn't have is probably a typo, and TypeScript reports it (the excess property check).

## Index signatures

When the keys aren't known up front, such as scores by name, you write the type of the key and of the value:

```typescript
// scores.ts
const scores: { [name: string]: number } = { dana: 90 };
scores.noa = 85;
scores.dana = "high";

const missing = scores.yael;
console.log(missing.toFixed(1));
```

```text
scores.ts(4,1): error TS2322: Type 'string' is not assignable to type 'number'.
TypeError: Cannot read properties of undefined (reading 'toFixed')
```

`Record<string, number>` is the same type in a shorter form. Note the last line: `scores.yael` doesn't exist, but TypeScript says it's a `number` and reports nothing. The `noUncheckedIndexedAccess` option in `tsconfig.json` adds `undefined` to every such access, so `tsc` makes you check before use. It isn't part of `strict`, but `tsc --init` turns it on.

## Mistakes beginners make

- **Relying on `readonly` at runtime.** It's a compiler check only. For runtime freezing there's `Object.freeze`.
- **Assuming an "extra property" is always caught.** Only in an object written directly. An object that went through a variable can hold any extra property.
- **An index signature without `noUncheckedIndexedAccess`.** Every missing key looks like it has a value.

## What's next

Next: `interface` vs `type`, and when to pick each.
