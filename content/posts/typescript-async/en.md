---
title: "Async code in TypeScript: Promise, async/await and fetch"
summary: "Promise<T> and the return type of an async function, await and Awaited, how Promise.all returns a typed tuple, why response.json() returns any, and why err in catch is unknown."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 23 }
---

An `async` function always returns a Promise, and TypeScript tracks what's inside it: `Promise<string>` is a promise of a string. The types of `await`, `Promise.all` and errors all follow from that.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24. The examples don't touch the network: waiting is `setTimeout`, and fetch reads a `data:` URL, which Node.js 24's fetch supports.

## Promise<T> and async functions

```typescript
// delay.ts
function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function greet(who: string): Promise<string> {
  const word = await delay(10, "hello");
  return `${word}, ${who}`;
}

async function wrong(): string {
  return "x";
}

greet("Dana").then(console.log);
```

```text
delay.ts(11,25): error TS1064: The return type of an async function or method must be the global Promise<T> type. Did you mean to write 'Promise<string>'?
hello, Dana
```

`delay` returns `Promise<T>`, and `await` on it gives `T`, here `string`. In an `async` function you return the value itself (a `return` of a string), but the return type you write is `Promise<string>`, because that's what the caller gets. Writing `string` is an error, and TypeScript suggests the fix.

## await, Awaited and Promise.all

```typescript
// all.ts
const delay = <T>(ms: number, value: T) => new Promise<T>((resolve) => setTimeout(resolve, ms, value));

async function loadPage() {
  const [user, count] = await Promise.all([delay(20, { id: 7 }), delay(10, 42)]);
  return `${user.id} has ${count.toFixed(1)}`;
}

type Page = Awaited<ReturnType<typeof loadPage>>;
const page: Page = 5;

loadPage().then(console.log);
```

```text
all.ts(10,7): error TS2322: Type 'number' is not assignable to type 'string'.
7 has 42.0
```

`Promise.all` takes an array of Promises and returns a Promise of a tuple, and each element keeps its own type: `user` is `{ id: number }` and `count` is `number`. The signature in `lib.es2015.promise.d.ts` is a [mapped type](en/posts/typescript-mapped-types/) over the tuple with `Awaited` on each element. `Awaited<T>` is the type you get from `await` on `T`, so `Awaited<ReturnType<typeof loadPage>>` is `string`.

## fetch: response.json() returns any

In the browser lib (`lib.dom.d.ts`), `json()` is declared as `Promise<any>`. TypeScript can't know what the server will send, so it accepts any assignment:

```typescript
// fetch-json.ts
type Todo = { id: number; title: string };

async function loadTodo(url: string): Promise<Todo> {
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

const good = "data:application/json," + encodeURIComponent('{"id":1,"title":"write post"}');
const bad = "data:application/json," + encodeURIComponent('{"id":2}');

loadTodo(good)
  .then((todo) => console.log(todo.title.toUpperCase()))
  .then(() => loadTodo(bad))
  .then((todo) => console.log(todo.title.toUpperCase()));
```

```text
WRITE POST
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

`tsc` reports nothing, and still the second call crashes, because the JSON has no `title`. The `Promise<Todo>` is our promise, not a check. The next post shows how to check the data at runtime.

## Errors: err in catch is unknown

```typescript
// errors.ts
async function failing(): Promise<number> {
  throw new Error("boom");
}

async function main() {
  try {
    await failing();
  } catch (err) {
    console.log(err.message);
    if (err instanceof Error) console.log("caught:", err.message);
  }
}

main();
```

```text
errors.ts(10,17): error TS18046: 'err' is of type 'unknown'.
boom
caught: boom
```

`throw` can throw any value, not only an `Error`, so with `strict` the `catch` variable is [`unknown`](en/posts/typescript-any-unknown-never/). `err.message` is rejected until you narrow, for example with `instanceof Error`. At runtime both lines run, because an `Error` really was thrown here.

### In older versions

Before TypeScript 4.4 the `catch` variable was `any`. Since 4.4 the [`useUnknownInCatchVariables`](https://www.typescriptlang.org/tsconfig/#useUnknownInCatchVariables) option makes it `unknown`, and it's part of `strict`. `Awaited` was added in [TypeScript 4.5](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html), and with it `Promise.all` infers better types.

## Mistakes beginners make

- **Forgetting `await`.** Inside an `if`, TypeScript catches it (TS2801: the Promise is always defined, so the condition is always true). A lone call without `await` passes with no error.
- **Expecting `.catch` to behave like `catch`.** The parameter of `.catch((reason) => ...)` is declared in the lib as `any`, even with `strict`.
- **`await` inside `forEach`.** `forEach` doesn't wait for an async callback. Use `for...of` or `Promise.all`.

## What's next

Next: validating data at runtime.
