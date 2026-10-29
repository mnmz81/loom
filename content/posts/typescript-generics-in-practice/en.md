---
title: "Generics in practice: Promise<T>, ApiResult<T>, generic classes and Array<T>"
summary: "Where generics show up in real code: Promise<T> in async functions, an ApiResult<T> response type, a generic interface and class, and the generic signatures of map, find and reduce."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 19 }
---

The [previous post](en/posts/typescript-generics/) showed how to write a generic function. Most generics in everyday code, though, are types someone else wrote, or types that wrap another value.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## Promise<T>

```typescript
// load.ts
type User = { id: number; name: string };

async function loadUser(id: number): Promise<User> {
  return { id, name: "Dana" };
}

async function countUsers(): number {
  return 1;
}

loadUser(1).then((user) => console.log(user.name.toUpperCase()));
```

```text
load.ts(8,30): error TS1064: The return type of an async function or method must be the global Promise<T> type. Did you mean to write 'Promise<number>'?
DANA
```

An `async` function always returns a `Promise`, and `T` is what you get after `await` or in `then`. That's why `user` inside the callback is a `User` without us writing it. The return type of an `async` function must be `Promise<...>`, as the error on `countUsers` shows.

## ApiResult<T>: a response type

```typescript
// api-result.ts
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
type User = { id: number; name: string };

function findUser(id: number): ApiResult<User> {
  if (id === 1) return { ok: true, data: { id, name: "Dana" } };
  return { ok: false, error: `user ${id} not found` };
}

for (const id of [1, 2]) {
  const result = findUser(id);
  console.log(result.ok ? result.data.name : result.error);
}
console.log(findUser(1).data);
```

```text
api-result.ts(14,25): error TS2339: Property 'data' does not exist on type 'ApiResult<User>'.
  Property 'data' does not exist on type '{ ok: false; error: string; }'.
Dana
user 2 not found
{ id: 1, name: 'Dana' }
```

`ApiResult<T>` is a discriminated union with a parameter: the same shape serves `ApiResult<User>`, `ApiResult<Order[]>` and any other response. `data` is available only after checking `ok`, so you can't forget to handle the error. The last line runs, but `tsc` rejects it.

## A generic interface and class

```typescript
// store.ts
interface Store<T> {
  add(item: T): void;
  all(): readonly T[];
}

class MemoryStore<T> implements Store<T> {
  private items: T[] = [];
  add(item: T) {
    this.items.push(item);
  }
  all() {
    return this.items;
  }
}

const tags = new MemoryStore<string>();
tags.add("ts");
tags.add(42);
console.log(tags.all());
```

```text
store.ts(19,10): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
[ 'ts', 42 ]
```

The parameter goes after the interface or class name, and every method sees it. `new MemoryStore<string>()` sets `T` for the whole instance. `T` belongs to the instance only: [a `static` member can't use it](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-classes). `tsc` rejected `42`, but `private` and `T` are erased, so at runtime it goes in.

## The signatures of Array<T>

`string[]` is shorthand for `Array<string>`, and array methods are defined as generics. The signature of `map` in TypeScript's `lib.es5.d.ts`:

`map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]`

`T` is the element type, and `U` is inferred from what the callback returns.

```typescript
// arrays.ts
const words = ["ts", "node", "angular"];
const lengths = words.map((word) => word.length);
const byWord = words.reduce<Record<string, number>>((acc, word) => ({ ...acc, [word]: word.length }), {});
console.log(lengths, byWord);

const found = words.find((word) => word.startsWith("x"));
console.log(found.length);
```

```text
arrays.ts(8,13): error TS18048: 'found' is possibly 'undefined'.
[ 2, 4, 7 ] { ts: 2, node: 4, angular: 7 }
TypeError: Cannot read properties of undefined (reading 'length')
```

- `map` returns `number[]`, because the callback returns a `number`.
- `reduce<U>` infers `U` from the initial value. From `{}` it would infer `{}`, so the type is written explicitly.
- `find` returns `T | undefined`, because no element may match.

## Mistakes beginners make

- **`Promise<any>` or `ApiResult<any>`.** `any` inside the generic cancels everything it gives you.
- **`as User` on `data` instead of a generic type.** A function like `findUser` that returns `ApiResult<User>` passes the type along without `as`.
- **Ignoring `find`'s `undefined`.** Handle the not-found case, with `if` or `??`.

## What's next

Next: `keyof`, `typeof` and indexed access types.
