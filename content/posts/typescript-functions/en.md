---
title: "Functions in TypeScript: parameters, function types and overloads"
summary: "Types for parameters and return values, optional parameters, defaults and rest, a function's type as a type, and overloads for a function whose return type depends on its input."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 6 }
---

For functions, TypeScript checks two things: that a call passes the right number of arguments with the right types, and that the function returns what it promised.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## Parameters: required, optional and default

```typescript
// greet.ts
function greet(name: string, greeting = "Hello", punctuation?: string): string {
  return `${greeting}, ${name}${punctuation ?? "!"}`;
}

console.log(greet("Dana"));
console.log(greet("Dana", "Hi", "?"));
greet();
greet("Dana", "Hi", "?", "extra");
```

```text
greet.ts(8,1): error TS2554: Expected 1-3 arguments, but got 0.
greet.ts(9,26): error TS2554: Expected 1-3 arguments, but got 4.
Hello, Dana!
Hi, Dana?
```

- `name: string` is a required parameter.
- `greeting = "Hello"` gets a default value, from which TypeScript infers that it's a `string`.
- `punctuation?: string` is optional: inside the function its type is `string | undefined`, so `??` handles the case where it wasn't passed.

In JavaScript the last two calls would run without a warning. Here every call with the wrong number of arguments is an error.

## Rest and function types

```typescript
// math.ts
function sum(...values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

type Op = (a: number, b: number) => number;
const multiply: Op = (a, b) => a * b;
const broken: Op = (a, b) => `${a}${b}`;

console.log(sum(1, 2, 3), multiply(4, 5));
```

```text
math.ts(8,30): error TS2322: Type 'string' is not assignable to type 'number'.
6 20
```

- `...values: number[]` collects any number of arguments into an array.
- `type Op = (a: number, b: number) => number` defines a function type. In `multiply` we didn't type `a` and `b`: they came from `Op`. `broken` returns a string, so it doesn't fit `Op`.

Function types are most useful for callbacks: a parameter of type `(item: string) => void` says exactly what the function you pass in must take and return.

## Overloads

When the returned type depends on the type that comes in, you write several signatures above the implementation:

```typescript
// overloads.ts
function parse(value: string): number;
function parse(value: number): string;
function parse(value: string | number): string | number {
  return typeof value === "string" ? Number(value) : String(value);
}

const n = parse("42");
const s = parse(42);
console.log(n + 1, s.padStart(4, "0"));
parse(true);
```

```text
overloads.ts(11,7): error TS2769: No overload matches this call.
  Overload 1 of 2, '(value: string): number', gave the following error.
    Argument of type 'boolean' is not assignable to parameter of type 'string'.
  Overload 2 of 2, '(value: number): string', gave the following error.
    Argument of type 'boolean' is not assignable to parameter of type 'number'.
43 0042
```

The first two lines are the signatures callers see, and the third is the implementation, which isn't visible from outside. `n` came out a `number` and `s` a `string`, with no check in the calling code. In the error message, TypeScript 7.0 lists only the last signature.

When you can, prefer one type over several overloads: sometimes a union parameter is enough, and sometimes generics (in their own post).

## Mistakes beginners make

- **An optional parameter before a required one.** `function f(a?: string, b: string)` is an error. Optional ones go last.
- **Forgetting that `?` adds `undefined`.** Inside the function you have to handle the case where the value wasn't passed.
- **Writing overloads when a union is enough.** If the return type doesn't change with the input, `value: string | number` is simpler.

## What's next

Next: object types, optional properties and `readonly`.
