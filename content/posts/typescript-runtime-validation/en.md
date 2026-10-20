---
title: "Validating data at runtime in TypeScript: type guards and zod"
summary: "Types are erased before the code runs, so data from outside (JSON, APIs, env vars, forms) must be checked. A hand-written type guard, then zod: one schema, a type derived from it, and safeParse."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 24 }
---

TypeScript checks the code, not the data. `JSON.parse` and `response.json()` return `any`, and at runtime no type stops JSON with a missing field, as the [async post](en/posts/typescript-async/) showed. Everything that comes from outside, an API response, a config file, an environment variable or a form, needs checking in code that runs.

Every example was checked with TypeScript 6.0.3 and 7.0.2, Node.js 24 and zod 4.6.7.

## Checking by hand: a type guard over unknown

```typescript
// guard.ts
type User = { id: number; email: string };

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "number" &&
    "email" in value && typeof value.email === "string"
  );
}

const input: unknown = JSON.parse('{"id":"7","email":"dana@example.com"}');
if (isUser(input)) console.log(input.email);
else console.log("invalid user");
```

```text
invalid user
```

Start from `unknown`, not `any`, so TypeScript forces a check before use. `value is User` is a type predicate: when the function returns `true`, `input` is narrowed to `User`. Here `id` arrived as a string, so the check fails. This works, but every field needs a line, and the type and the check are two separate things that can drift apart.

## zod: describing the data once

[zod](https://zod.dev/) is a library where you write a schema, and it both checks and gives you the type. Install it in a project with `"type": "module"` in `package.json`:

```typescript
// user.ts
import * as z from "zod";

const User = z.object({
  id: z.int().positive(),
  email: z.email(),
  role: z.enum(["admin", "member"]).default("member"),
});
type User = z.infer<typeof User>;

const draft: User = { id: 7, email: "dana@example.com" };

const result = User.safeParse(JSON.parse('{"id":"7","email":"dana"}'));
if (result.success) console.log(result.data.role);
else console.log(z.prettifyError(result.error));

console.log(User.parse({ id: 7, email: "dana@example.com" }));
```

```bash
npm install zod
tsc --noEmit user.ts
node user.ts
```

```text
user.ts(11,7): error TS2741: Property 'role' is missing in type '{ id: number; email: string; }' but required in type '{ id: number; email: string; role: "admin" | "member"; }'.
✖ Invalid input: expected number, received string
  → at id
✖ Invalid email address
  → at email
{ id: 7, email: 'dana@example.com', role: 'member' }
```

- [`z.infer<typeof User>`](https://zod.dev/basics) derives the type from the schema, so there's nothing to keep in sync. It's the output type: after `default`, `role` is always present, and `tsc` requires it in `draft`. For the input type, where `role` is optional, there's `z.input`.
- `safeParse` doesn't throw. It returns a discriminated union: `success: true` with `data`, or `success: false` with `error`. [`z.prettifyError`](https://zod.dev/error-formatting) turns the error into text, and here it shows both problems at once.
- `parse` returns the data after checking it and fills in defaults, and when the check fails it throws a `ZodError`.

## Environment variables and forms

Environment variables and form values are always strings. [`z.coerce.number()`](https://zod.dev/api) runs `Number(input)` before checking, so `"3000"` passes as a number and `"abc"` fails. Check `process.env` once at startup, and use the typed result everywhere else.

In Python the same idea is called pydantic: a class with type hints that checks the data. See [the pydantic post](en/posts/python-pydantic/).

## Mistakes beginners make

- **`as User` on JSON.** It checks nothing, it only silences TypeScript.
- **Writing both a `type` and a schema for the same data.** When you change one, the other falls behind. Derive it with `z.infer`.
- **Checking again in every function.** Check at the boundary, where the data comes in, and work with the type from there.

## What's next

Next: `.d.ts` declaration files.
