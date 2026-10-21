---
title: "Attribute directives in Angular: behavior for an existing element"
summary: "How to write an attribute directive with @Directive: host bindings and listeners, inputs with input(), reaching the element with ElementRef, and what @HostBinding and @HostListener were."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 51 }
---

A directive adds behavior to an element that already exists in the template, without a template of its own. A component is a directive with a template. An attribute directive changes the look or behavior of the element it sits on, such as its background color or focus.

Every example was checked with Angular 22.2 and Vitest.

## A first directive

```typescript
import { Directive, input, signal } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  host: {
    '[style.backgroundColor]': 'hovered() ? color() : null',
    '[class.highlighted]': 'hovered()',
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
  },
})
export class Highlight {
  readonly appHighlight = input('');
  readonly defaultColor = input('yellow');
  protected readonly hovered = signal(false);

  protected color() {
    return this.appHighlight() || this.defaultColor();
  }
}
```

- `selector: '[appHighlight]'`, in square brackets, matches any element that has the `appHighlight` attribute. Without the brackets it would match a tag with that name. The `app` prefix avoids clashes with HTML attributes.
- `host` declares bindings on the host element with the same syntax as [template bindings](en/posts/angular-bindings/): `[...]` for a property, style or class, and `(...)` for an event. The expression runs against the directive instance, so it can call `hovered()` and `color()`.
- `hovered` is a [signal](en/posts/angular-signals/), so Angular knows to update the background when the mouse enters and leaves.

Per [the docs](https://angular.dev/guide/directives/attribute-directives), `ng generate directive highlight` creates the file and its test file.

## Inputs and the selector name

```typescript
import { Component } from '@angular/core';
import { Highlight } from './highlight';

@Component({
  selector: 'app-page',
  imports: [Highlight],
  template: `
    <p appHighlight>Yellow on hover</p>
    <p appHighlight="lightblue">Light blue on hover</p>
    <p appHighlight defaultColor="pink">Pink on hover</p>
  `,
})
export class Page {}
```

An input named like the selector both applies the directive and passes it a value in one attribute. An attribute with no value gives an empty string, so `color()` falls back to `defaultColor`. A static value needs no square brackets; `[appHighlight]="color"` passes a value from the component. Directive inputs work exactly like [component inputs](en/posts/angular-inputs/), including `input.required` and transforms.

The directive must be in the `imports` of the component that uses it, like any other component.

## Reaching the element with ElementRef

When a binding isn't enough, for example when you need to call a DOM method, inject `ElementRef`:

```typescript
import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

@Directive({ selector: 'input[appAutofocus]' })
export class Autofocus {
  private readonly host = inject<ElementRef<HTMLInputElement>>(ElementRef);

  constructor() {
    afterNextRender(() => this.host.nativeElement.focus());
  }
}
```

`input[appAutofocus]` limits the directive to `<input>` elements. [`afterNextRender`](https://angular.dev/api/core/afterNextRender) runs the code once the element is in the DOM (it's covered in the [lifecycle](en/posts/angular-lifecycle/) post), and it doesn't run on the server at all, so `focus()` is never called without a browser. For styles and classes, prefer `host` over `nativeElement.style`.

### In older versions

In older directives the bindings are decorators on fields and methods:

```typescript
import { Directive, HostBinding, HostListener, Input } from '@angular/core';

@Directive({ selector: '[appHighlightOld]' })
export class HighlightDirective {
  @Input() appHighlightOld = '';
  @Input() defaultColor = 'yellow';
  private hovered = false;

  @HostBinding('style.backgroundColor')
  get backgroundColor() {
    return this.hovered ? this.appHighlightOld || this.defaultColor : null;
  }

  @HostListener('mouseenter')
  onEnter() {
    this.hovered = true;
  }

  @HostListener('mouseleave')
  onLeave() {
    this.hovered = false;
  }
}
```

This code still works, but [the docs](https://angular.dev/guide/components/host-elements) say to always prefer `host`, and that the decorators exist only for backwards compatibility. `@Input()` was replaced by `input()`, as the inputs post explains.

## Mistakes beginners make

- **Forgetting the directive in `imports`.** An attribute without a binding just does nothing, with no error. With a binding the build fails:

```text
✘ [ERROR] NG8002: Can't bind to 'appHighlight' since it isn't a known property of 'p'.
```

- **A selector without square brackets.** `selector: 'appHighlight'` looks for an `<appHighlight>` tag, not an attribute.
- **Changing styles through `nativeElement`.** Angular doesn't know about the change, and a binding in `host` or the template can overwrite it.

## What's next

Next: structural directives, which create and remove parts of the template with `TemplateRef` and `ViewContainerRef`, and composing directives with `hostDirectives`.
