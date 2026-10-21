---
title: "Styling components: encapsulation, :host and [class]"
summary: "How a component's styles stay inside it: view encapsulation (Emulated, None, ShadowDom), :host, host bindings, [class] and [style]. In older versions: ngClass, ngStyle and ::ng-deep."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 9 }
---

A [component's styles](https://angular.dev/guide/components/styling) go in the `styles` field (or `styleUrl`) and apply only to its template. The next components show how that works, and how to style the element that wraps the component:

```typescript
// styling.ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  host: { '[class.active]': 'active()' },
  template: `<p [class.highlight]="active()" [style.font-size.px]="size()">Card text</p>`,
  styles: `
    :host {
      display: block;
      border: 1px solid gray;
    }
    :host(.active) {
      border-color: green;
    }
    p {
      color: red;
    }
    .highlight {
      font-weight: bold;
    }
  `,
})
export class Card {
  readonly active = input(false);
  readonly size = input(16);
}

@Component({
  selector: 'app-page',
  imports: [Card],
  template: `
    <p>Page text</p>
    <app-card [active]="true" [size]="20" />
    <app-card [class]="{ wide: true, dark: false }" />
  `,
})
export class Page {}
```

Every example was checked with Angular 22.2 in a Vitest test that reads the computed styles (`getComputedStyle`) in jsdom.

## Styles that don't leak

The rule `p { color: red; }` in `Card` colors only `Card`'s `<p>`. The `Page text` paragraph in `Page` stays black (`rgb(0, 0, 0)`), and the paragraph inside `Card` is red. This is what the elements look like in the DOM in the test (the exact attribute names vary between components and apps):

```html
<app-card _nghost-a-c2253586371 class="active">
  <p _ngcontent-a-c2253586371 style="font-size: 20px;" class="highlight">Card text</p>
</app-card>
```

This is the view encapsulation called `Emulated`, the default. Angular adds a unique attribute to every element in the component's template (`_ngcontent-…`) and to the host element (`_nghost-…`), and rewrites the rules to include it: `p` becomes `p[_ngcontent-…]`. Styles don't leak out, but global styles from outside can still reach in. `Page`, which has no `styles`, got no attributes at all.

## :host and the host element

The `<app-card>` element itself is called the [host element](https://angular.dev/guide/components/host-elements). `:host` styles it from inside the component: above, `display: block` and a gray border (a custom element is `inline` by default). `:host(.active)` matches it only when it has the class `active`, and the border turns green.

The class comes from `host: { '[class.active]': 'active()' }`, a [binding on the host element](https://angular.dev/guide/components/host-elements) written in the component definition instead of the template. The same place can bind attributes, `[style.x]` and events (`'(keydown)': '...'`).

## [class] and [style]

From outside you can bind classes to `<app-card>` like on any element. `[class]="{ wide: true, dark: false }"` takes an object, and a class name appears on the element only when its value is truthy, so the element got `class="wide"`. The [docs](https://angular.dev/guide/templates/binding) list three kinds of value for `[class]`: a string of classes, an array of classes, or an object. `[style]` takes a string of declarations (`"display: flex; padding: 8px"`) or an object. You can combine them: static classes, `[class]` and `[class.x]` on the same element are merged, with no guaranteed order.

For both object kinds the comparison is `===`, so for a change to be picked up you create a new object or array instead of mutating the existing one.

## Encapsulation modes

You pick one in the `encapsulation` field of `@Component`:

```typescript
import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-global',
  encapsulation: ViewEncapsulation.None,
  template: `<p>None</p>`,
  styles: `
    p {
      color: blue;
    }
  `,
})
export class Global {}
```

- **`Emulated`** (default): what we saw above.
- **`None`**: no protection, and the styles become global. In the test, after rendering `Global` next to `Page`, `Page text` turned blue. The `<p>` inside `Card` stayed red, because its rule is more specific thanks to the attribute.
- **`ShadowDom`**: attaches a shadow root to the host element and renders the template and styles in it, so [its styles don't leak out](https://angular.dev/guide/components/styling). In the test the `<p>` and the `<style>` were found in the `shadowRoot`. It also affects events and `<slot>`, so keep it for cases that really need it.
- **`ExperimentalIsolatedShadowDom`**: like `ShadowDom`, but guarantees that only the component's own styles apply inside it. I didn't try it.

Global rules belong in `src/styles.css`, which the CLI adds to the whole app.

### In older versions

Old code styles in a few more ways. `ngClass` and `ngStyle` are directives from `@angular/common` that take an object:

```typescript
import { Component } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';

@Component({
  selector: 'app-old',
  imports: [NgClass, NgStyle],
  template: `<p [ngClass]="{ done: true, late: false }" [ngStyle]="{ 'font-size.px': 18 }">old</p>`,
})
export class Old {}
```

I checked: this works on 22.2, giving `class="done"` and `font-size: 18px`. The [API docs](https://angular.dev/api/common/NgClass) mark `NgClass` and `NgStyle` as stable, not deprecated. Since `[class]` and `[style]` accept objects, you usually don't need them. The docs name two cases where `ngClass` is still used: a key with several space-separated class names, and mutating an object in place.

To restyle a child component from outside there's `::ng-deep` (for example `:host ::ng-deep p`), which cancels encapsulation from a point in the selector onward. The [docs](https://angular.dev/guide/components/styling) strongly recommend not using it in new code and say it exists only for backwards compatibility. The recommended way is to pass values to the component with inputs, or with CSS variables (`--card-color`), which are inherited from parent to children.

And before `host` in the definition, the same thing was written with the `@HostBinding('class.active')` and `@HostListener` decorators, which are also in the [docs](https://angular.dev/guide/components/host-elements).

## Mistakes beginners make

- **Expecting a rule in a parent component to style a child component.** Encapsulation blocks it. Pass a value through an input, or use a CSS variable.
- **Forgetting `display: block` in `:host`.** A custom element is `inline`, and `width`, `height` and vertical margins won't work without it.
- **Using `ViewEncapsulation.None` "so the styles just work".** The styles become global and leak across the whole app. Put shared styles in `src/styles.css`.

## What's next

Next: the built-in pipes, `date`, `currency` and more, and how to write your own pipe.
