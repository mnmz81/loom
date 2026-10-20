---
title: "Basic types in TypeScript: annotations, inference, arrays and tuples"
summary: "string, number, boolean and bigint, arrays and tuples, and when TypeScript infers the type for you so you don't have to write it."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 4 }
---

You write a type after a colon: `let title: string`. Most of the time you don't need to, because TypeScript infers the type from the first value. This post covers the primitive types, arrays and tuples, and where it is worth writing a type.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24. Lines that start with the file name are `tsc` errors; the rest is the program's output.

## The primitive types

```typescript
// basics.ts
let title: string = "Loom";
let count = 3;
let done = false;
const big = 9007199254740993n;

count = count + 1;
done = "yes";
console.log(title, count, typeof big);
```

```text
basics.ts(8,1): error TS2322: Type 'string' is not assignable to type 'boolean'.
Loom 4 bigint
```

We wrote a type only for `title`; TypeScript inferred the rest from the value: `count` is a `number` and `done` is a `boolean`. So `done = "yes"` is an error. `number` covers both integers and fractions, and `bigint` (with an `n` at the end) is for integers larger than `Number.MAX_SAFE_INTEGER`.

The names are lowercase: `string`, not `String`. `String` is the type of a wrapper object, and [the docs](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) recommend not using it.

## Arrays and tuples

```typescript
// arrays.ts
const scores: number[] = [90, 85];
const names: Array<string> = ["Dana", "Noa"];
const pair: [string, number] = ["Dana", 90];

scores.push("100");
const [player, score] = pair;
console.log(player.toUpperCase(), score.toFixed(1), names.length);
```

```text
arrays.ts(6,13): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
DANA 90.0 2
```

- `number[]` and `Array<number>` are the same type written two ways.
- `[string, number]` is a tuple: an array of known length where each position has its own type. When destructured, `player` gets `string` and `score` gets `number`, so you can call `toFixed` without a check.
- `push("100")` fails in `tsc` but runs: `scores` now holds a string, and nothing stops that at runtime.

## Where TypeScript infers for you

```typescript
// infer.ts
function average(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const avg = average([90, 85]);
console.log(avg.toFixed(2));

const mixed = ["a", 1];
mixed.push(true);
```

```text
infer.ts(10,12): error TS2345: Argument of type 'boolean' is not assignable to parameter of type 'string | number'.
87.50
```

- `average` has no return type written, and TypeScript inferred `number` from the calculation. `avg` is a `number` too.
- `mixed` got the type `(string | number)[]`, an array where each item is a string or a number. `true` doesn't fit.

The usual rule: write types on function parameters, because there's nothing to infer them from, and on values that start empty (`const ids: number[] = []`). Leave local variables and return types to inference, unless you want the return type to act as a contract the function must meet.

## Mistakes beginners make

- **Writing a type on every variable.** `let count: number = 3` adds no information, only noise.
- **Writing `String` or `Number` with a capital letter.** The right types are `string` and `number`.
- **Forgetting the check doesn't exist at runtime.** `push("100")` added a string to an array of numbers when the code ran, despite the error.

## What's next

Next: `any`, `unknown`, `never` and `void`.
