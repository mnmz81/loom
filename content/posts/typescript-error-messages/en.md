---
title: "How to read tsc error messages"
summary: "What each part of a tsc error says: file, line and column, code, message and the indented explanation lines. Plus the common codes: TS2322, TS2345, TS2339, TS7006, TS18048, TS2554 and TS2769."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 27 }
---

Every `tsc` error has the same structure. If you know how to take it apart, you get to the cause faster, even when the message is long and full of types.

Every example was checked with TypeScript 6.0.3 and 7.0.2.

## The parts of an error

```typescript
// config.ts
type Config = { server: { host: string; port: number } };

const fromFile = { server: { host: "localhost", port: "8080" } };
const config: Config = fromFile;
```

```text
config.ts(5,7): error TS2322: Type '{ server: { host: string; port: string; }; }' is not assignable to type 'Config'.
  The types of 'server.port' are incompatible between these types.
    Type 'string' is not assignable to type 'number'.
```

From left to right:

- `config.ts(5,7)`: the file, line and column. Here it's `config` on line 5, the variable that got an unsuitable value.
- `TS2322`: the error code. The same code always describes the same problem, so search for it rather than for the message with your types in it.
- The message: what failed, in one line.
- The indented lines: [each line answers "why?"](https://www.typescriptlang.org/docs/handbook/2/understanding-errors.html) about the line above it. The deepest line is usually the cause itself: `port` is a string, not a number.

In a terminal, `tsc` prints a colored format by default (the [`pretty`](https://www.typescriptlang.org/tsconfig/pretty.html) option), with the line of code and a mark under the error:

```text
config.ts:5:7 - error TS2322: Type '{ server: { host: string; port: string; }; }' is not assignable to type 'Config'.
  The types of 'server.port' are incompatible between these types.
    Type 'string' is not assignable to type 'number'.

5 const config: Config = fromFile;
        ~~~~~~


Found 1 error in config.ts:5
```

When the output doesn't go to a terminal (a pipe or a file, for example), or with `--pretty false`, each error is printed in the short format above.

## The common codes

```typescript
// common.ts
type User = { name: string; address?: { city: string } };

function greet(user: User) {
  return `Hi ${user.nmae}`;
}

function cityOf(user: User) {
  return user.address.city;
}

function log(message) {
  console.log(message);
}

const age: number = "30";
greet("Dana");
greet({ name: "Dana" }, true);
```

```text
common.ts(5,21): error TS2339: Property 'nmae' does not exist on type 'User'.
common.ts(9,10): error TS18048: 'user.address' is possibly 'undefined'.
common.ts(12,14): error TS7006: Parameter 'message' implicitly has an 'any' type.
common.ts(16,7): error TS2322: Type 'string' is not assignable to type 'number'.
common.ts(17,7): error TS2345: Argument of type 'string' is not assignable to parameter of type 'User'.
common.ts(18,25): error TS2554: Expected 1 arguments, but got 2.
```

| Code | What it says | What to check first | Explained in |
|---|---|---|---|
| TS2322 | A value doesn't fit the variable's type | The declared type, and the deepest explanation line | [Basic types](en/posts/typescript-basic-types/) |
| TS2345 | An argument doesn't fit the parameter | The function's signature | [Setup](en/posts/typescript-setup/) |
| TS2339 | The type has no such property | A typo, or a union that needs narrowing | [Unions](en/posts/typescript-unions-literals/) |
| TS7006 | A parameter without a type became `any` | Add a type to the parameter | [tsconfig](en/posts/typescript-tsconfig/) |
| TS18048 | The value might be `undefined` | A check before using it, or `?.` | [null and undefined](en/posts/typescript-null-undefined/) |
| TS2554 | Wrong number of arguments | How many parameters the function takes | [Functions](en/posts/typescript-functions/) |

## TS2769 and TypeScript 7

When a function has several [signatures (overloads)](en/posts/typescript-functions/) and none of them fits, you get TS2769. This is the classic mistake when you want indented JSON:

```typescript
// stringify.ts
const data = { id: 1, tags: ["a"] };
console.log(JSON.stringify(data, 2));
```

```text
stringify.ts(3,34): error TS2769: No overload matches this call.
  Overload 1 of 2, '(value: any, replacer?: ((this: any, key: string, value: any) => any) | undefined, space?: string | number | undefined): string', gave the following error.
    Argument of type 'number' is not assignable to parameter of type '(this: any, key: string, value: any) => any'.
  Overload 2 of 2, '(value: any, replacer?: (string | number)[] | null | undefined, space?: string | number | undefined): string', gave the following error.
    Argument of type 'number' is not assignable to parameter of type '(string | number)[]'.
{"id":1,"tags":["a"]}
```

TypeScript 6.0 spells out what went wrong in each signature. Both say the second argument is `replacer`, so `2` has to move to third place: `JSON.stringify(data, null, 2)`. TypeScript 7.0.2 prints only the last signature for the same code:

```text
stringify.ts(3,34): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Argument of type 'number' is not assignable to parameter of type '(string | number)[]'.
```

When the last signature isn't the one you meant, open the definition (F12 in VS Code) and look at all the signatures.

## Mistakes beginners make

- **Fixing the spot where the error was reported.** `tsc` marks the place where the types met, not always where the mistake is. In `config.ts` the mistake is in `fromFile`.
- **Silencing it with `any`.** `const fromFile: any` makes the error go away, but `port` is still a string at runtime.
- **Reading only the first line.** In a long error the cause is in the last indented line.

## What's next

Next: a TypeScript monorepo, with project references and `tsc --build`.
