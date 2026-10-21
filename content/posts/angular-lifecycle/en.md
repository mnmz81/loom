---
title: "The component lifecycle in Angular: ngOnInit, DestroyRef and afterNextRender"
summary: "What happens from a component's creation to its destruction: constructor vs ngOnInit, cleanup with DestroyRef, DOM work in afterNextRender and afterEveryRender, and when you still need ngOnChanges."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 18 }
---

A component's [lifecycle](https://angular.dev/guide/components/lifecycle) is the sequence of steps from its creation to its destruction. Angular lets you run code at each step, through class methods (`ngOnInit`, `ngOnDestroy`) or functions such as `afterNextRender`. With signals you need fewer of them: [`computed`](en/posts/angular-signals/) and [`effect`](en/posts/angular-effect/) react to changes without a hook.

Every example was checked with Angular 22.2.

## Constructor vs ngOnInit

```typescript
import { Component, OnInit, input } from '@angular/core';

@Component({
  selector: 'app-greeting',
  template: `<p>Hello {{ name() }}</p>`,
})
export class Greeting implements OnInit {
  readonly name = input.required<string>();

  constructor() {
    console.log(this.name()); // build error: the input has no value yet
  }

  ngOnInit() {
    console.log(`Init with ${this.name()}`);
  }
}
```

```text
✘ [ERROR] NG8118: `name` is a required `input` and does not have a value in this context.
```

The constructor runs when Angular creates the instance, before the parent has passed inputs, and Angular 22 catches a read of a required input in the constructor at build time. `ngOnInit` runs once, [after all inputs have their initial values](https://angular.dev/guide/components/lifecycle#ngoninit) and before the component's own template is built. Without the constructor line, `<app-greeting name="Dana" />` prints `Init with Dana`.

The usual split: the constructor and field initializers create `inject` calls, signals and effects, and `ngOnInit` holds one-time code that needs the inputs' initial values. A value that should update when an input changes belongs in a `computed`, not in `ngOnInit`.

## Cleanup: ngOnDestroy or DestroyRef

```typescript
import { Component, DestroyRef, inject, signal } from '@angular/core';

@Component({
  selector: 'app-clock',
  template: `<time>{{ now().toLocaleTimeString() }}</time>`,
})
export class Clock {
  protected readonly now = signal(new Date());

  constructor() {
    const id = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}
```

Angular destroys a component when it leaves the screen, for example when an `@if` turns false or on navigation to another page. `ngOnDestroy` runs at that moment, but [`DestroyRef`](https://angular.dev/guide/components/lifecycle#destroyref) lets you register the cleanup next to the code that needs it: the timer and its cancellation in the same two lines. In a test, `clearInterval` was called with the timer's id only when the component was destroyed. You can also pass a `DestroyRef` to a function outside the component, and its `destroyed` property tells you whether the instance is already gone.

## After rendering: afterNextRender and afterEveryRender

```typescript
import { Component, ElementRef, afterEveryRender, afterNextRender, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-chat-log',
  template: `
    <ul #list>
      @for (message of messages(); track $index) {
        <li>{{ message }}</li>
      }
    </ul>
  `,
})
export class ChatLog {
  readonly messages = signal<string[]>(['Hi']);
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  constructor() {
    afterNextRender(() => console.log('first render done'));
    afterEveryRender({
      write: () => {
        const list = this.list().nativeElement;
        list.scrollTop = list.scrollHeight;
        return list.childElementCount;
      },
      read: (count) => console.log(`rendered ${count} messages`),
    });
  }
}
```

After the first render and adding one message:

```text
first render done
rendered 1 messages
rendered 2 messages
```

[`afterNextRender`](https://angular.dev/guide/components/lifecycle#aftereveryrender-and-afternextrender) runs once after Angular has finished rendering all components to the DOM, and `afterEveryRender` runs after every render. They are functions, not methods, must be called in an injection context (usually the constructor), and don't run during SSR or prerendering. Splitting into phases prevents layout thrashing: `write` writes to the DOM (here, scrolling to the end of the list), `read` reads from it, and whatever `write` returns is passed to `read`. There are also `earlyRead` and `mixedReadWrite`, which is the default when you pass a function without phases.

## When you still need ngOnChanges

```typescript
import { Component, OnChanges, SimpleChanges, input } from '@angular/core';

@Component({
  selector: 'app-price-tag',
  template: `<span>{{ price() }}</span>`,
})
export class PriceTag implements OnChanges {
  readonly price = input(0);
  readonly currency = input('ILS');

  ngOnChanges(changes: SimpleChanges<PriceTag>) {
    if (changes.price && !changes.price.firstChange) {
      console.log(`price: ${changes.price.previousValue} -> ${changes.price.currentValue}`);
    }
  }
}
```

[`ngOnChanges`](https://angular.dev/guide/components/lifecycle#ngonchanges) runs after every input change, and the first time before `ngOnInit`. It receives `SimpleChanges` with `previousValue`, `currentValue` and `firstChange` for each input that changed. `SimpleChanges<PriceTag>` types it from the class's inputs, so `changes.price` type-checks. When the parent changed the price from 10 to 12, it printed `price: 10 -> 12`. With signal inputs it's needed less: a derived value is a `computed`, and the previous value is available in [`linkedSignal`](en/posts/angular-linked-signal/). It stays useful when you want all changed inputs and their previous values in one place.

### In older versions

Before signals, a component's code was spread across all the hooks. They still exist, in the order [from the docs](https://angular.dev/guide/components/lifecycle#execution-order):

| Hook | When |
|---|---|
| `ngOnChanges` | Before `ngOnInit` and on every input change |
| `ngOnInit` | Once, after the first inputs |
| `ngDoCheck` | On every check of the component |
| `ngAfterContentInit` / `ngAfterContentChecked` | After projected content is initialized / checked |
| `ngAfterViewInit` / `ngAfterViewChecked` | After the template is initialized / checked |
| `ngOnDestroy` | Once, before destruction |

`ngAfterViewInit` was the place to read `@ViewChild` (see [queries](en/posts/angular-queries/)); today a query is a signal. `DestroyRef` arrived in version 16; before it, cleanup lived only in `ngOnDestroy`. `afterEveryRender` was called `afterRender` until version 20, when it was [renamed and marked stable](https://github.com/angular/angular/blob/main/CHANGELOG.md). Angular 22 has no `afterRender`; in old code, replace it with `afterEveryRender`.

## Mistakes beginners make

- **Reading inputs in the constructor.** They haven't arrived yet. Use a `computed` or `ngOnInit`.
- **Changing state in `ngAfterViewInit`.** [Per the docs](https://angular.dev/guide/components/lifecycle#ngafterviewinit) this causes `ExpressionChangedAfterItHasBeenCheckedError`.
- **Forgetting to clean up.** A manual `setInterval` or `addEventListener` keeps running after the component is destroyed, unless you register a cancellation with `DestroyRef`.

## What's next

Next: how the pieces of this level fit together, and when to use an input, an output, a model or a shared service to pass data between components.
