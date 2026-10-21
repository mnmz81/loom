---
title: "Template expressions: what's allowed, @let and ?."
summary: "What you can write inside {{ }} and bindings: operators, arrow functions and spread, @let, pipes, and ?. which changed in 22. And what's not allowed: Math, new, assignment, declarations."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 7 }
---

An expression in a template (inside `{{ }}` or in a binding's value) looks like JavaScript, but it's a [subset of it](https://angular.dev/guide/templates/expression-syntax) with a few additions. The next component uses most of what's allowed:

```typescript
// exprs.ts
import { Component, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

type Product = { name: string; price: number; stock: number };

@Component({
  selector: 'app-exprs',
  imports: [CurrencyPipe],
  template: `
    @let active = products().filter((p) => p.stock > 0);
    @let total = active.reduce((sum, p) => sum + p.price, 0);

    <p>{{ active.length }} of {{ products().length }} in stock</p>
    <p [attr.title]="active.length + ' products'" [class]="{ ...base, sale: total > 20 }">
      Total: {{ total | currency }} ({{ total > 20 ? 'high' : 'low' }})
    </p>
    <p>{{ user()?.name ?? 'Guest' }}</p>
    <p>{{ user()?.name === undefined }}</p>
  `,
})
export class Exprs {
  protected readonly base = { card: true };
  protected readonly user = signal<{ name: string } | null>(null);
  protected readonly products = signal<Product[]>([
    { name: 'Pen', price: 4.5, stock: 10 },
    { name: 'Book', price: 18, stock: 0 },
    { name: 'Lamp', price: 25, stock: 2 },
  ]);
}
```

Every example was checked with Angular 22.2. The test reads the four lines: `2 of 3 in stock`, `Total: $29.50 (high)`, `Guest` and `true`.

## What's allowed

- **Literals**: strings, numbers, `true`/`false`, `null`, objects, arrays, RegExp and template strings. BigInt isn't supported.
- **Operators**: arithmetic (including `**`), comparisons, `&&`, `||`, `!`, `?:`, `??`, `typeof`, `in`, `instanceof`, `void`, and property access with `person['name']`.
- **Arrow functions with an expression body**: `products().filter((p) => p.stock > 0)` and the `reduce` above.
- **Spread**: `{ ...base, sale: total > 20 }` merges objects (also `[...arr]` and `fn(...args)`).
- **Local variables** that start with `$`, like `$index` in [`@for`](en/posts/angular-control-flow/).

The arrow functions and spread appear in the current guide and compiled on 22.2. I didn't check which version added them.

Every expression runs in the context of the component class, so `products()` is `this.products()`. A template variable or `@let` with the same name hides a class field, and you write `this.` to reach it.

## @let

`@let active = ...;` declares a local variable in the template: a long expression is computed once and read by name. A [`@let`](https://angular.dev/guide/templates/variables) updates automatically when its expression changes, but you can't reassign it (`value = value + 1` is invalid), and each one declares a single variable. It's visible in the template that declares it and in the blocks inside it, but not outside the block where it was defined, such as an `@if`.

## Pipes in an expression

`total | currency` passes the value through a [pipe](en/posts/angular-pipes/) and returns the result. The pipe must be in the component's `imports`. The `|` has [lower precedence](https://angular.dev/guide/templates/pipes) than `+`, `&&` and `??`, and higher than `?:`:

- `'a' + 'b' | uppercase` gives `AB`, because the pipe applies to the sum. To apply it to part of the expression, add parentheses: `(total | currency) + '!'` gives `$29.50!`.
- `total > 20 ? 'high' : 'low' | uppercase` gives `high`, because the pipe applies only to `'low'`. With parentheses, `(total > 20 ? 'high' : 'low') | uppercase`, you get `HIGH`.

Inside an arrow function you can't use a pipe, but you can pass an arrow function as an argument to a pipe.

## ?. and ??

`user()?.name` returns `undefined` when `user()` is `null` or `undefined`, instead of an error on `null.name`. Together with `??` it gives a default: `user()?.name ?? 'Guest'`. The expression `user()?.name === undefined` returns `true`, which is JavaScript's behavior. Since Angular 22, `?.` in templates [behaves like JavaScript](https://angular.dev/guide/templates/expression-syntax) (in earlier versions it returned `null`).

## What's not allowed

```text
{{ Math.round(total) }}  TS2339: Property 'Math' does not exist on type 'Exprs'.
{{ total = 5 }}          NG5002: Parser Error: Bindings cannot contain assignments
{{ new Date() }}         NG5002: Parser Error: Unexpected token 'Date'
```

- **Globals**: only `undefined` and `$any` are available. `Math`, `Date`, `parseInt`, `NaN` and friends don't exist in a template. The fix is a method or a `computed` in the class (covered in level 2).
- **Assignment and `++`**: allowed only inside event statements (`(click)="count = count + 1"`), not in bindings and `{{ }}`.
- **`new`, declarations and complex expressions**: `let`, `const`, functions, classes, arrow functions with a block body, destructuring, the comma operator and bitwise operators aren't supported.

The practical rule: when an expression is longer than a line, move it to the class. A template that's easy to read beats a clever expression.

### In older versions

Before Angular 22, the `?.` operator in a template returned `null`, not `undefined`. When upgrading to 22, [`ng update`](https://angular.dev/guide/templates/expression-syntax) wraps such expressions in `$safeNavigationMigration` to keep the old behavior:

```html
<p>{{ $safeNavigationMigration(user()?.name) === null }}</p>
```

I checked: on 22.2 this compiles and returns `true` when `user()` is `null`. The docs call the function a temporary migration aid that may go away, so it's better to write expressions that don't depend on the difference between `null` and `undefined`. In old code, filtering like this was usually done in a class method, in a pipe or in a `computed`.

## Mistakes beginners make

- **Calling `Math` or `Date` from the template.** They aren't available. Compute in the class and show the result.
- **Forgetting parentheses around `?:` before a pipe.** `cond ? 'a' : 'b' | uppercase` applies the pipe only to `'b'`.
- **Piling logic into the template.** An expression that filters, sorts and maps in three lines belongs in a `computed`.

## What's next

Next: `<ng-template>`, `ngTemplateOutlet` and `<ng-container>`, tools for templates you can pass around and render in several places.
