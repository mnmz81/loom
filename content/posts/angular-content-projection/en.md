---
title: "Content projection: ng-content, select and ngProjectAs"
summary: "How a component takes content from outside with <ng-content>: several slots with select, fallback content, ngProjectAs, and what to know about projected content. In older versions: before fallback."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 11 }
---

A component like a card, a dialog or a list doesn't know in advance what will be inside it. [Content projection](https://angular.dev/guide/components/content-projection) lets it define places, `<ng-content>`, where content the caller wrote between its tags is shown. (In [`ng-template`](en/posts/angular-ng-template/) we saw another way to pass pieces of template.)

```typescript
// projection.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-card',
  template: `
    <header><ng-content select="[card-title]">Untitled</ng-content></header>
    <section><ng-content /></section>
    <footer><ng-content select="app-actions" /></footer>
  `,
})
export class Card {}

@Component({
  selector: 'app-actions',
  template: `<button>OK</button>`,
})
export class Actions {}

@Component({
  selector: 'app-demo',
  imports: [Card, Actions],
  template: `
    <app-card>
      <h2 card-title>Hello</h2>
      <p>Body text</p>
      <app-actions />
    </app-card>

    <app-card>
      <p>Only body</p>
    </app-card>

    <app-card>
      <h3 ngProjectAs="[card-title]">Aliased</h3>
    </app-card>
  `,
})
export class Demo {}
```

Every example was checked with Angular 22.2 in a Vitest test that read the DOM. This is the first card (shortened, without Angular's comments and attributes):

```html
<app-card>
  <header><h2 card-title>Hello</h2></header>
  <section><p>Body text</p></section>
  <footer><app-actions><button>OK</button></app-actions></footer>
</app-card>
```

## One slot and select

Everything written between `<app-card>` and `</app-card>` is the component's "content", as opposed to its "view", which is the template. An `<ng-content />` without `select` takes all the content that didn't match another slot, which is why the `<p>` landed in `<section>`. With `select` it takes only what matches a CSS selector, and the [same selectors](https://angular.dev/guide/components/content-projection) are supported as in a component's `selector`: a tag (`app-actions`), an attribute (`[card-title]`) or a class. The `<h2 card-title>` went to `<header>`, and `<app-actions>` to `<footer>`.

An element that matches no slot, when there's no `<ng-content />` without `select`, simply doesn't enter the DOM. In the test, a component with only `<ng-content select="[card-title]" />` received an `<h2 card-title>` and a `<p>`, and only the title was shown. The `<p>` vanished with no error.

## Fallback content

The text inside `<ng-content select="[card-title]">Untitled</ng-content>` is shown when no matching content arrived. In the second card, which has no title, `<header>Untitled</header>` is shown. In the first card the `Hello` title replaces it.

That's what the [guide](https://angular.dev/guide/components/content-projection) says, and in Angular's [changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md) the feature first appears in version 18.0.0.

## ngProjectAs

Sometimes the element you want to project doesn't fit the selector, like an `<h3>` with no `card-title`. `ngProjectAs="[card-title]"` tells Angular to compare against that selector instead of the element's real identity, and the title is projected into `<header>`. The value must be static and can't be bound to an expression. (Note that the attribute stays in the DOM as `ngprojectas`, as the test showed.)

## Projected content belongs to the parent

The content is shown inside the component that receives it, but [it stays owned by the component that wrote it](https://angular.dev/guide/components/content-projection). Two consequences:

- **Its change detection and injection belong to the parent.** Even if the receiving component is OnPush, projected content is checked when the parent is checked, and it gets its dependencies from the parent's injector.
- **`<ng-content>` isn't conditional.** `@if (show()) { <ng-content /> }` only hides the content. Angular creates the projected elements and components anyway: in the test, a projected component was created even though `show()` was `false`. To defer creation, use [`ng-template`](en/posts/angular-ng-template/).

Projected content doesn't suit every library component. The docs warn that components such as menus and tabs find their children directly, and an extra wrapper can break keyboard navigation and ARIA.

### In older versions

Up to version 17, `<ng-content>` had no fallback content, so the "default" was written in code: a query on the content that arrived, and an `@if` next to it. This is how it looks with the `@ContentChild` decorator (today `contentChild()` as a signal is the norm, covered in level 2):

```typescript
import { Component, ContentChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-old-card',
  template: `
    <header>
      <ng-content select="[card-title]" />
      @if (!title) {
        Untitled
      }
    </header>
  `,
})
export class OldCard {
  @ContentChild('title') protected title?: ElementRef;
}

@Component({
  selector: 'app-old-demo',
  imports: [OldCard],
  template: `
    <app-old-card><h2 card-title #title>Hello</h2></app-old-card>
    <app-old-card />
  `,
})
export class OldDemo {}
```

The caller had to add `#title` to its element for the query to find it. The test showed `Hello` and `Untitled`. With fallback, all of it shrinks to text inside `<ng-content>`.

## Mistakes beginners make

- **Projecting content that matches no slot.** It disappears silently. Add an `<ng-content />` without `select`, or use `ngProjectAs`.
- **Wrapping `<ng-content>` in `@if` to avoid creating the content.** It's created anyway.
- **Trying to bind `ngProjectAs` to an expression.** The value must be a static string.

## What's next

From here we move from level 1 to level 2: signals. In the next post, `angular-signals`: how `signal()` and `computed()` hold state that Angular knows has changed.
