---
title: "zod in depth: composing schemas, transforms and error reports"
summary: "Past the first zod schema: deriving schemas, discriminated unions, transform and refine, unknown keys, turning errors into form messages, and when zod isn't worth it."
date: 2026-10-29
tags: [typescript]
series: { key: typescript, order: 29 }
---

The [runtime validation post](en/posts/typescript-runtime-validation/) introduced [zod](https://zod.dev/): a schema, `z.infer`, `safeParse` and `parse`. This post covers what a real project needs next.

Every example was checked with TypeScript 6.0.3 and 7.0.2, Node.js 24 and zod 4.6.5, against the [zod API docs](https://zod.dev/api).

## Deriving schemas

Schemas have their own versions of the [utility types](en/posts/typescript-utility-types-in-practice/): `pick`, `omit`, `partial` and `extend`. Define the full shape once and derive the rest:

```typescript
// derive.ts
import * as z from "zod";

const User = z.object({
  id: z.int().positive(),
  name: z.string().min(1),
  email: z.email(),
});

const NewUser = User.omit({ id: true });
const UserPatch = NewUser.partial();
const Admin = User.extend({ permissions: z.array(z.string()) });

type UserPatch = z.infer<typeof UserPatch>;
const patch: UserPatch = { name: "Dana" };
console.log(UserPatch.parse(patch), NewUser.safeParse({ name: "Avi" }).success);
console.log(Object.keys(Admin.shape));
```

```text
{ name: 'Dana' } false
[ 'id', 'name', 'email', 'permissions' ]
```

`NewUser` is the body of a "create" request, `UserPatch` of an "update", and `Admin` adds a field. Change `email` in `User`, and all three follow.

## Discriminated unions

[`z.discriminatedUnion`](https://zod.dev/api#discriminated-unions) takes the name of the discriminant and the options. It picks the option by that field, so an error is reported against the right member:

```typescript
// result.ts
import * as z from "zod";

const ApiResult = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), data: z.object({ id: z.number() }) }),
  z.object({ status: z.literal("error"), message: z.string() }),
]);
type ApiResult = z.infer<typeof ApiResult>;

function show(r: ApiResult) {
  return r.status === "ok" ? `id ${r.data.id}` : `failed: ${r.message}`;
}

console.log(show(ApiResult.parse({ status: "ok", data: { id: 7 } })));
const bad = ApiResult.safeParse({ status: "error" });
if (!bad.success) console.log(bad.error.issues[0].path, bad.error.issues[0].message);
```

```text
id 7
[ 'message' ] Invalid input: expected string, received undefined
```

The inferred type is the same [discriminated union](en/posts/typescript-discriminated-unions/) you'd write by hand, so `show` narrows on `status`.

## transform and refine

`transform` changes the value after it passes, so the input type and the output type differ. `refine` adds a check that a type can't express:

```typescript
// signup.ts
import * as z from "zod";

const Signup = z
  .object({
    birthday: z.iso.date().transform((s) => new Date(s)),
    password: z.string().min(8),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });

type SignupInput = z.input<typeof Signup>;
type Signup = z.output<typeof Signup>;

const form: SignupInput = { birthday: "1990-04-01", password: "s3cret-pass", confirm: "s3cret-pass" };
const ok: Signup = Signup.parse(form);
console.log(ok.birthday instanceof Date, ok.birthday.getFullYear());

const r = Signup.safeParse({ ...form, confirm: "other" });
if (!r.success) console.log(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
```

```text
true 1990
[ "confirm: Passwords don't match" ]
```

- `z.input` has `birthday: string`, what the form sends. `z.output` (the same as `z.infer`) has `birthday: Date`.
- `refine` runs on the whole object after its fields pass, and `path` attaches the error to `confirm`, where a form would show it.

## Unknown keys

By default, `z.object` accepts extra keys and removes them from the result. Two variants change that:

```typescript
// keys.ts
import * as z from "zod";

const input = { name: "Dana", isAdmin: true };

console.log(z.object({ name: z.string() }).parse(input));
console.log(z.looseObject({ name: z.string() }).parse(input));
const strict = z.strictObject({ name: z.string() }).safeParse(input);
console.log(strict.success || strict.error.issues[0].message);
```

```text
{ name: 'Dana' }
{ name: 'Dana', isAdmin: true }
Unrecognized key: "isAdmin"
```

The default is the safe one for incoming requests: a stray `isAdmin` never reaches your code. `z.strictObject` fits config files, where an unknown key is usually a typo.

## From errors to form messages

[`z.flattenError`](https://zod.dev/error-formatting) groups the issues by top-level field, the shape a form needs:

```typescript
// form-errors.ts
import * as z from "zod";

const Contact = z.object({ name: z.string().min(2), email: z.email() });
const r = Contact.safeParse({ name: "D", email: "dana" });
if (!r.success) console.log(z.flattenError(r.error).fieldErrors);
```

```text
{
  name: [ 'Too small: expected string to have >=2 characters' ],
  email: [ 'Invalid email address' ]
}
```

Each field gets a list of messages, ready to show next to its input. For nested objects, `z.treeifyError` keeps the nesting.

## When zod isn't worth it

- **Data that never crosses a boundary.** Values your own code created are already checked by `tsc`. Validate where data comes in: requests, responses, files, env vars, `localStorage`.
- **Bundle size in the browser.** For front-end code where size matters, zod ships `zod/mini`, a smaller API with the same checks. The docs compare the two.
- **A single field.** `Number(x)` plus `Number.isFinite` doesn't need a library.

## Mistakes beginners make

- **`z.infer` when you mean the input type.** With `transform` or `default`, they differ. Type form state with `z.input`.
- **`refine` on a field when the rule involves two fields.** It has to go on the object, with a `path`.
- **Using `strictObject` for API responses.** When the server adds a field, your app breaks. Keep the default for data you don't control.

## What's next

Next: why `any` doesn't belong in a public API, and what to use instead.
