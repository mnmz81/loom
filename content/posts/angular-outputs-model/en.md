---
title: "Outputs and model in Angular: events from the child and two-way binding"
summary: "How a component notifies its parent with output() and emit, how to turn an Observable into an output, and how model() and [(value)] give two-way binding. Plus the old way: @Output and EventEmitter."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 16 }
---

[Inputs](en/posts/angular-inputs/) pass data from parent to child. In the other direction the child sends an event: a click on a rating star, a typed search. [`output()`](https://angular.dev/guide/components/outputs) declares such an event, and `model()` joins both directions into one value.

Every example was checked with Angular 22.2.

## output and emit

```typescript
import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-rating',
  template: `
    @for (star of stars; track star) {
      <button (click)="rate.emit(star)">{{ star }}</button>
    }
  `,
})
export class Rating {
  protected readonly stars = [1, 2, 3, 4, 5];
  readonly rate = output<number>();
}

@Component({
  selector: 'app-review',
  imports: [Rating],
  template: `
    <app-rating (rate)="score.set($event)" />
    <p>You rated {{ score() }}</p>
  `,
})
export class Review {
  protected readonly score = signal(0);
}
```

`output<number>()` returns an `OutputEmitterRef`, and `emit` sends a value. The parent listens with the same syntax as a DOM event, `(rate)`, and the value arrives in `$event`. Clicking `4` shows `You rated 4`. Unlike DOM events, a component event doesn't bubble up the tree: only the direct parent hears it. Per the docs, output names are camelCase, without an `on` prefix.

## An Observable as an output

```typescript
import { Component } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

@Component({
  selector: 'app-search-box',
  template: `<input #box (input)="query$.next(box.value)" />`,
})
export class SearchBox {
  protected readonly query$ = new Subject<string>();
  readonly search = outputFromObservable(this.query$.pipe(debounceTime(300)));
}
```

When the event already comes from an Observable, [`outputFromObservable`](https://angular.dev/ecosystem/rxjs-interop/output-interop) turns it into an output. Here `debounceTime` waits for 300ms without typing, so quickly typing `a`, `an` and `ang` sent the parent a single `(search)`, with `ang`. Angular stops forwarding values when the component is destroyed. If you can call `emit` directly, the docs recommend `output()`.

## model: two-way binding

```typescript
import { Component, model, signal } from '@angular/core';

@Component({
  selector: 'app-quantity',
  template: `
    <button (click)="value.update((v) => v - 1)">-</button>
    <span>{{ value() }}</span>
    <button (click)="value.update((v) => v + 1)">+</button>
  `,
})
export class Quantity {
  readonly value = model(1);
}

@Component({
  selector: 'app-order',
  imports: [Quantity],
  template: `
    <app-quantity [(value)]="quantity" />
    <p>Ordering {{ quantity() }}</p>
  `,
})
export class Order {
  protected readonly quantity = signal(2);
}
```

[`model()`](https://angular.dev/guide/components/inputs#model-inputs) is an input the component can write to. `[(value)]` (the syntax nicknamed "banana in a box") passes it the `quantity` signal itself, without parentheses, and updates it when the child writes. The child starts at `2` from the parent, and clicking `+` shows `Ordering 3` in the parent. You can also bind a plain field, not just a signal.

For every model Angular creates an output named `valueChange` (the model's name plus `Change`), emitted on every `set` or `update`. In a test, `<app-quantity [value]="5" (valueChange)="log.push($event)" />` and a click on `-` added `4` to `log`. A model takes `required` and `alias` like an input, but not a transform. Per the docs, model fits a component whose job is to change a value, like a date picker or a combobox.

### In older versions

`model()` arrived in version 17.2, `output()` in 17.3, and both were marked stable in version 19 ([changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md)). Before that, outputs were declared with [`@Output()`](https://angular.dev/guide/components/outputs#declaring-outputs-with-the-output-decorator) and `EventEmitter`, and two-way binding was a pair of an input and an output with matching names:

```typescript
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-quantity-old',
  template: `
    <button (click)="change(-1)">-</button>
    <span>{{ value }}</span>
    <button (click)="change(1)">+</button>
  `,
})
export class QuantityComponent {
  @Input() value = 1;
  @Output() valueChange = new EventEmitter<number>();

  change(delta: number) {
    this.value += delta;
    this.valueChange.emit(this.value);
  }
}
```

The `xChange` convention is what made `[(value)]` work: Angular expands it to `[value]` and `(valueChange)`. This code still works, and the `output-migration` migration converts `@Output()` to `output()`. `[(ngModel)]` on an `<input>` is the same syntax with the `NgModel` directive from `FormsModule`, and it comes up in the posts on forms.

## Mistakes beginners make

- **Writing `[(value)]="quantity()"`.** The build fails with `NG5002: Unsupported expression in a two-way binding`. Two-way binding needs the signal itself, `quantity`, so it can write to it.
- **Naming an output after a DOM event.** An output called `click` is confusing: it's unclear whether the listener hears the component or the element.
- **Using model when the child only notifies.** If the parent doesn't need to pass a value in, `output()` is enough.

## What's next

Next: `viewChild`, `contentChild` and the other queries, which return references to components and elements inside the template.
