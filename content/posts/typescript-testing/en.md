---
title: "Testing TypeScript with Vitest"
summary: "Run tests on .ts files with Vitest without a compile step, see why a test passes even when the types are wrong, and write tests for the types themselves with expectTypeOf and assertType."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 29 }
---

[Vitest](https://vitest.dev/guide/) runs TypeScript test files directly, without compiling them first. Like Node, it doesn't check types while running. For that it has a separate type-testing mode.

Every command ran with Vitest 5.0.5, TypeScript 6.0.3 and Node.js 24.21. The output is trimmed to the relevant lines.

## Installing

```bash
npm install --save-dev vitest
```

In `package.json`, add `"test": "vitest"` under `scripts`. `npx vitest` runs in watch mode and reruns on every save, and `npx vitest run` runs once, which is what you want in CI. Vitest 5 requires Node.js 22.12 or later. By default it looks for files with `.test.` or `.spec.` in their name.

## A first test

The function we'll test:

```typescript
// list.ts
export function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}
```

And the test, in `src/list.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { first } from "./list.ts";

describe("first", () => {
  it("returns the first item", () => {
    expect(first(["a", "b"])).toBe("a");
  });

  it("returns undefined for an empty list", () => {
    expect(first([])).toBeUndefined();
  });
});
```

```bash
npx vitest run --reporter=verbose
```

```text
 ✓ src/list.test.ts > first > returns the first item 1ms
 ✓ src/list.test.ts > first > returns undefined for an empty list 0ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
```

`describe` groups tests, `it` is one test, and `expect(...).toBe(...)` compares values. Everything is imported from `vitest` with its types, so the test file gets autocomplete too.

## Vitest doesn't check types

This test passes a string to a function that expects an array:

```typescript
import { expect, it } from "vitest";
import { first } from "./list.ts";

it("passes a string", () => {
  expect(first("abc")).toBe("a");
});
```

It passes, because `"abc"[0]` is `"a"` at runtime. Only `tsc` finds the problem:

```bash
npx tsc
```

```text
src/wrong.test.ts(5,16): error TS2345: Argument of type 'string' is not assignable to parameter of type 'readonly unknown[]'.
```

So in CI you run both `tsc` and `vitest run`. A green test doesn't mean the types are right.

## Testing types

In a library, the type a function returns is part of the API, and changing it breaks the people who use it. [Type tests](https://vitest.dev/guide/testing-types) catch a change like that. You write them in a file ending in `.test-d.ts`:

```typescript
import { assertType, expectTypeOf, test } from "vitest";
import { first } from "./list.ts";

test("first keeps the item type", () => {
  expectTypeOf(first(["a", "b"])).toEqualTypeOf<string | undefined>();

  // @ts-expect-error a string is not an array
  assertType(first("abc"));
});
```

- [`expectTypeOf`](https://vitest.dev/api/expect-typeof) checks a type: `toEqualTypeOf` requires the types to be exactly the same.
- [`assertType`](https://vitest.dev/api/assert-type) with `@ts-expect-error` checks that a wrong call really fails. If `first` one day accepts strings too, the comment is no longer needed and the test fails.

Vitest doesn't run these files: it passes them to `tsc --noEmit`, and only with `--typecheck`:

```bash
npx vitest run --typecheck
```

```text
Testing types with tsc and vue-tsc is an experimental feature.
Breaking changes might not follow SemVer, please pin Vitest's version when using it.

 Test Files  2 passed (2)
      Tests  3 passed (3)
Type Errors  no errors
```

The feature is marked experimental, so pin an exact Vitest version in `package.json`. Now say someone "simplified" `first` to `function first(items: readonly any[])`. The runtime tests still pass, and the type test fails:

```text
 FAIL  src/list.test-d.ts:4 > first keeps the item type
TypeCheckError: Type 'string | undefined' does not satisfy the constraint 'never'.
  Type 'undefined' is not assignable to type 'never'.
 ❯ src/list.test-d.ts:5:49
```

The message isn't clear at first glance. What matters is the location: the `toEqualTypeOf` line, meaning the type the function returns is no longer `string | undefined`. `first` now returns `any`.

## Mistakes beginners make

- **Running only Vitest in CI.** The tests pass even with type errors. Run `tsc` next to them.
- **Forgetting `--typecheck`.** Without the flag, `.test-d.ts` files aren't checked at all, and no warning appears.
- **A typo under `@ts-expect-error`.** A wrong variable name is an error too, so the comment "succeeds". [The docs](https://vitest.dev/guide/testing-types) recommend making sure the error is the one you expected.

## What's next

Next, the last post in the series: TypeScript 7 and the new compiler written in Go.
