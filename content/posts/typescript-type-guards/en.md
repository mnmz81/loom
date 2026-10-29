---
title: "Type guards in TypeScript: working with data you don't control"
summary: "Building guards for API data from small reusable pieces, the guard that lies and compiles, inferred type predicates in filter, and handling a variant the server added after you shipped."
date: 2026-10-29
tags: [typescript]
series: { key: typescript, order: 28 }
---

The [runtime validation post](en/posts/typescript-runtime-validation/) wrote one guard by hand, and the [assertions post](en/posts/typescript-assertions-satisfies/) showed `value is T` and `asserts`. This post is about guards for real API data: nested, partly optional, and liable to change without telling you.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24, against the handbook's [type predicates](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates) section.

## Build from small guards

Writing `typeof value === "object" && value !== null && ...` for every field doesn't scale. A few small guards compose into big ones:

```typescript
// guards.ts
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isArrayOf =
  <T>(item: (v: unknown) => v is T) =>
  (v: unknown): v is T[] =>
    Array.isArray(v) && v.every(item);

type Item = { sku: string; qty: number };
type Order = { id: number; items: Item[]; note?: string };

const isItem = (v: unknown): v is Item => isRecord(v) && isString(v.sku) && isNumber(v.qty);
const isOrder = (v: unknown): v is Order =>
  isRecord(v) &&
  isNumber(v.id) &&
  isArrayOf(isItem)(v.items) &&
  (v.note === undefined || isString(v.note));

const ok: unknown = JSON.parse('{"id":7,"items":[{"sku":"pen","qty":3}]}');
const bad: unknown = JSON.parse('{"id":8,"items":[{"sku":"pen","qty":"3"}]}');
console.log(isOrder(ok), isOrder(bad));
if (isOrder(ok)) console.log(ok.items[0].qty * 2);
```

```text
true false
6
```

- `isRecord` turns `unknown` into an object whose fields are `unknown`, so `v.sku` can be read and then checked.
- `isNumber` also rejects `NaN` and `Infinity`, which pass `typeof` and usually come from a failed `Number()` conversion.
- `isArrayOf(isItem)` builds a guard from a guard. The same pieces cover every type in the API.
- An optional field is checked as "missing, or the right type".

## The guard that lies

TypeScript checks that a guard returns a `boolean`. It doesn't check that the boolean proves the type:

```typescript
// lying.ts
type User = { name: string; email: string };

function isUser(v: unknown): v is User {
  return typeof v === "object" && v !== null && "name" in v;
}

const data: unknown = { name: "Dana" };
if (isUser(data)) console.log(data.email.toLowerCase());
```

```text
TypeError: Cannot read properties of undefined (reading 'toLowerCase')
```

`email` was added to `User` after `isUser` was written, and nothing failed until runtime. A guard is an `as` with a function around it. Keep each guard next to its type, and give it a test with a bad value for every field. Or let a [schema](en/posts/typescript-zod/) generate the type and the check together, so they can't drift apart.

## Inferred type predicates

Since [TypeScript 5.5](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#inferred-type-predicates), a function with no annotation can still be a guard, when TypeScript can prove the predicate from its body. It matters most in `filter`:

```typescript
// filter.ts
const raw: (number | undefined)[] = [3, undefined, 0, 7];

const defined = raw.filter((n) => n !== undefined);
const truthy = raw.filter(Boolean);

console.log(defined.map((n) => n.toFixed(1)));
console.log(truthy.map((n) => n.toFixed(1)));
```

```text
filter.ts(8,31): error TS18048: 'n' is possibly 'undefined'.
[ '3.0', '0.0', '7.0' ]
[ '3.0', '7.0' ]
```

- `n !== undefined` is inferred as `n is number`, so `defined` is `number[]`.
- `filter(Boolean)` isn't: `Boolean` is not a guard, and the result stays `(number | undefined)[]`. It also dropped `0`, a real value. Write the comparison you mean.

The inference has a condition: "true" must mean the type, and "false" must mean not the type. `(n) => !!n` isn't inferred, because `false` doesn't prove `n` is `undefined`; it could be `0`.

## A variant the server added after you shipped

An [exhaustive `switch`](en/posts/typescript-narrowing/) proves you handled every variant you know about. A server can still send one you don't. For data from outside, give unknown variants their own member instead of a crash:

```typescript
// events.ts
type Known = { kind: "click"; x: number } | { kind: "view"; page: string };
type AppEvent = Known | { kind: "unknown"; raw: unknown };

function toEvent(v: unknown): AppEvent {
  if (typeof v === "object" && v !== null && "kind" in v) {
    if (v.kind === "click" && "x" in v && typeof v.x === "number") return { kind: "click", x: v.x };
    if (v.kind === "view" && "page" in v && typeof v.page === "string") return { kind: "view", page: v.page };
  }
  return { kind: "unknown", raw: v };
}

const incoming: unknown[] = JSON.parse('[{"kind":"click","x":4},{"kind":"scroll","y":90}]');
for (const e of incoming.map(toEvent)) {
  if (e.kind === "unknown") console.log("skipped:", JSON.stringify(e.raw));
  else console.log(e.kind);
}
```

```text
click
skipped: {"kind":"scroll","y":90}
```

The rest of the code still gets an exhaustive union, and `"unknown"` is one more case it must handle: log it, skip it, or show a fallback. `toEvent` also copies only the fields it checked, so nothing unchecked rides along.

## Mistakes beginners make

- **Checking `typeof v === "object"` and stopping.** `null` and arrays pass. Use one `isRecord` everywhere.
- **Updating a type and not its guard.** Nothing warns you. Test the guard with a broken value per field.
- **`filter(Boolean)` to remove `undefined`.** It removes `0` and `""` too, and doesn't narrow. Compare with `!== undefined`.

## What's next

Next: zod in depth: composing schemas, transforms, unknown keys and error reports.
