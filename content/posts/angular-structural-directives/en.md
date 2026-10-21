---
title: "Structural directives in Angular: TemplateRef, ViewContainerRef and hostDirectives"
summary: "How to write a structural directive that creates views from an ng-template, what the * expands to, how ngTemplateContextGuard types template variables, and composing directives with hostDirectives."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 52 }
---

A structural directive decides whether, and in how many copies, a part of the template is shown. For `@if`, `@for` and `@switch` [the docs](https://angular.dev/guide/directives/structural-directives) recommend the built-in blocks ([control flow](en/posts/angular-control-flow/)); a directive of your own is worth writing for repeated rendering behavior the blocks don't cover.

Every example was checked with Angular 22.2 and Vitest.

## TemplateRef and ViewContainerRef

A directive that shows its content a number of times:

```typescript
import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';

interface RepeatContext {
  $implicit: number;
  count: number;
}

@Directive({ selector: '[appRepeat]' })
export class Repeat {
  private readonly template = inject<TemplateRef<RepeatContext>>(TemplateRef);
  private readonly container = inject(ViewContainerRef);
  readonly appRepeat = input.required<number>();

  constructor() {
    effect(() => {
      const count = this.appRepeat();
      this.container.clear();
      for (let i = 1; i <= count; i++) {
        this.container.createEmbeddedView(this.template, { $implicit: i, count });
      }
    });
  }

  static ngTemplateContextGuard(dir: Repeat, ctx: unknown): ctx is RepeatContext {
    return true;
  }
}
```

- `TemplateRef` is the [`<ng-template>`](en/posts/angular-ng-template/) the directive sits on: content that isn't shown yet.
- `ViewContainerRef` is the spot in the page where views go. `createEmbeddedView` creates a copy of the template with a context object, and `clear` removes all copies.
- The [`effect`](en/posts/angular-effect/) runs again whenever `appRepeat` changes, so the list is rebuilt.

## The asterisk and the microsyntax

```typescript
import { Component, signal } from '@angular/core';
import { Repeat } from './repeat';

@Component({
  selector: 'app-stars',
  imports: [Repeat],
  template: `
    <button (click)="rating.set(rating() + 1)">+1</button>
    <span *appRepeat="rating(); let n; let total = count">★{{ n }}/{{ total }} </span>
  `,
})
export class Stars {
  protected readonly rating = signal(2);
}
```

At first it shows `★1/2 ★2/2`, and after a click `★1/3 ★2/3 ★3/3`. The asterisk tells Angular to wrap the element in an `<ng-template>` and move the directive onto it. The line is equivalent to:

```html
<ng-template [appRepeat]="rating()" let-n let-total="count">
  <span>★{{ n }}/{{ total }} </span>
</ng-template>
```

- The first expression goes to the input named like the selector.
- `let n` without `=` gets `$implicit` from the context, and `let total = count` gets `count`.
- An extra key, such as `; label: x`, goes to an input named `appRepeatLabel`: the selector name followed by the capitalized key. That's how `*ngFor="let x of items"` passes `items` to `ngForOf`.

Only one asterisk fits on an element. For two, wrap one in an `<ng-container>`.

## Typing the context with ngTemplateContextGuard

The static `ngTemplateContextGuard` at the end of `Repeat` never runs. It only tells the template type checker what the context holds. Without it `n` is `any`, and `{{ n.toUpperCase() }}` builds silently. With it the build fails:

```text
✘ [ERROR] TS2339: Property 'toUpperCase' does not exist on type 'number'. [plugin angular-compiler]
```

A generic directive can pass its type through, as the `SelectDirective<T>` example in the docs does.

## Composing with hostDirectives

[`hostDirectives`](https://angular.dev/guide/directives/directive-composition-api) attaches existing directives to a component's host element, without the user writing them in the template. Here it's `Highlight` from [the previous post](en/posts/angular-attribute-directives/):

```typescript
import { Component } from '@angular/core';
import { Highlight } from './highlight';

@Component({
  selector: 'app-card',
  hostDirectives: [{ directive: Highlight, inputs: ['appHighlight: color'] }],
  template: `<ng-content />`,
})
export class Card {}
```

Now `<app-card color="pink">` turns pink on hover. A host directive's inputs and outputs are private by default: only what's listed in `inputs` or `outputs` is exposed, and `appHighlight: color` also renames it. Host directives are attached at compile time, not at runtime, and their selector is ignored.

### In older versions

The same directive in the old style, with constructor injection and a setter on `@Input()` instead of `effect`:

```typescript
import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({ selector: '[appRepeatOld]' })
export class RepeatDirective {
  constructor(
    private template: TemplateRef<any>,
    private container: ViewContainerRef,
  ) {}

  @Input() set appRepeatOld(count: number) {
    this.container.clear();
    for (let i = 1; i <= count; i++) {
      this.container.createEmbeddedView(this.template, { $implicit: i, count });
    }
  }
}
```

`*ngIf` and `*ngFor` are structural directives like this one. They still work, but `*ngIf` is deprecated since version 20, and new code uses `@if` and `@for`.

## Mistakes beginners make

- **Forgetting `clear()`.** Each run of the effect adds copies on top of the old ones instead of replacing them.
- **Two asterisks on one element.** The build fails:

```text
✘ [ERROR] NG5002: Can't have multiple template bindings on one element. Use only one attribute prefixed with * [plugin angular-compiler]
```

- **Writing a structural directive instead of `@if`.** A plain condition doesn't need a directive.

## What's next

Next: dynamic components, chosen at runtime with `NgComponentOutlet` and `ViewContainerRef.createComponent`.
