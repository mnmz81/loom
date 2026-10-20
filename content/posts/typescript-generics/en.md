---
title: "Generics in TypeScript: generic functions, inference and constraints"
summary: "Why generics and not any, how TypeScript infers the type from the arguments, constraints with extends and keyof, default type parameters, and when to write the type explicitly."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 17 }
---

A function that works with any type needs a way to say "what goes in is what comes out". A generic is a type parameter: TypeScript fills it in on every call from the arguments.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## Why not any

```typescript
// first.ts
function firstAny(items: any[]) {
  return items[0];
}

function first<T>(items: T[]): T {
  return items[0];
}

const a = firstAny(["x", "y"]);
const b = first(["x", "y"]);
console.log(a.toFixed(1));
console.log(b.toFixed(1));
```

```text
first.ts(13,15): error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?
TypeError: a.toFixed is not a function
```

`firstAny` accepts everything but returns `any`, so the mistake on `a` shows up only at runtime. In `first<T>`, `T` links the input to the output: we called it with a `string[]`, so `T` is `string` and `b` is a `string`. `tsc` caught the same mistake on `b` up front.

## Inference and explicit types

```typescript
// pair.ts
function pair<A, B>(left: A, right: B): [A, B] {
  return [left, right];
}

const inferred = pair("id", null);
const explicit = pair<string, number | null>("id", null);
const wrong = pair<string, number>("id", "42");
console.log(inferred, explicit);
```

```text
pair.ts(8,42): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
[ 'id', null ] [ 'id', null ]
```

Most calls don't write the types: `pair("id", null)` gets `[string, null]`. When inference is too narrow, or there's nothing to infer from, write the types in `<>` after the function name, and TypeScript checks the arguments against them ([Specifying Type Arguments](https://www.typescriptlang.org/docs/handbook/2/functions.html#specifying-type-arguments)).

## Constraints with extends

Without a constraint, `T` can be anything, so you can't access any of its properties. [`extends`](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-constraints) limits `T` to types that have what you need:

```typescript
// longest.ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

function sortBy<T>(items: T[], key: keyof T): T[] {
  return [...items].sort((x, y) => (x[key] < y[key] ? -1 : 1));
}

const books = [{ title: "Dune", year: 1965 }, { title: "Emma", year: 1815 }];
console.log(longest("apple", "fig"), longest([1, 2], [1, 2, 3]));
console.log(sortBy(books, "year").map((book) => book.title));
longest(10, 20);
sortBy(books, "author");
```

```text
longest.ts(13,9): error TS2345: Argument of type 'number' is not assignable to parameter of type '{ length: number; }'.
longest.ts(14,15): error TS2345: Argument of type '"author"' is not assignable to parameter of type '"title" | "year"'.
apple [ 1, 2, 3 ]
[ 'Emma', 'Dune' ]
```

- `longest` works with strings and with arrays, because both have a `length`. A number is rejected.
- `keyof T` is the union of `T`'s property names, here `"title" | "year"`. It gets its own post.

## Default type parameters

```typescript
// field.ts
type Field<T = string> = { label: string; value: T };

const city: Field = { label: "City", value: "Haifa" };
const age: Field<number> = { label: "Age", value: 42 };
const broken: Field = { label: "Age", value: 42 };
console.log(city.value, age.value);
```

```text
field.ts(6,39): error TS2322: Type 'number' is not assignable to type 'string'.
Haifa 42
```

`Field` without `<>` is `Field<string>`. As with function parameters, a [parameter with a default](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-parameter-defaults) can't come before a required one.

## Mistakes beginners make

- **A type parameter that appears once.** `function log<T>(x: T): void` links nothing. `x: unknown` says the same thing. The handbook recommends that every type parameter appear at least twice.
- **Writing the type explicitly on every call.** Inference is usually more precise. Write it only when inference gets it wrong.
- **Accessing a property of `T` without `extends`.** TypeScript doesn't know it has that property. Add a constraint.

## What's next

Next: generics in practice.
