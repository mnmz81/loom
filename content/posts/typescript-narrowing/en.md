---
title: "Narrowing in TypeScript: typeof, in, instanceof and discriminated unions"
summary: "How TypeScript narrows a union from the checks in your code: typeof, equality, in and instanceof. Discriminated unions, and how never makes sure you didn't forget a case in a switch."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 10 }
---

When a value has a union type, TypeScript follows the checks in your code and narrows the type in each branch. This is called narrowing, and it's why you can work with unions without casts.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## typeof and equality

```typescript
// describe.ts
function describe(value: string | number | string[] | null) {
  if (value === null) return "nothing";
  if (typeof value === "string") return value.toUpperCase();
  if (typeof value === "number") return value.toFixed(1);
  return value.join(", ");
}

console.log(describe("hi"), describe(2), describe(["a", "b"]), describe(null));
```

```text
HI 2.0 a, b nothing
```

After `value === null` with a `return`, `null` drops out of the type. Each `typeof` removes another member, and on the last line only `string[]` is left, so `join` is allowed. `typeof null` is `"object"`, which is why `null` is checked with a direct comparison.

## in and instanceof

```typescript
// move.ts
type Fish = { swim(): string };
type Bird = { fly(): string };

function move(animal: Fish | Bird) {
  if ("swim" in animal) return animal.swim();
  return animal.fly();
}

function year(value: Date | string) {
  return value instanceof Date ? value.getFullYear() : Number(value.slice(0, 4));
}

console.log(move({ fly: () => "flying" }), year(new Date(2026, 0, 1)), year("2025-12-31"));
```

```text
flying 2026 2025
```

- `"swim" in animal` narrows to the types that have `swim`.
- `instanceof Date` narrows to a class. It works only with classes, not with a `type` or `interface`, because those don't exist at runtime.

## Discriminated unions and exhaustiveness

The most common pattern: every member of the union has a shared property with a different literal value, and a `switch` on that property narrows to the matching member.

```typescript
// area.ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.size ** 2;
    default: {
      const unhandled: never = shape;
      throw new Error(`unknown shape: ${JSON.stringify(unhandled)}`);
    }
  }
}

console.log(area({ kind: "square", size: 3 }));
```

```text
area.ts(14,13): error TS2322: Type '{ kind: "triangle"; base: number; height: number; }' is not assignable to type 'never'.
9
```

Inside `case "circle"`, `shape` is only the circle, so `shape.radius` is allowed. In `default` only `never` should be left, meaning no case at all. We forgot the triangle, so a type is left over and the assignment to `never` fails. When you add a new member to `Shape`, `tsc` shows every `switch` that doesn't handle it.

## Mistakes beginners make

- **`typeof value === "object"` to detect an object.** `null` and arrays pass too. Add `value !== null` or `Array.isArray`.
- **`instanceof` on an `interface`.** It doesn't exist at runtime. Use `in` or a discriminant property.
- **A `default` that returns some value instead of `never`.** That way a new case is swallowed silently.

## What's next

Next: `null`, `undefined`, `?.`, `??` and `!`.
