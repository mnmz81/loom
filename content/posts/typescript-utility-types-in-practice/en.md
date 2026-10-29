---
title: "Utility types that earn their place: Pick, Omit, ReturnType, Parameters and Record"
summary: "Where the common utility types help and where they quietly let bugs through: Omit's unchecked keys and unions, ReturnType for library types and overloads, and the Record that lies."
date: 2026-10-29
tags: [typescript]
series: { key: typescript, order: 22 }
---

The [utility types post](en/posts/typescript-utility-types/) showed what each one does. This post is about the five that show up in real code, and the edge where each one stops protecting you.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24, against the [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) reference.

## Pick and Omit: Omit doesn't check its keys

Deriving a type with `Pick` or `Omit` keeps it in sync with the original: rename a field in `User` and every derived type follows. But the two aren't symmetric:

```typescript
// omit-keys.ts
type User = { id: number; name: string; email: string; password: string };

type Login = Pick<User, "email" | "pasword">;
type PublicUser = Omit<User, "pasword">;

const pub: PublicUser = { id: 1, name: "Dana", email: "dana@example.com", password: "secret" };
console.log(Object.keys(pub));
```

```text
omit-keys.ts(4,25): error TS2344: Type '"email" | "pasword"' does not satisfy the constraint 'keyof User'.
  Type '"pasword"' is not assignable to type 'keyof User'. Did you mean '"password"'?
[ 'id', 'name', 'email', 'password' ]
```

`Pick` requires keys that exist (`K extends keyof T`). `Omit` accepts any key (`K extends keyof any`), so the typo removes nothing and `password` stays in the "public" type. A stricter version is one line:

```typescript
// strict-omit.ts
type StrictOmit<T, K extends keyof T> = Omit<T, K>;
type User = { id: number; name: string; password: string };

type PublicUser = StrictOmit<User, "pasword">;
const ok: StrictOmit<User, "password"> = { id: 1, name: "Dana" };
console.log(ok);
```

```text
strict-omit.ts(5,36): error TS2344: Type '"pasword"' does not satisfy the constraint 'keyof User'.
{ id: 1, name: 'Dana' }
```

## Omit on a union flattens it

`keyof` on a union gives only the keys that every member shares, and `Omit` is built on `keyof`. So `Omit` on a [discriminated union](en/posts/typescript-discriminated-unions/) loses the members' own fields:

```typescript
// omit-union.ts
type Shape =
  | { id: string; kind: "circle"; radius: number }
  | { id: string; kind: "square"; size: number };

type NewShape = Omit<Shape, "id">;
const flat: NewShape = { kind: "circle", radius: 2 };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
const fixed: DistributiveOmit<Shape, "id"> = { kind: "circle", radius: 2 };
console.log(fixed);
```

```text
omit-union.ts(7,42): error TS2353: Object literal may only specify known properties, and 'radius' does not exist in type 'NewShape'.
{ kind: 'circle', radius: 2 }
```

`NewShape` is `{ kind: "circle" | "square" }`, with no `radius` and no `size`. `DistributiveOmit` uses a [conditional type](en/posts/typescript-conditional-types/) to apply `Omit` to each member separately, and keeps the union.

## ReturnType: the type a library didn't export

`ReturnType` earns its place when a library returns an object whose type it doesn't export. Instead of copying the shape by hand, take it from the function:

```typescript
// store.ts
function createStore(initial: number) {
  let value = initial;
  return { get: () => value, add: (n: number) => (value += n) };
}

type Store = ReturnType<typeof createStore>;

function double(store: Store) {
  store.add(store.get());
}

const s = createStore(4);
double(s);
console.log(s.get());
```

```text
8
```

When `createStore` changes, `Store` changes with it. For overloaded functions, though, `ReturnType` and `Parameters` see only the last signature:

```typescript
// overloads.ts
function parse(input: string): number;
function parse(input: string[]): number[];
function parse(input: string | string[]): number | number[] {
  return Array.isArray(input) ? input.map(Number) : Number(input);
}

type Out = ReturnType<typeof parse>;
const one: Out = parse("7");
console.log(one);
```

```text
overloads.ts(9,7): error TS2322: Type 'number' is not assignable to type 'number[]'.
7
```

The [conditional types page](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types) says it plainly: inferences are made "from the last signature". Put the most general overload last, or name the types yourself.

## Parameters: reaching into an options object

`Parameters<typeof fn>` is a tuple, so an index gives one parameter. It's the way to name an options type that a library accepts but never exported:

```typescript
// options.ts
function connect(url: string, options: { retries: number; timeoutMs?: number }) {
  return `${url} (retries: ${options.retries})`;
}

type ConnectOptions = Parameters<typeof connect>[1];

const defaults: ConnectOptions = { retries: 3 };
const bad: ConnectOptions = { retry: 3 };
console.log(connect("db://local", defaults));
```

```text
options.ts(9,31): error TS2353: Object literal may only specify known properties, and 'retry' does not exist in type '{ retries: number; timeoutMs?: number | undefined; }'.
db://local (retries: 3)
```

In your own generic code you rarely need either. To wrap any function, capture its parameters and result directly, `<A extends unknown[], R>(fn: (...args: A) => R)`, and TypeScript infers both.

## Record<string, T> promises every key

`Record<"a" | "b", T>` is exact. `Record<string, T>` says that *every* string key has a `T`, so reading a key that isn't there type-checks:

```typescript
// record-lie.ts
const prices: Record<string, number> = { apple: 4.5 };

const kiwi = prices["kiwi"];
console.log(kiwi.toFixed(2));
```

```text
TypeError: Cannot read properties of undefined (reading 'toFixed')
```

`tsc` reports nothing, and the code crashes. Three fixes, from smallest to largest:

- Type it `Partial<Record<string, number>>`: every read is `number | undefined`.
- Turn on [`noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess) in `tsconfig.json`: every index read gets `| undefined`, for arrays too.
- Use a `Map`: `get()` returns `number | undefined` by design.

## Mistakes beginners make

- **`Omit` with a key that doesn't exist.** No error, nothing removed. Use `StrictOmit`.
- **`Omit` on a discriminated union.** It collapses to the shared fields. Use `DistributiveOmit`.
- **Trusting `Record<string, T>` on lookup.** A missing key reads as `T`. Add `| undefined` one of the three ways above.

## What's next

Next: generics beyond the textbook: when a type parameter earns its place, and when it's a cast in disguise.
