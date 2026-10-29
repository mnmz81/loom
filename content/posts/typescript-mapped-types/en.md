---
title: "Mapped types and template literal types in TypeScript"
summary: "{ [K in keyof T]: ... } builds a new type from the keys of an existing one: readonly and ? modifiers, renaming keys with as, filtering with never, and names like onClick with template literal types."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 25 }
---

A mapped type walks over the keys of one type and builds a new type from them. That's how `Partial`, `Readonly`, `Required`, `Pick` and `Record` from [the utility types post](en/posts/typescript-utility-types/) are built, and how you write your own when none of them fits. The syntax is described in [the official handbook](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html).

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## Walking over the keys

```typescript
// flags.ts
type Settings = { darkMode: boolean; fontSize: number };

type Flags<T> = { [K in keyof T]: boolean };
type MyPartial<T> = { [K in keyof T]?: T[K] };

const flags: Flags<Settings> = { darkMode: true, fontSize: 14 };
const patch: MyPartial<Settings> = { fontSize: 16 };
console.log(patch);
```

```text
flags.ts(7,50): error TS2322: Type 'number' is not assignable to type 'boolean'.
{ fontSize: 16 }
```

`K in keyof T` goes over every key of `T`, like a loop. The right side sets the value type: in `Flags` everything is `boolean`, and in `MyPartial` it's `T[K]`, the original type of that key, with a `?` that makes it optional. That's exactly how `Partial` is defined in `lib.es5.d.ts`, and `Readonly` is the same with `readonly` before the key.

## Modifiers: adding and removing readonly and ?

```typescript
// modifiers.ts
type Config = { readonly host: string; port?: number };

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Concrete<T> = { [K in keyof T]-?: T[K] };

const config: Mutable<Config> = { host: "localhost" };
config.host = "example.com";
const locked: Readonly<Config> = config;
locked.host = "other.com";
const full: Concrete<Config> = { host: "localhost" };
```

```text
modifiers.ts(10,8): error TS2540: Cannot assign to 'host' because it is a read-only property.
modifiers.ts(11,7): error TS2741: Property 'port' is missing in type '{ host: string; }' but required in type 'Concrete<Config>'.
```

`-` removes a modifier and `+` adds one. With no prefix `+` is assumed, so the `readonly` in `Readonly` is really `+readonly`. `Mutable` removes `readonly` from `host`, so the first assignment passes. `Concrete` removes the `?`, and that's how `Required` is defined. `readonly` exists only in the check: at runtime `locked.host` changes as usual, and if you need a real freeze, use `Object.freeze`.

## Renaming with as and filtering with never

Since TypeScript 4.1 you can add `as` after `keyof T` and give each key a new name. A key whose new name is `never` drops out of the type.

```typescript
// remap.ts
type Person = { label: string; age: number; city: string };

type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
type StringsOnly<T> = { [K in keyof T as T[K] extends string ? K : never]: T[K] };

const getters: Getters<Person> = { getLabel: () => "Dana", getAge: () => 30, getCity: () => "Haifa" };
const strings: StringsOnly<Person> = { label: "Dana", age: 30, city: "Haifa" };
console.log(getters.getAge());
```

```text
remap.ts(8,55): error TS2353: Object literal may only specify known properties, and 'age' does not exist in type 'StringsOnly<Person>'.
30
```

`Getters` turns `age` into `getAge`. `keyof T` can include `number` and `symbol` too, and `Capitalize` accepts only a string, so `string & K` keeps just the string keys. In `StringsOnly`, the [conditional type](en/posts/typescript-conditional-types/) returns `never` for every key whose value isn't a `string`, so `age` isn't in the type.

## Template literal types: event handler names

A [template literal type](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) is written like a template string but produces a type. When it contains a union, you get a union of every combination.

```typescript
// events.ts
type EventName = "click" | "submit";
type HandlerName = `on${Capitalize<EventName>}`;

type Handlers = { [E in EventName as `on${Capitalize<E>}`]: (at: number) => void };

const handlers: Handlers = {
  onClick: (at) => console.log("click at", at),
  onSubmit: (at) => console.log("submit at", at),
};
handlers.onClick(10);

const wrong: HandlerName = "onclick";
```

```text
events.ts(13,7): error TS2820: Type '"onclick"' is not assignable to type '"onClick" | "onSubmit"'. Did you mean '"onClick"'?
click at 10
```

`Capitalize` is one of four built-in string manipulation types, along with `Uppercase`, `Lowercase` and `Uncapitalize`. When you add an event to `EventName`, `tsc` demands a new handler in every `Handlers` object, and the `at` parameter gets the type `number` without you writing it.

## Mistakes beginners make

- **`Capitalize<K>` without `string &`.** A `K` from `keyof T` isn't necessarily a string, and TypeScript rejects it.
- **Expecting `Partial` to go deep.** A mapped type changes only the top level. A nested object keeps its required fields.
- **Relying on `readonly` at runtime.** It's erased along with the rest of the types.

## What's next

Next: async code and promises.
