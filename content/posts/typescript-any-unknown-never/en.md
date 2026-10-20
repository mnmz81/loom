---
title: "any, unknown, never and void in TypeScript"
summary: "any turns checking off, unknown makes you check before use, void is a function with no useful return value, and never is a value that can't exist. When to use each."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 5 }
---

These four types don't describe a string or a number but edge cases: a value you don't know, a function that returns nothing, and code that should never be reached.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## any: no checking

```typescript
// any.ts
const data: any = JSON.parse('{"name":"Dana"}');
console.log(data.nmae.toUpperCase());
```

```text
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

`tsc` reported no error. `any` means "don't check": every property, call and assignment is allowed, and every value computed from it is `any` too. `JSON.parse` returns `any`, which is why this problem is so common with data from outside.

## unknown: check before you use it

```typescript
// unknown.ts
const data: unknown = JSON.parse('{"name":"Dana"}');
console.log(data.name);

if (typeof data === "object" && data !== null && "name" in data) {
  console.log(data.name);
}
```

```text
unknown.ts(3,13): error TS18046: 'data' is of type 'unknown'.
Dana
Dana
```

`unknown` also accepts any value, but you can't do anything with it until you check what it is. After the three checks in the `if`, TypeScript knows `data` is an object with a `name`. This is called narrowing, and it has its own post. When you don't know the type, `unknown` is the right choice, not `any`.

## void and never

```typescript
// never.ts
function log(message: string): void {
  console.log(message);
}

function fail(message: string): never {
  throw new Error(message);
}

log("start");
const port: number = Number("abc") || fail("bad port");
```

```text
start
Error: bad port
```

- `void`: the function returns no useful value. It's the return type inferred for a function with no `return`.
- `never`: the function never finishes normally, because it throws or runs forever. `Number("abc")` is `NaN`, so `fail` is called. Since `never` adds nothing to an expression's type, `port` stays a `number`.

`never` also shows up when checks cover every possibility, and then it's used to make sure no case was forgotten (in the narrowing post).

## catch gets unknown

```typescript
// catch.ts
try {
  JSON.parse("{");
} catch (err) {
  console.log(err.message);
  if (err instanceof Error) {
    console.log(err.message);
  }
}
```

```text
catch.ts(5,15): error TS18046: 'err' is of type 'unknown'.
Expected property name or '}' in JSON at position 1 (line 1 column 2)
Expected property name or '}' in JSON at position 1 (line 1 column 2)
```

In JavaScript you can throw any value, not only an `Error`, so the `catch` variable is `unknown`. `instanceof Error` narrows it to `Error`.

### In older versions

The `catch` variable was `any` until TypeScript 4.4 added `useUnknownInCatchVariables`, which is part of `strict`. In projects without `strict`, and in any project before 6.0 that didn't turn it on, `err.message` still passes with no error.

## Mistakes beginners make

- **`any` to make the error go away.** The error moves to runtime. `unknown` plus a check is the fix.
- **Assuming the result of `JSON.parse` or `fetch` has the type you wrote.** It's `any`, and nothing checks it.
- **Mixing up `void` and `undefined`.** `void` means "don't use the returned value", not "returns exactly `undefined`".

## What's next

Next: functions, optional parameters, function types and overloads.
