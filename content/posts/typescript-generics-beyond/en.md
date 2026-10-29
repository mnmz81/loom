---
title: "Generics in TypeScript beyond the textbook definition"
summary: "A type parameter links types: when it earns its place, constraining the element not the container, the generic that's a cast in disguise, const type parameters and a typed event map."
date: 2026-10-29
tags: [typescript]
series: { key: typescript, order: 23 }
---

The textbook definition is "a type parameter, like a function parameter but for types". The [generics post](en/posts/typescript-generics/) covered that. The more useful definition: a generic links the types of two or more places, usually an input and an output. If there's nothing to link, there's no need for a generic.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24, against the handbook's [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) and [guidelines for good generic functions](https://www.typescriptlang.org/docs/handbook/2/functions.html#guidelines-for-writing-good-generic-functions).

## A type parameter should appear twice

The handbook's rule: "If a type parameter only appears in one location, strongly reconsider if you actually need it."

```typescript
// twice.ts
function logAll<T>(items: T[]): void {
  items.forEach((item) => console.log(item));
}

function logAllPlain(items: unknown[]): void {
  items.forEach((item) => console.log(item));
}

function last<T>(items: T[]): T | undefined {
  return items[items.length - 1];
}

logAll([1, 2]);
logAllPlain(["a"]);
const n = last([1, 2, 3]);
console.log(n?.toFixed(1));
```

```text
1
2
a
3.0
```

`T` in `logAll` appears once, so it connects nothing. `unknown[]` does the same job and reads simpler. In `last`, `T` appears in the parameter and in the return type: that link is why `n` is a `number` and `toFixed` is allowed.

## Constrain the element, not the container

```typescript
// push-down.ts
function firstGood<T>(items: T[]): T | undefined {
  return items[0];
}

function firstBad<A extends unknown[]>(items: A) {
  return items[0];
}

const a = firstGood([10, 20]);
const b = firstBad([10, 20]);
console.log(a?.toFixed(1), b);
b.toFixed(1);
```

```text
push-down.ts(13,1): error TS18046: 'b' is of type 'unknown'.
10.0 10
```

`firstBad` takes the whole array as its type parameter, so the element type comes from the constraint: `unknown`. The handbook calls the fix "push type parameters down": make the parameter the thing you return, here the element.

## The generic that's a cast in disguise

A type parameter that appears only in the return type isn't inferred from anything. The caller picks it, and nothing checks the choice:

```typescript
// parse.ts
type User = { name: string };

function parseJson<T>(text: string): T {
  return JSON.parse(text);
}

const user = parseJson<User>('{"nmae":"Dana"}');
console.log(user.name.toUpperCase());
```

```text
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

`parseJson<User>(...)` looks safer than `JSON.parse(...) as User`, but it's the same cast. The honest version takes a check, so `T` is inferred from something that runs:

```typescript
// parse-checked.ts
type User = { name: string };

function parseJson<T>(text: string, isT: (value: unknown) => value is T): T {
  const value: unknown = JSON.parse(text);
  if (!isT(value)) throw new Error("unexpected JSON shape");
  return value;
}

const isUser = (v: unknown): v is User =>
  typeof v === "object" && v !== null && "name" in v && typeof v.name === "string";

console.log(parseJson('{"name":"Dana"}', isUser).name);
parseJson('{"nmae":"Dana"}', isUser);
```

```text
Dana
Error: unexpected JSON shape
```

Now `T` appears twice, in the guard and in the result, and the guard has to pass at runtime. The [type guards post](en/posts/typescript-type-guards/) builds such guards, and [zod](en/posts/typescript-zod/) generates them.

## const type parameters

By default, an array literal passed to a generic is inferred as `string[]`. Since TypeScript 5.0, [`const` on the type parameter](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#const-type-parameters) infers it as if the caller had written `as const`:

```typescript
// const-param.ts
function routesLoose<T extends readonly string[]>(paths: T) {
  return paths;
}
function routes<const T extends readonly string[]>(paths: T) {
  return paths;
}

const loose = routesLoose(["/", "/posts"]);
const exact = routes(["/", "/posts"]);
type Path = (typeof exact)[number];
const home: Path = "/";
const typo: Path = "/post";
console.log(loose, exact);
```

```text
const-param.ts(13,7): error TS2820: Type '"/post"' is not assignable to type '"/" | "/posts"'. Did you mean '"/posts"'?
[ '/', '/posts' ] [ '/', '/posts' ]
```

`loose` is `string[]`. `exact` is `readonly ["/", "/posts"]`, so `Path` is a union of the two strings and the typo is caught. The `readonly` in the constraint matters: without it, `const` falls back to `string[]`.

## A typed event map

Generics pay off most in APIs where one type parameter ties several methods together:

```typescript
// events.ts
function createBus<Events extends Record<string, unknown>>() {
  const handlers: { [K in keyof Events]?: ((payload: Events[K]) => void)[] } = {};
  return {
    on<K extends keyof Events>(name: K, handler: (payload: Events[K]) => void) {
      (handlers[name] ??= []).push(handler);
    },
    emit<K extends keyof Events>(name: K, payload: Events[K]) {
      handlers[name]?.forEach((h) => h(payload));
    },
  };
}

const bus = createBus<{ login: { user: string }; logout: undefined }>();
bus.on("login", (p) => console.log("hello", p.user));
bus.emit("login", { user: "Dana" });
bus.emit("login", { name: "Dana" });
bus.emit("signup", undefined);
```

```text
events.ts(17,21): error TS2353: Object literal may only specify known properties, and 'name' does not exist in type '{ user: string; }'.
events.ts(18,10): error TS2345: Argument of type '"signup"' is not assignable to parameter of type '"login" | "logout"'.
hello Dana
```

`Events` is written once, at `createBus`. After that, every `on` and `emit` checks the event name and its payload, and `p` in the handler is typed without an annotation. This is the pattern behind typed emitters, stores and router params.

## Mistakes beginners make

- **A type parameter used once.** Replace it with `unknown` or the constraint itself.
- **A type parameter only in the return type.** It's a cast. Take a value that proves the type, or return `unknown`.
- **Explicit type arguments everywhere.** If you keep writing `fn<User>(...)`, the generic probably isn't inferring from anything.

## What's next

Next: conditional types and `infer`.
