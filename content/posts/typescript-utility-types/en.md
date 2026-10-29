---
title: "Utility types in TypeScript: Partial, Pick, Omit, Record, ReturnType and more"
summary: "TypeScript's built-in helper types with one example per group: Partial and Readonly, Pick and Omit, Record, ReturnType and Awaited, NonNullable and NoInfer."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 21 }
---

TypeScript ships with ready-made generic types that transform an existing type: make properties optional, remove a property, get a function's return type. The full list is on [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html). Here are the common ones, with one example per group.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## Partial, Required and Readonly

```typescript
// update.ts
type User = { id: number; name: string; email: string };
type Options = { retries?: number; timeout?: number };

function updateUser(user: Readonly<User>, changes: Partial<User>): User {
  return { ...user, ...changes };
}

const defaults: Required<Options> = { retries: 3, timeout: 1000 };
const dana: Readonly<User> = { id: 1, name: "Dana", email: "dana@example.com" };
console.log(updateUser(dana, { email: "d@example.com" }), defaults);
dana.name = "Avi";
```

```text
update.ts(12,6): error TS2540: Cannot assign to 'name' because it is a read-only property.
{ id: 1, name: 'Dana', email: 'd@example.com' } { retries: 3, timeout: 1000 }
```

- `Partial<User>`: every property is optional, so `changes` can hold only what changes.
- `Required<Options>`: the opposite, every `?` is removed. The defaults must cover every property.
- `Readonly<User>`: properties can't be assigned. This is a `tsc` check only: at runtime the assignment went through silently. For freezing at runtime there's `Object.freeze`.

## Pick, Omit and "overriding" a property

```typescript
// pick-omit.ts
type User = { id: number; name: string; email: string; password: string };

type PublicUser = Omit<User, "password">;
type Credentials = Pick<User, "email" | "password">;
type UserForm = Omit<User, "id"> & { id: string };
type Broken = User & { id: string };

function toPublic({ password, ...rest }: User): PublicUser {
  return rest;
}

const login: Credentials = { email: "dana@example.com", password: "secret" };
const form: UserForm = { id: "new", name: "Dana", ...login };
const broken: Broken = { id: "new", name: "Dana", ...login };
console.log(toPublic({ ...form, id: 1 }));
```

```text
pick-omit.ts(15,26): error TS2322: Type 'string' is not assignable to type 'never'.
{ id: 1, name: 'Dana', email: 'dana@example.com' }
```

`Pick` selects properties, and `Omit` removes them. [The interface vs type post](en/posts/typescript-interface-vs-type/) showed that `&` doesn't override a property: `id` in `Broken` is `number & string`, which is `never`. To replace a property's type, remove it first with `Omit` and then add it back.

## Record

```typescript
// record.ts
type Role = "admin" | "editor" | "viewer";

const permissions: Record<Role, string[]> = {
  admin: ["read", "write", "delete"],
  editor: ["read", "write"],
};
console.log(Object.keys(permissions));
```

```text
record.ts(4,7): error TS2741: Property 'viewer' is missing in type '{ admin: string[]; editor: string[]; }' but required in type 'Record<Role, string[]>'.
[ 'admin', 'editor' ]
```

`Record<Keys, Value>` is an object whose keys are `Keys` and whose values are `Value`. When `Keys` is a union, every key is required, so forgetting `viewer` is caught. When you add a role to `Role`, `tsc` shows every `Record` that needs updating.

## ReturnType, Parameters and Awaited

```typescript
// fn-types.ts
async function fetchOrder(id: number, includeItems: boolean) {
  return { id, items: includeItems ? ["book"] : [] };
}

type FetchArgs = Parameters<typeof fetchOrder>;
type Pending = ReturnType<typeof fetchOrder>;
type Order = Awaited<Pending>;

const args: FetchArgs = [7, true];
fetchOrder(...args).then((order: Order) => console.log(order));
const wrong: Order = { id: "7", items: [] };
```

```text
fn-types.ts(12,24): error TS2322: Type 'string' is not assignable to type 'number'.
{ id: 7, items: [ 'book' ] }
```

- `Parameters` gives a tuple of the parameters: `[id: number, includeItems: boolean]`.
- `ReturnType` gives the return type, here `Promise<{ id: number; items: string[] }>`.
- `Awaited` unwraps the `Promise`, like `await`.

All three take a function type, so `typeof` is needed. They're useful when a library exports a function but not its types.

## NonNullable and NoInfer

```typescript
// required.ts
function required<T>(value: T, label: string): NonNullable<T> {
  if (value === null || value === undefined) throw new Error(`${label} is missing`);
  return value;
}

const params = new URLSearchParams("page=2");
const page = required(params.get("page"), "page");
console.log(page.padStart(3, "0"));
required(params.get("sort"), "sort");
```

```text
002
Error: sort is missing
```

`params.get` returns `string | null`. `NonNullable` removes `null` and `undefined` from the type, so `page` is a `string`.

```typescript
// no-infer.ts
function pickLoose<C extends string>(options: C[], fallback: C): C {
  return fallback;
}

function pick<C extends string>(options: C[], fallback: NoInfer<C>): C {
  return fallback;
}

console.log(pickLoose(["green", "red"], "blue"));
pick(["green", "red"], "blue");
```

```text
no-infer.ts(11,24): error TS2345: Argument of type '"blue"' is not assignable to parameter of type '"green" | "red"'.
blue
```

In `pickLoose`, TypeScript infers `C` from both parameters, so `"blue"` simply joins the union. `NoInfer<C>` tells it not to infer from `fallback`, so `C` is set by `options` alone and `"blue"` is rejected.

### In older versions

According to the Utility Types page, `Omit` arrived in TypeScript 3.5, `Awaited` in 4.5 and `NoInfer` in 5.4. Before 5.4, the usual approach was an extra type parameter, `<C extends string, D extends C>`, as the [5.4 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html#the-noinfer-utility-type) show.

## Mistakes beginners make

- **`&` to change a property's type.** You get `never`. Use `Omit`, then `&`.
- **Relying on `Readonly` at runtime.** It's erased at compile time.
- **`ReturnType<fetchOrder>` without `typeof`.** `fetchOrder` is a value. Write `ReturnType<typeof fetchOrder>`.

## What's next

Next: where `Pick`, `Omit`, `ReturnType`, `Parameters` and `Record` earn their place, and where they quietly let bugs through.
