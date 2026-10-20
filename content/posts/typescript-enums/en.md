---
title: "Enums in TypeScript, and what to use instead"
summary: "Numeric and string enums, the JavaScript tsc emits for them and reverse mapping. The alternatives: a union of literals and an as const object, which run in Node without tsx."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 12 }
---

An `enum` gives names to a set of constants. Unlike most TypeScript syntax, it isn't erased at compile time but becomes a JavaScript object, which is why Node doesn't run it without tsx and `erasableSyntaxOnly` reports it as an error ([in the setup post](en/posts/typescript-setup/)).

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24. Examples with `enum` ran with tsx.

## Numeric enums

```typescript
// direction.ts (run with tsx)
enum Direction {
  Up,
  Down,
}

const next: Direction = 5;
console.log(Direction.Down, Direction[0], next, Object.values(Direction));
```

```text
direction.ts(7,7): error TS2322: Type '5' is not assignable to type 'Direction'.
1 Up 5 [ 'Up', 'Down', 0, 1 ]
```

Without explicit values, members are numbered from 0 up. `tsc` rejects a number that isn't one of the values, but at runtime the assignment went through. This is the JavaScript `tsc` emits for the `enum`:

```javascript
// direction.js (tsc output)
var Direction;
(function (Direction) {
    Direction[Direction["Up"] = 0] = "Up";
    Direction[Direction["Down"] = 1] = "Down";
})(Direction || (Direction = {}));
```

Every member is written twice: from name to number and from number to name. That's a [reverse mapping](https://www.typescriptlang.org/docs/handbook/enums.html#reverse-mappings), and it's why `Direction[0]` returns `"Up"` and `Object.values` returns both names and numbers.

## String enums

```typescript
// color.ts (run with tsx)
enum Color {
  Red = "RED",
  Green = "GREEN",
}

const fromApi: Color = "RED";
console.log(Color.Red, Object.keys(Color));
```

```text
color.ts(7,7): error TS2322: Type '"RED"' is not assignable to type 'Color'.
RED [ 'Red', 'Green' ]
```

String members get no reverse mapping. A string enum also doesn't accept the string itself, even when it's identical to the value: only `Color.Red` is allowed. When the value comes from JSON or an API, you have to convert it.

## The alternatives: a union and an as const object

When you only need a list of allowed values, a union of literals is enough: `type Status = "active" | "blocked"` ([in the unions post](en/posts/typescript-unions-literals/)). When you also want an object with names, like an `enum`, use an [`as const`](https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums) object:

```typescript
// status.ts
const Status = {
  Active: "active",
  Blocked: "blocked",
} as const;

type Status = (typeof Status)[keyof typeof Status];

function label(value: Status) {
  return value.toUpperCase();
}

console.log(label(Status.Active), label("blocked"));
label("deleted");
```

```text
status.ts(14,7): error TS2345: Argument of type '"deleted"' is not assignable to parameter of type 'Status'.
ACTIVE BLOCKED
```

`as const` turns the values into fixed literals, and the `type Status` line extracts the union `"active" | "blocked"` from them ([`keyof` and `typeof` have their own post](en/posts/typescript-keyof-typeof/)). The object and the type can share a name, because one is a value and the other is a type. Unlike an `enum`, the plain string is accepted too, and it's ordinary JavaScript, so Node runs it directly.

## const enum

A `const enum` is erased completely at compile time, and `tsc` writes the value itself wherever it's used ([per the handbook](https://www.typescriptlang.org/docs/handbook/enums.html#const-enums)). It's still syntax that needs transforming: it doesn't run in Node without tsx either, and it fails `erasableSyntaxOnly`.

## Mistakes beginners make

- **Passing a string from an API straight into a string enum.** `tsc` rejects it, and `as Color` only silences the check. Check that the value really is one of the members.
- **`Object.values` on a numeric enum.** You get the names too, because of the reverse mapping.
- **Adding a member in the middle of a numeric enum without explicit values.** Every member after it shifts by one, and values stored in a database no longer match.

## What's next

Next: classes, `private` vs `#private`, `abstract` and parameter properties.
