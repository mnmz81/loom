---
title: "interface or type in TypeScript?"
summary: "interface and type describe objects almost the same way. The differences: extends vs &, interface declaration merging, and unions only type can describe. Plus what the docs recommend."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 8 }
---

There are two ways to name an object type: `interface User { ... }` and `type User = { ... }`. [The docs](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) say almost everything `interface` can do, `type` can do too, and the main difference is that an `interface` can be reopened to add properties.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## Extending: extends and &

```typescript
// shapes.ts
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

type Cat = Animal & { indoor: boolean };

const rex: Dog = { name: "Rex", breed: "Collie" };
const tom: Cat = { name: "Tom", indoor: true };
console.log(rex.breed, tom.indoor);
```

```text
Collie true
```

`interface` extends with `extends`, and `type` combines with `&` (an intersection). Here the result is the same. The difference shows up when the two parts disagree about a property:

```typescript
// conflict.ts
interface Base {
  id: string;
}
interface WithNumber extends Base {
  id: number;
}

type Both = Base & { id: number };
const both: Both = { id: 1 };
```

```text
conflict.ts(5,11): error TS2430: Interface 'WithNumber' incorrectly extends interface 'Base'.
  Types of property 'id' are incompatible.
    Type 'number' is not assignable to type 'string'.
conflict.ts(10,22): error TS2322: Type 'number' is not assignable to type 'never'.
```

`extends` reports the conflict where the type is defined. `&` accepts the definition silently, and `id` becomes `never`, because no value is both a `string` and a `number`. The error appears only when you try to create an object.

## Declaration merging

```typescript
// merge.ts
interface Config {
  host: string;
}
interface Config {
  port: number;
}
const config: Config = { host: "localhost" };

type Settings = { host: string };
type Settings = { port: number };
```

```text
merge.ts(8,7): error TS2741: Property 'port' is missing in type '{ host: string; }' but required in type 'Config'.
merge.ts(10,6): error TS2300: Duplicate identifier 'Settings'.
merge.ts(11,6): error TS2300: Duplicate identifier 'Settings'.
```

The two `Config` declarations merge into one type with `host` and `port`. That's how libraries let you add properties to their types, such as `Window`. A `type` with the same name twice is an error.

## What only type can do

`type` names any type, not just an object:

- a union: `type Id = string | number`
- a tuple: `type Pair = [string, number]`
- a function type: `type Op = (a: number, b: number) => number`

`interface` can't describe any of these.

## So which to pick

The docs' recommendation: "use `interface` until you need to use features from `type`". In practice many projects pick one and stick with it, which is perfectly fine.

## Mistakes beginners make

- **Using `&` to "override" a property.** The result is `never`, not an override. For overriding there's `Omit` (in the utility types post).
- **Declaring an `interface` twice by accident.** There's no error; the properties just merge.
- **Trying to write a union with `interface`.** That only works with `type`.

## What's next

Next: unions and literal types.
