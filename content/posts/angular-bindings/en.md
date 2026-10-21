---
title: "Angular bindings: interpolation, [property], (event) and template variables"
summary: "How a template connects to its class: {{ }} interpolation, property and attribute bindings, class and style, events with (click) and $event, and template variables with #."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 5 }
---

A [binding](https://angular.dev/guide/templates/binding) connects the template to the component's data: values flow from the class into the DOM, and events flow from the DOM back to the class. One component shows every kind:

```typescript
// bindings.ts
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-bindings',
  template: `
    <h2>{{ title }}</h2>
    <img [src]="logo" [alt]="title" />

    <button
      [attr.aria-label]="'Add one to ' + count()"
      [disabled]="count() >= 3"
      (click)="add()"
    >
      +1
    </button>
    <p [class.done]="count() >= 3" [style.font-size.px]="14 + count()">Count: {{ count() }}</p>

    <input (input)="onInput($event)" placeholder="Name" />
    <p>Hello, {{ name() }}</p>

    <input #box placeholder="Note" />
    <button (click)="saved.set(box.value)">Save</button>
    <p>Saved: {{ saved() }}</p>
  `,
})
export class Bindings {
  protected readonly title = 'Bindings';
  protected readonly logo = 'logo.svg';
  protected readonly count = signal(0);
  protected readonly name = signal('');
  protected readonly saved = signal('');

  protected add() {
    this.count.update((n) => n + 1);
  }

  protected onInput(event: Event) {
    this.name.set((event.target as HTMLInputElement).value);
  }
}
```

Every example was checked with Angular 22.2: a Vitest test clicked the buttons, typed in the fields and read the DOM.

## Interpolation: {{ }}

`{{ title }}` shows a value as text. The conversion to a string uses `toString`, and `{{ }}` works anywhere you'd write text in HTML, including inside an attribute value: `alt="Photo of {{ name() }}"`.

A value that changes over time should be a [signal](en/posts/angular-signals/) that the template reads with parentheses, like `{{ count() }}`. Angular tracks the signals the template reads and updates only when they change. A plain field like `title` fits a value that never changes.

## Property binding: [prop]

`[src]="logo"` sets the value of `logo` on the DOM element's **property**. Likewise `[disabled]="count() >= 3"` disables the button while the expression is true. The same syntax also passes values to the inputs of other components. Between the square brackets goes the DOM property name, which isn't always the same as the HTML attribute name.

## Attribute binding: [attr.x]

Not every attribute has a matching property. For those you use the `attr.` prefix, like `[attr.aria-label]` on the `<button>` above. A `null` value removes the attribute. The classic mistake is an attribute whose name differs from its property:

```text
✘ [ERROR] NG8002: Can't bind to 'colspan' since it isn't a known property of 'td'.
```

The property is called `colSpan` and the attribute is `colspan`. The safe way is `[attr.colspan]="2"`, which compiled without an error.

## class and style

`[class.done]="count() >= 3"` adds the class `done` while the expression is true, and `[style.font-size.px]="14 + count()"` sets the font size in pixels (after three clicks: `17px`). They're shown only briefly here; the [styling post](en/posts/angular-styling/) also covers `[class]` and `[style]` with objects.

## Events: (event) and $event

`(click)="add()"` runs the expression on every click. Inside any listener there's a variable `$event` holding the event object. In `(input)="onInput($event)"` it reaches `onInput`, which reads the value from `event.target`. The cast to `HTMLInputElement` can't be written in the template itself ([the expressions post](en/posts/angular-template-expressions/) explains why), so it lives in the method.

Keyboard events can be filtered by key: `(keyup.enter)="save()"` runs only on Enter, and modifiers can be chained: `(keyup.shift.enter)`. The full list is in the [events docs](https://angular.dev/guide/templates/event-listeners).

## Template variables: #box

`#box` on the `<input>` gives the element a name that anywhere else in the template can read: `box.value` in the button reads what was typed, with no method and no extra signal. On a plain element a [template variable](https://angular.dev/guide/templates/variables) points to the DOM element, and on a component to its instance. It's visible in the template that declares it and in the blocks inside it (`@if`, `@for`), but not the other way around.

### In older versions

The binding syntax hasn't changed. What changed is what it connects to. In old code values are plain fields (`count = 0`, `{{ count }}`), and Zone.js made Angular check the template after every event, so anything changed inside `(click)` or inside `setTimeout` showed up on screen. Without Zone.js, a plain field updates on screen only after an event bound in the template. An async change such as `setTimeout` doesn't update it (in a test, the value on screen stayed stale), which is why you use signals.

## Mistakes beginners make

- **Missing square brackets or parentheses.** `src="logo"` sends the string `logo`, not the field. To pass the value you need `[src]="logo"`.
- **Reading a signal without parentheses.** `{{ count }}` shows the function, `{{ count() }}` the value.
- **Writing `[colspan]` instead of `[attr.colspan]`.** `<td>` has no property by that name (it has `colSpan`), and the `NG8002` error appears at compile time.

## What's next

Next: control flow in templates, `@if`, `@for` and `@switch`.
