---
title: "Never use any in a public API"
summary: "Why any in an exported signature switches off type checking for every caller, the JSON.parse any that strict mode doesn't catch, and what to export instead: unknown, generics or the real type."
date: 2026-10-29
tags: [typescript]
series: { key: typescript, order: 30 }
---

The [any and unknown post](en/posts/typescript-any-unknown-never/) showed that `any` turns off checking for one value. In a public API (anything exported from a module, a library or a shared package) it turns it off for every caller, in code you'll never see.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## any spreads

A function that returns `any` hands the caller a value with no type, and everything computed from it has no type either:

```typescript
// spread.ts
function loadConfig(text: string): any {
  return JSON.parse(text);
}

const config = loadConfig('{"port":3000}');
const port = config.prot;
const next = port + 1;
const url: string = `http://localhost:${next}`;
console.log(url);
```

```text
http://localhost:NaN
```

`config.prot` is a typo, `port` is `any`, `next` is `any`, and `tsc` reports nothing. The bug surfaces three lines later as `NaN` in a URL. The caller did nothing wrong: they trusted the signature.

## unknown makes the caller check

Return `unknown` when the shape really isn't known. The caller has to narrow it before use, and the typo can't happen:

```typescript
// unknown.ts
function loadConfig(text: string): unknown {
  return JSON.parse(text);
}

const config = loadConfig('{"port":3000}');
console.log(config.port);

if (typeof config === "object" && config !== null && "port" in config && typeof config.port === "number") {
  console.log(config.port + 1);
}
```

```text
unknown.ts(7,13): error TS18046: 'config' is of type 'unknown'.
3000
3001
```

Better still, when the module knows the shape, check it once inside and export the real type. The [zod post](en/posts/typescript-zod/) shows how: the caller gets a typed value, and the check lives where the data comes in.

## Strict mode doesn't catch it

`noImplicitAny`, part of `strict`, only reports `any` that TypeScript had to guess, such as a parameter with no type. An `any` that comes from a library type is not implicit. `JSON.parse` is declared as returning `any`, so a function that returns its result exports `any` with no error:

```typescript
// config.ts
export function loadConfig(text: string) {
  return JSON.parse(text);
}

export function onMessage(handler: (data: any) => void) {
  handler({ text: "hi" });
}

onMessage((data) => console.log(data.txet));
```

```text
undefined
```

```bash
tsc --strict --declaration --emitDeclarationOnly --outDir out config.ts
cat out/config.d.ts
```

```text
export declare function loadConfig(text: string): any;
export declare function onMessage(handler: (data: any) => void): void;
```

The `.d.ts` file is what users of a package see. Generating it and searching for `any` is a quick audit of a public API. The second function shows the other form: `any` in a callback's parameter types every caller's handler, so `data.txet` passes.

## What to export instead

- **The real type**, when you know it. Annotate the return type of exported functions, so an `any` from inside can't leak out unnoticed.
- **`unknown`**, when you don't know it and the caller should check.
- **A generic**, when the type depends on the caller. `onMessage<T>(handler: (data: T) => void)` is only honest if something checks `T`. Otherwise it's a [cast in disguise](en/posts/typescript-generics-beyond/).
- **`Record<string, unknown>`** instead of `Record<string, any>` for a bag of options you pass through untouched.

## Where any is fine

`any` isn't banned everywhere. TypeScript's own `ReturnType` is declared in `lib.es5.d.ts` as `ReturnType<T extends (...args: any) => any>`. There it's a constraint meaning "any function at all", and no value of type `any` ever reaches a caller. The same goes for a local `any` inside a function body whose exported signature is fully typed. The rule is about the boundary: no `any` crosses it.

## Enforcing it

`tsc` has no option that bans explicit `any`. A linter does: [typescript-eslint](https://typescript-eslint.io/rules/no-explicit-any/) has `no-explicit-any`, and its `no-unsafe-*` rules (such as [`no-unsafe-return`](https://typescript-eslint.io/rules/no-unsafe-return/)) report an `any` that flows out of a function, including the `JSON.parse` case above. Those need type information, so they run with typed linting enabled.

## Mistakes beginners make

- **No return type on exported functions.** The inferred type can be `any` without a warning. Write it out.
- **`as any` to silence an error in a public type.** The error goes away for you and comes back as a runtime bug for the caller.
- **Typing callback data as `any` "for flexibility".** Use `unknown`, or a type parameter the caller sets.

## What's next

Next: `.d.ts` declaration files.
