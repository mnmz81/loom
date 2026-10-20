---
title: "null and undefined in TypeScript: strictNullChecks, ?., ?? and !"
summary: "How strictNullChecks makes you handle null and undefined, the difference between ?? and ||, why find and Map.get return undefined, and when ! moves the crash to runtime."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 11 }
---

JavaScript has two values that mean "nothing here": `null` and `undefined`. Reading a property of either one throws a `TypeError` at runtime. In TypeScript they are separate types, and `tsc` makes you handle them before use.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## strictNullChecks

```typescript
// city.ts
type User = { name: string; address?: { city: string } };

function city(user: User) {
  return user.address.city;
}

console.log(city({ name: "Dana" }));
```

```text
city.ts(5,10): error TS18048: 'user.address' is possibly 'undefined'.
TypeError: Cannot read properties of undefined (reading 'city')
```

An optional property (`address?`) is really `{ city: string } | undefined`. Thanks to [`strictNullChecks`](https://www.typescriptlang.org/tsconfig/#strictNullChecks), which is part of `strict`, `undefined` stays in the type until you check for it, and `tsc` flags the line that crashes. The fix is a check (`if (user.address)`) or `?.` from the next section.

### In older versions

Until TypeScript 6.0 the default for `strict` was `false`. In a project that didn't write `"strict": true` in `tsconfig.json`, `null` and `undefined` were part of every type, and `user.address.city` passed `tsc` with no error at all. Since [6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) `strict` is on by default.

## ?. and ??

```typescript
// settings.ts
type Settings = { volume?: number; theme?: { color: string } };

const settings: Settings = { volume: 0 };

console.log(settings.theme?.color);
console.log(settings.volume || 50);
console.log(settings.volume ?? 50);
```

```text
undefined
50
0
```

- [`?.`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining) stops and returns `undefined` if what's on its left is `null` or `undefined`, instead of throwing. The type of `settings.theme?.color` is `string | undefined`.
- `||` replaces any falsy value, so `0` became 50.
- [`??`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing) replaces only `null` and `undefined`, and `0` stays. For a default value it's almost always the right choice.

## find, Map.get and the ! operator

```typescript
// lookup.ts
const ids = [3, 7, 9];
const prices = new Map([["apple", 5]]);

const found = ids.find((id) => id > 5);
console.log(found.toFixed());

const price = prices.get("pear")!;
console.log(price.toFixed(2));
```

```text
lookup.ts(6,13): error TS18048: 'found' is possibly 'undefined'.
7
TypeError: Cannot read properties of undefined (reading 'toFixed')
```

`find` returns `T | undefined`, because maybe no element matches. `Map.get` returns `number | undefined` too. For `found`, `tsc` reported an error, and the code actually worked because 7 was found.

The `!` after `prices.get("pear")` is a [non-null assertion](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#non-null-assertion-operator-postfix-): it tells TypeScript "this value is not `null` or `undefined`" and removes `undefined` from the type. At runtime it checks nothing, so `tsc` stayed silent and the code crashed. Instead of `!`, write a check, or a default: `prices.get("pear") ?? 0`.

## Mistakes beginners make

- **`!` to make the error go away.** The error moves to runtime. Use it only when you know something TypeScript can't.
- **`||` for a default value.** `0`, `""` and `false` get replaced too. Use `??`.
- **`if (count)` to check for `undefined`.** `0` fails the check too. Write `count !== undefined`.

## What's next

Next: enums, and what to use instead.
