---
title: "Accessibility in Angular: ARIA, focus management and Angular Aria"
summary: "Accessibility in Angular components: native elements, ARIA attribute bindings, moving focus, LiveAnnouncer, and Angular Aria, the headless directives that are stable since v22."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 61 }
---

A keyboard or screen-reader user needs to know what each element does, what state it's in, and what changed after an action. Angular gives you three layers for that: correct HTML with ARIA attributes in the template, tools from `@angular/cdk/a11y`, and the `@angular/aria` package for complex widgets such as a listbox or tabs.

Every example was checked with Angular 22.2 and `@angular/aria` + `@angular/cdk` 22.2.3, in a Vitest test that inspects the DOM.

## Native elements and ARIA attributes

A real `<button>` takes focus, responds to Enter and Space and is announced as a "button". A `<div (click)>` does none of that. So start with the right element, and add ARIA only for information HTML can't express, such as "this panel is open":

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-disclosure',
  template: `
    <button type="button" [aria-expanded]="open()" aria-controls="shipping" (click)="open.set(!open())">
      Shipping details
    </button>
    <div id="shipping" [hidden]="!open()">Ships in 2–3 business days.</div>
    <button type="button" [aria-label]="'Remove ' + item()">✕</button>
  `,
})
export class Disclosure {
  protected readonly open = signal(false);
  protected readonly item = signal('Coffee');
}
```

`[aria-expanded]` is a [plain ARIA attribute binding](https://angular.dev/guide/templates/binding): Angular writes the value as an HTML attribute (`aria-expanded="false"`, and `"true"` after a click) and removes it when the value is `null`. A fixed value, like `aria-controls`, is written as a normal attribute. The second button shows only ✕, so `aria-label` gives it a name a screen reader can read out ("Remove Coffee"). More examples, including `role` and `aria-valuenow` in a component's `host`, are in the [accessibility guide](https://angular.dev/best-practices/a11y).

## Moving focus and announcing a change

When an action removes the focused element, the browser sends focus back to `body`, and the keyboard user loses their place. On top of that, the screen reader says nothing about the change. This component handles both:

```typescript
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Component({
  selector: 'app-cart',
  template: `
    <h2 #heading tabindex="-1">Cart ({{ items().length }})</h2>
    <ul>
      @for (item of items(); track item) {
        <li>
          {{ item }}
          <button type="button" [aria-label]="'Remove ' + item" (click)="remove(item)">✕</button>
        </li>
      }
    </ul>
  `,
})
export class Cart {
  private readonly announcer = inject(LiveAnnouncer);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  protected readonly items = signal(['Coffee', 'Tea', 'Milk']);

  protected remove(item: string) {
    this.items.update((list) => list.filter((i) => i !== item));
    this.heading().nativeElement.focus();
    this.announcer.announce(`${item} removed from cart`);
  }
}
```

- `tabindex="-1"` lets code focus the heading without adding it to the Tab order. `viewChild` is covered in the [queries](en/posts/angular-queries/) post.
- [`LiveAnnouncer`](https://material.angular.dev/cdk/a11y/overview) from the CDK (`npm install @angular/cdk`) writes the message into a hidden element with `aria-live="polite"`, and the screen reader reads it once it finishes what it's saying. In the test, after clicking "Remove Tea", focus is on "Cart (2)" and the element contains `Tea removed from cart`.

The same idea applies to navigation: after a page change, move focus to the new page's heading. The official guide shows how with the router's `NavigationEnd`.

## Angular Aria

A widget such as a listbox, tabs or a menu needs a lot more: arrow keys, type-ahead, `aria-selected`, `aria-activedescendant`, RTL support. [Angular Aria](https://angular.dev/guide/aria/overview) is a set of headless directives that implement the WAI-ARIA patterns: they handle the keyboard, ARIA and focus, and you write the HTML and CSS. Per the [v22 page](https://angular.dev/events/v22), the package is stable as of this version.

```bash
npm install @angular/aria @angular/cdk
```

The patterns: Accordion, Autocomplete, Combobox, Grid, Listbox, Menu, Menubar, Multiselect, Select, Tabs, Toolbar and Tree. Each is imported from its own path, for example [listbox](https://angular.dev/guide/aria/listbox):

```typescript
import { Component, signal } from '@angular/core';
import { Listbox, Option } from '@angular/aria/listbox';

@Component({
  selector: 'app-size-picker',
  imports: [Listbox, Option],
  template: `
    <span id="size-label">Size</span>
    <ul ngListbox aria-labelledby="size-label" [(value)]="size">
      @for (s of sizes; track s) {
        <li ngOption [value]="s">{{ s }}</li>
      }
    </ul>
    <p>Selected: {{ size().join(', ') }}</p>
  `,
  styles: `
    [ngOption][aria-selected='true'] { font-weight: bold; }
    [ngOption]:focus-visible { outline: 2px solid; }
  `,
})
export class SizePicker {
  protected readonly sizes = ['S', 'M', 'L', 'XL'];
  protected readonly size = signal(['M']);
}
```

The HTML the directives produce (shortened):

```text
<ul role="listbox" aria-labelledby="size-label" tabindex="-1" aria-orientation="vertical" aria-multiselectable="false">
<li role="option" tabindex="-1" aria-selected="false">
<li role="option" tabindex="0" aria-selected="true">
```

- `value` is an array even for single selection, and `[(value)]` connects it to a signal (the `model()` mechanism from the [outputs and model](en/posts/angular-outputs-model/) post).
- Only the active option gets `tabindex="0"` (roving tabindex), so one Tab press enters the list and one leaves it.
- The default is `selectionMode="follow"`: Arrow Down from M selected L. With `selectionMode="explicit"` the arrows only move focus, and Space or Enter selects. `multi` allows multiple selection.
- Styling relies on the attributes themselves (`aria-selected`), so no extra classes are needed.

Angular Aria fits when you need your own design. If you want ready-styled components, use Angular Material, and for a simple form `<button>` and `<input type="radio">` are enough.

### In older versions

Until Angular 20.2, a binding like `[aria-label]` was treated as a property binding, so older code writes ARIA attributes with the `attr.` prefix. That syntax still works:

```html
<button type="button" [attr.aria-expanded]="open()" [attr.aria-label]="label()">…</button>
```

## Mistakes beginners make

- **`<div (click)>` instead of `<button>`.** No focus, no keyboard and no role. ARIA adds no behavior, it only describes it.
- **`aria-label` on an element that already has visible text.** The screen reader reads the label instead of the text, and the two drift apart over time.
- **Hiding screen-reader text with `display: none`.** Screen readers skip it. The CDK's `cdk.a11y-visually-hidden` mixin produces a `cdk-visually-hidden` class that hides it from the eye only.

## What's next

Next: the CDK, the Component Dev Kit: Overlay, drag and drop and `cdkTrapFocus`.
