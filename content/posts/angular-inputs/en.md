---
title: "Inputs in Angular: input(), input.required and transform"
summary: "How a component receives data from its parent with input(): defaults, input.required checked at build time, alias, transform with booleanAttribute, and why you can't write to an input."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 15 }
---

A component receives data from its parent through [inputs](https://angular.dev/guide/components/inputs), similar to props in other frameworks. In Angular 22 you declare an input with the `input()` function, which returns a read-only signal. The parent-side syntax `[amount]="..."` was covered in the [post on bindings](en/posts/angular-bindings/).

Every example was checked with Angular 22.2.

## input and input.required

```typescript
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-price',
  template: `<span>{{ label() }}</span>`,
})
export class Price {
  readonly amount = input.required<number>();
  readonly currency = input('ILS');
  protected readonly label = computed(() => `${this.amount().toFixed(2)} ${this.currency()}`);
}

@Component({
  selector: 'app-product',
  imports: [Price],
  template: `
    <app-price [amount]="49.9" />
    <app-price [amount]="10" currency="USD" />
  `,
})
export class Product {}
```

`input('ILS')` is an optional input with a default, and TypeScript infers the type from it (`InputSignal<string>`). `input.required<number>()` must come from the parent. Because an input is a signal, you read it with `()` and derive a `computed` from it: when `amount` changes, `label` updates too. The screen shows `49.90 ILS` and `10.00 USD`. `currency="USD"` without square brackets passes a constant string.

The requirement is checked at build time. Here is `<app-price />` without `amount`:

```text
✘ [ERROR] NG8008: Required input 'amount' from component Price must be specified.
```

An optional input without a default, `input<number>()`, has the type `number | undefined`. The type of `input.required` doesn't get `undefined` added.

An [alias](https://angular.dev/guide/components/inputs#input-aliases) changes the name in templates without changing it in code, e.g. `input(0, { alias: 'sliderValue' })`. The docs advise avoiding it, except for renaming while keeping the old name or avoiding a collision with a DOM element property.

## transform: accept a string, hold a boolean

```typescript
import { Component, booleanAttribute, input, numberAttribute } from '@angular/core';

@Component({
  selector: 'app-badge',
  template: `<span [class.muted]="disabled()">{{ count() + 1 }}</span>`,
})
export class Badge {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly count = input(0, { transform: numberAttribute });
}

@Component({
  selector: 'app-inbox',
  imports: [Badge],
  template: `<app-badge disabled count="3" />`,
})
export class Inbox {}
```

In HTML every attribute is a string. `transform` converts the value before it's stored. [`booleanAttribute`](https://angular.dev/guide/components/inputs#built-in-transformations) turns a bare `disabled` into `true`, like an HTML boolean attribute, and the string `"false"` into `false`. `numberAttribute` turns `"3"` into a number, so `count() + 1` shows `4`, not `31`. The type of the transform function's parameter decides what the template may pass, and the function should be pure.

## You can't write to an input

```typescript
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-discount',
  template: `<button (click)="clear()">Clear</button> {{ percent() }}%`,
})
export class Discount {
  readonly percent = input(0);

  protected clear() {
    this.percent.set(0);
  }
}
```

```text
✘ [ERROR] TS2339: Property 'set' does not exist on type 'InputSignal<number>'.
```

An input's value belongs to the parent, and `InputSignal` is [read-only](https://angular.dev/guide/components/inputs#reading-inputs). When you need a local copy you can change, there are two ways: a [`linkedSignal`](en/posts/angular-linked-signal/) sourced from the input, which resets when the input changes, or `model()`, which sends the change back to the parent and is covered in the next post.

### In older versions

`input()` arrived in version 17.1 and was marked stable in version 19 ([changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md)). Before it, inputs were declared with the [`@Input()`](https://angular.dev/guide/components/inputs#declaring-inputs-with-the-input-decorator) decorator (decorators are covered [in the TypeScript series](en/posts/typescript-decorators/)), and derived values were computed in `ngOnChanges`:

```typescript
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-price-old',
  template: `<span>{{ label }}</span>`,
})
export class PriceComponent implements OnChanges {
  @Input({ required: true }) amount!: number;
  @Input() currency = 'ILS';
  label = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['amount'] || changes['currency']) {
      this.label = `${this.amount.toFixed(2)} ${this.currency}`;
    }
  }
}
```

`ngOnChanges` runs whenever an input changes and receives `SimpleChanges` with the previous and current value. Another common approach was a setter on the input, which runs code on every assignment. The `!` tells TypeScript the value will come from outside. `@Input()` is still fully supported, and the `@angular/core` migration `signal-input-migration` converts it to `input()` (see the post on [migrating to signals](en/posts/angular-migrate-signals/)).

## Mistakes beginners make

- **Reading an input without parentheses.** `amount` is a signal; the value is `amount()`.
- **Deriving a value in `ngOnInit` instead of a `computed`.** Code in `ngOnInit` runs once and won't update when the parent passes a new value.
- **Passing a number or boolean without square brackets.** `count="3"` passes a string. Without `numberAttribute` that's a type error, so write `[count]="3"` or add a transform.

## What's next

Next, the opposite direction: `output()` for events from child to parent, and `model()` for two-way binding.
