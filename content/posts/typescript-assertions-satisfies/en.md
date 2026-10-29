---
title: "as, satisfies and type guards in TypeScript"
summary: "as silences the checker and checks nothing at runtime. satisfies checks an object without losing its exact type. And value is T and asserts value is T functions that really check."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 17 }
---

Sometimes you know more about a value than TypeScript does. There are three ways to tell it, and the difference is who checks that you were right: nobody, the compiler, or code that runs.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## as: TypeScript takes your word for it

```typescript
// as.ts
type User = { name: string; email: string };

const port = "8080" as number;
const forced = "8080" as unknown as number;
console.log(typeof forced);

const raw: unknown = JSON.parse('{"name":"Dana"}');
const user = raw as User;
console.log(user.email.toLowerCase());
```

```text
as.ts(4,14): error TS2352: Conversion of type 'string' to type 'number' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
string
TypeError: Cannot read properties of undefined (reading 'toLowerCase')
```

A [type assertion](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions) with `as` converts nothing. `tsc` erases it, and there's no check at runtime. `raw as User` passed, and the crash came only when we accessed the `email` that doesn't exist.

TypeScript refuses only a conversion between types with no overlap at all, like `string` to `number`. The error message itself suggests going through `unknown` first, and then `as unknown as number` passes, but the value is still a string, as `typeof` shows. It's an escape hatch, not a fix.

## satisfies: checking without losing the type

```typescript
// config.ts
type Env = "dev" | "prod";
type Settings = { url: string; retries: number | "none" };

const annotated: Record<Env, Settings> = {
  dev: { url: "http://localhost:3000", retries: "none" },
  prod: { url: "https://api.example.com", retries: 3 },
};
annotated.prod.retries.toFixed(1);

const config = {
  dev: { url: "http://localhost:3000", retries: "none" },
  prod: { url: "https://api.example.com", retries: 3 },
  prdo: { url: "https://api.example.com", retries: 5 },
} satisfies Record<Env, Settings>;
console.log(config.prod.retries.toFixed(1));
```

```text
config.ts(9,24): error TS2339: Property 'toFixed' does not exist on type 'number | "none"'.
  Property 'toFixed' does not exist on type '"none"'.
config.ts(14,3): error TS2353: Object literal may only specify known properties, and 'prdo' does not exist in type 'Record<Env, Settings>'.
3.0
```

A type annotation (`: Record<Env, Settings>`) makes the variable's type `Settings`, so `annotated.prod.retries` is `number | "none"` even though it says 3. [`satisfies`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator) checks that the object matches the type but leaves the variable with its inferred type: `config.prod.retries` is `number`. The check itself is no weaker, and the misspelled `prdo` key is caught.

## Type guards and assertion functions

The [narrowing post](en/posts/typescript-narrowing/) showed how `typeof` and `in` narrow a type. When the check is long, wrap it in a function that returns a [type predicate](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates):

```typescript
// guards.ts
type User = { name: string; email: string };

function isUser(value: unknown): value is User {
  return typeof value === "object" && value !== null &&
    "name" in value && typeof value.name === "string" &&
    "email" in value && typeof value.email === "string";
}

function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) throw new Error("not a user");
}

const items: unknown[] = [{ name: "Dana", email: "dana@example.com" }, { name: "Avi" }];
console.log(items.filter(isUser).map((u) => u.email));

const raw: unknown = JSON.parse('{"name":"Avi"}');
assertUser(raw);
console.log(raw.name);
```

```text
[ 'dana@example.com' ]
Error: not a user
```

- `value is User`: when `isUser` returns `true`, the value passed to it is a `User`. `filter` understands this too and returns `User[]`.
- `asserts value is User`: an [assertion function](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions) returns no value. If it returned without throwing, the value is a `User` until the end of the scope. Here it threw, and `raw.name` was never printed.

TypeScript doesn't check that the function body really proves what it declares. A predicate that checks less than it promises is an `as` in disguise.

### In older versions

```typescript
// angle.ts
const raw: unknown = "hi";
const text = <string>raw;
console.log(text.length);
```

```text
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: The angle-bracket syntax for type assertions, `<T>expr`, is not supported in type strip mode. Instead, use the 'as' syntax: `expr as T`.
```

`<string>raw` is the old syntax for `as`, and it still passes `tsc`. It doesn't work in `.tsx` files, `erasableSyntaxOnly` rejects it, and Node refuses to run it, as shown above. `satisfies` arrived in TypeScript 4.9. Before that there was only a type annotation, which loses the exact type.

## Mistakes beginners make

- **`as` on a `fetch` or `JSON.parse` result.** It compiles and crashes later. Check it with a type guard or a validation library.
- **`{ ... } as Settings` on a new object.** A missing property or a misspelled one passes silently. A type annotation or `satisfies` catches both.
- **A type guard that checks only one property.** TypeScript believes it about all the rest.

## What's next

Next: generics.
