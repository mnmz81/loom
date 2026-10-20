---
title: "Classes in TypeScript: readonly, private vs #private, abstract"
summary: "Fields and strictPropertyInitialization, readonly, compile-time private vs JavaScript's #private, abstract and implements, and parameter properties, which need tsx."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 13 }
---

A class in TypeScript is a JavaScript class with types for its fields and methods. Most of the keywords added on top, like `readonly`, `private` and `abstract`, exist only in the type check and are erased before the code runs.

Every example was checked with TypeScript 6.0.3 and 7.0.2 and run on Node.js 24.

## Fields and readonly

```typescript
// product.ts
class Product {
  readonly id: number;
  title: string;
  price: number;

  constructor(id: number, title: string) {
    this.id = id;
    this.title = title;
  }
}

const desk = new Product(1, "Desk");
desk.id = 2;
console.log(desk);
```

```text
product.ts(5,3): error TS2564: Property 'price' has no initializer and is not definitely assigned in the constructor.
product.ts(14,6): error TS2540: Cannot assign to 'id' because it is a read-only property.
Product { id: 2, title: 'Desk', price: undefined }
```

- [`strictPropertyInitialization`](https://www.typescriptlang.org/tsconfig/#strictPropertyInitialization), part of `strict`, requires every field to get a value in its declaration or in the constructor itself. `price` didn't, and at runtime it's `undefined`.
- A `readonly` field can be assigned only in its declaration and in the constructor. It's checked only by `tsc` too: at runtime `id` changed to 2.

## private vs #private

```typescript
// account.ts
class Account {
  private owner: string;
  #balance = 0;

  constructor(owner: string) {
    this.owner = owner;
  }

  get balance() {
    return this.#balance;
  }

  deposit(amount: number) {
    this.#balance += amount;
  }
}

const acc = new Account("Dana");
acc.deposit(50);
console.log(acc.owner);
console.log((acc as any).owner, acc.balance, Object.keys(acc));
```

```text
account.ts(21,17): error TS2341: Property 'owner' is private and only accessible within class 'Account'.
Dana
Dana 50 [ 'owner' ]
```

TypeScript's `private` is checked only at compile time. `tsc` reported an error, but Node ran the line and printed the owner, and `as any` gets around the check too. The handbook calls this [soft private](https://www.typescriptlang.org/docs/handbook/2/classes.html#caveats).

`#balance` is a private field of JavaScript itself: it's private at runtime too, and doesn't show up in `Object.keys`. `acc.#balance` outside the class is a syntax error, before the code even runs. `get balance()` is a getter: it lets you read the value like a field (`acc.balance`) without allowing changes to it.

## abstract and implements

```typescript
// shape.ts
interface Named {
  name(): string;
}

abstract class Shape implements Named {
  abstract area(): number;

  name() {
    return `${this.constructor.name}, area ${this.area().toFixed(1)}`;
  }
}

class Square extends Shape {
  size = 2;

  area() {
    return this.size ** 2;
  }
}

class Circle extends Shape {}

new Shape();
console.log(new Square().name());
```

```text
shape.ts(22,7): error TS2515: Non-abstract class 'Circle' does not implement inherited abstract member area from class 'Shape'.
shape.ts(24,1): error TS2511: Cannot create an instance of an abstract class.
Square, area 4.0
```

- [`abstract`](https://www.typescriptlang.org/docs/handbook/2/classes.html#abstract-classes-and-members): a class meant only as a base. You can't create an instance of it (TS2511), and every class that extends it must implement its abstract methods (TS2515).
- `implements Named` checks that the class fits the interface, and nothing more. It adds no fields and doesn't change the types of the methods.

## Parameter properties

```typescript
// point.ts (run with tsx)
class Point {
  constructor(
    public readonly x: number,
    private y: number,
  ) {}

  toString() {
    return `(${this.x}, ${this.y})`;
  }
}

console.log(`${new Point(3, 4)}`, new Point(1, 2).x);
```

```text
(3, 4) 1
```

`public`, `private`, `protected` or `readonly` before a constructor parameter creates a field with the same name and assigns the value to it. That's a [parameter property](https://www.typescriptlang.org/docs/handbook/2/classes.html#parameter-properties), and it generates code that isn't written in the file, so Node fails with `TypeScript parameter property is not supported in strip-only mode`, and `erasableSyntaxOnly` reports it as an error.

### In older versions

In Angular, dependency injection was written with parameter properties for years: `constructor(private http: HttpClient) {}`. The Angular docs now use a field with `inject()`: `private http = inject(HttpClient)`, and Angular has a [migration](https://angular.dev/reference/migrations/inject-function) that converts the old style. `#private` fields are supported since [TypeScript 3.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#ecmascript-private-fields), so older code has only `private`.

## Mistakes beginners make

- **`private` for data that must really stay secret.** At runtime it's an ordinary field. Use `#`.
- **`price!: number` to silence TS2564.** The field stays `undefined` until something assigns it.
- **Expecting `implements` to infer types.** A method parameter without a type doesn't get its type from the interface. Write it in the class.

## What's next

Next: modules, `import` and `export`, and the difference between a module and a script.
