---
title: "Discriminated unions in TypeScript: making impossible states impossible"
summary: "Replace a bag of booleans and optional fields with a union where each state carries only its own data, so loading-with-an-error can't be written, plus the either-or props pattern."
date: 2026-10-29
tags: [typescript]
series: { key: typescript, order: 11 }
---

The [narrowing post](en/posts/typescript-narrowing/) showed how a `switch` on a shared `kind` property narrows a union. This post is about using that to design types, so that a state that makes no sense can't be written at all.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24, against the handbook's [discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions) section.

## The bag of optionals

A typical first version of "data loaded from a server":

```typescript
// loose.ts
type User = { name: string };
type UserState = { loading: boolean; error?: string; user?: User };

const state: UserState = { loading: true, error: "timeout", user: { name: "Dana" } };

function render(s: UserState) {
  if (s.loading) return "Loading...";
  if (s.error) return `Error: ${s.error}`;
  return `Hello, ${s.user?.name}`;
}

console.log(render(state), "|", render({ loading: false }));
```

```text
Loading... | Hello, undefined
```

The type allows 8 combinations, and only 4 make sense. `state` is loading, failed and loaded at once, and `tsc` accepts it. `{ loading: false }` with no error and no user is accepted too, and the page says "Hello, undefined". Every reader of `UserState` has to guess which combinations really happen.

## One state, one member

List the states instead, and give each one only the data it has:

```typescript
// remote.ts
type User = { name: string };
type UserState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; user: User };

function render(s: UserState): string {
  switch (s.status) {
    case "idle":
      return "";
    case "loading":
      return "Loading...";
    case "error":
      return `Error: ${s.error}`;
    case "success":
      return `Hello, ${s.user.name}`;
  }
}

const bad: UserState = { status: "loading", error: "timeout" };
const done: UserState = { status: "success", user: { name: "Dana" } };
console.log(render(done));
```

```text
remote.ts(22,45): error TS2353: Object literal may only specify known properties, and 'error' does not exist in type '{ status: "loading"; }'.
Hello, Dana
```

- A loading state with an error is now a compile error.
- `s.user` inside `case "success"` needs no `?.`: in that branch, `user` always exists.

`render` has no `default`. Because the return type is `string`, a missing case is caught too: if a fifth status were added, the function could end without returning and `tsc` would report `Function lacks ending return statement and return type does not include 'undefined'`. The `never` check from the narrowing post does the same job and also works in a function that returns nothing.

## Transitions as functions

Each change of state is a function that returns a whole new state. Nothing can set `status` without also setting the data that goes with it:

```typescript
// transitions.ts
type User = { name: string };
type UserState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; user: User };

const start = (): UserState => ({ status: "loading" });
const fail = (error: string): UserState => ({ status: "error", error });
const succeed = (user: User): UserState => ({ status: "success", user });
const broken = (): UserState => ({ status: "success" });

console.log([start(), fail("timeout"), succeed({ name: "Avi" })].map((s) => s.status));
```

```text
transitions.ts(12,34): error TS2322: Type '{ status: "success"; }' is not assignable to type 'UserState'.
  Property 'user' is missing in type '{ status: "success"; }' but required in type '{ status: "success"; user: User; }'.
[ 'loading', 'error', 'success' ]
```

The error names the member that matched the `status` and the field it's missing.

## Either this or that

Unions also model props that exclude each other. A button gets a link or a click handler, never both and never neither. The trick is `?: never` on the property that must be absent:

```typescript
// button.ts
type ButtonProps = { label: string } & (
  | { href: string; onClick?: never }
  | { onClick: () => void; href?: never }
);

function button(p: ButtonProps) {
  return p.href !== undefined ? `<a href="${p.href}">${p.label}</a>` : `<button>${p.label}</button>`;
}

console.log(button({ label: "Home", href: "/loom/" }));
button({ label: "Both", href: "/", onClick: () => {} });
button({ label: "Neither" });
```

```text
button.ts(12,8): error TS2345: Argument of type '{ label: string; href: string; onClick: () => void; }' is not assignable to parameter of type 'ButtonProps'.
button.ts(13,8): error TS2345: Argument of type '{ label: string; }' is not assignable to parameter of type 'ButtonProps'.
<a href="/loom/">Home</a>
```

Without `onClick?: never`, `{ href, onClick }` would pass: the excess-property check only rejects a property that no member of the union has, and `onClick` is in the second one. An optional `never` property can only be absent (or `undefined`), so "the other one is present" becomes a type error. Here `href` itself is the discriminant: checking it for `undefined` narrows `p`.

## Mistakes beginners make

- **A `type` field typed `string`.** The discriminant must be a literal type (`"loading"`), or nothing narrows.
- **Keeping the old booleans next to the union.** `isLoading` plus `status: "loading"` can disagree again. Derive it: `s.status === "loading"`.
- **Checking a copy of the discriminant kept in a `let`.** `const status = s.status; if (status === "error")` narrows `s`. With `let`, it doesn't, because the variable could change before the check.

## What's next

Next: `null`, `undefined`, `?.`, `??` and `!`.
