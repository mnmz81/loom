---
title: "Conditional types in TypeScript: extends, infer and distribution over unions"
summary: "T extends U ? X : Y picks a type by a condition. How it distributes over a union and how to stop that, infer to pull a type out of a type, and how ReturnType and Awaited are built."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 21 }
---

A conditional type is the `? :` operator at the type level: if one type is assignable to another, you get one type, otherwise another. Most of the [utility types](en/posts/typescript-utility-types/) are built this way, and [the official handbook](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) has more examples.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24. To see which type came out, the examples assign a wrong value, and the error shows it.

## A condition, and distribution over a union

```typescript
// is-string.ts
type IsString<T> = T extends string ? "match" : "no match";
type Whole<T> = [T] extends [string] ? "match" : "no match";

const one: IsString<"hi"> = "match";
const each: IsString<"hi" | 42> = "maybe";
const whole: Whole<"hi" | 42> = "maybe";
const none: IsString<never> = "no match";
```

```text
is-string.ts(6,7): error TS2322: Type '"maybe"' is not assignable to type '"match" | "no match"'.
is-string.ts(7,7): error TS2322: Type '"maybe"' is not assignable to type '"no match"'.
is-string.ts(8,7): error TS2322: Type '"no match"' is not assignable to type 'never'.
```

`T extends string` doesn't mean "T equals string" but "T is assignable to string", so `"hi"` passes. When the checked type is a bare generic parameter and it receives a union, the condition runs on each member separately and the results are joined: `"hi"` gives `"match"`, `42` gives `"no match"`. This is called a distributive conditional type.

When you wrap both sides in square brackets, `[T]` is no longer a bare parameter, and the union is checked as one unit: `"hi" | 42` isn't assignable to string, so `"no match"`. `never` is an empty union, so distributing over it gives `never`, not `"no match"`.

## infer: pulling a type out of a type

`infer` declares a type variable inside the pattern after `extends`. If the type matches the pattern, TypeScript fills in the variable, and you can use it in the true branch.

```typescript
// unwrap.ts
type ElementOf<T> = T extends readonly (infer Item)[] ? Item : T;
type Unwrap<T> = T extends Promise<infer Value> ? Value : T;

const a: ElementOf<string[]> = 1;
const b: ElementOf<number> = "1";
const c: Unwrap<Promise<boolean>> = "true";
```

```text
unwrap.ts(5,7): error TS2322: Type 'number' is not assignable to type 'string'.
unwrap.ts(6,7): error TS2322: Type 'string' is not assignable to type 'number'.
unwrap.ts(7,7): error TS2322: Type 'string' is not assignable to type 'boolean'.
```

`string[]` matches the pattern, and `Item` is `string`. `number` doesn't match, so `T` itself comes back. `Unwrap` does the same for a Promise.

## How the built-in types are built

These are the definitions from TypeScript 6.0's `lib.es5.d.ts`, renamed so they don't clash with the originals:

```typescript
// built-ins.ts
type MyReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type MyExclude<T, U> = T extends U ? never : T;

function makeUser() {
  return { id: 1, label: "Dana" };
}

const user: MyReturnType<typeof makeUser> = { id: 2 };
const sendable: MyExclude<"draft" | "sent", "sent"> = "sent";
```

```text
built-ins.ts(9,7): error TS2741: Property 'label' is missing in type '{ id: number; }' but required in type '{ id: number; label: string; }'.
built-ins.ts(10,7): error TS2322: Type '"sent"' is not assignable to type '"draft"'.
```

`ReturnType` is `infer` on the function type. `Exclude` relies on distribution: every member assignable to `U` becomes `never` and drops out of the union. `Awaited` is a recursive conditional type: it pulls the value out of any object with a `then` and calls itself again, so `Awaited<Promise<Promise<number>>>` is `number`.

### In older versions

Before [TypeScript 4.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-8.html), `NonNullable<T>` was defined as `T extends null | undefined ? never : T`. Since 4.8 it's `T & {}`: intersecting with `{}` removes `null` and `undefined` just the same, and TypeScript can simplify it even when `T` is generic.

## Mistakes beginners make

- **Reading `extends` as equality.** It's an assignability check: `"hi"` passes `T extends string` even though it isn't `string` itself.
- **Distribution you didn't want.** When you get a union of results instead of one result, wrap it: `[T] extends [U]`.
- **`ReturnType` on an overloaded function.** `infer` takes only the last signature, not the one that matches a particular call.

## What's next

Next: mapped types and template literal types.
