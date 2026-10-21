---
title: "ng-template, ngTemplateOutlet and ng-container"
summary: "How to define a piece of template with <ng-template>, render it several times with ngTemplateOutlet and a context, pass it to another component, and what <ng-container> does."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 8 }
---

Sometimes the same piece of template has to appear in several places, or another component has to decide how to draw it. Three tools cover that: `<ng-template>` defines a piece that isn't shown right away, `ngTemplateOutlet` renders it, and `<ng-container>` is the place where it's rendered.

Every example was checked with Angular 22.2: a Vitest test read the resulting HTML.

## ng-template and context

[`<ng-template>`](https://angular.dev/guide/templates/ng-template) defines a *template fragment*: content that isn't rendered where you wrote it. To render it you need a reference to it (a `TemplateRef`), and one way to get one is a template variable, `#badge`. `NgTemplateOutlet` renders the fragment in an `<ng-container>`:

```typescript
// badges.ts
import { Component, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-badges',
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #badge let-label let-count="count">
      <b>{{ label }}: {{ count }} ({{ owner }})</b>
    </ng-template>

    <p>Inbox <ng-container [ngTemplateOutlet]="badge" [ngTemplateOutletContext]="{ $implicit: 'new', count: unread() }" /></p>
    <p>Drafts <ng-container *ngTemplateOutlet="badge; context: { $implicit: 'old', count: 2 }" /></p>
  `,
})
export class Badges {
  protected readonly owner = 'Badges';
  protected readonly unread = signal(5);
}
```

The resulting DOM:

```html
<p>Inbox <b>new: 5 (Badges)</b></p><p>Drafts <b>old: 2 (Badges)</b></p>
```

A few things happen here:

- **The fragment is rendered twice**, once in each `<ng-container>`. The fragment itself isn't rendered in place.
- **`ngTemplateOutletContext` is a parameters object.** On `<ng-template>`, each parameter is an attribute with the `let-` prefix. `let-count="count"` reads the `count` key from the context, and `let-label` with no value reads the special key `$implicit`.
- **Two syntaxes for the same thing.** `[ngTemplateOutlet]` and `[ngTemplateOutletContext]` are two regular inputs. `*ngTemplateOutlet="badge; context: {...}"` is the [shorthand](https://angular.dev/api/common/NgTemplateOutlet) with the asterisk. `*ngTemplateOutlet` is not deprecated, unlike `*ngIf` and `*ngFor`.
- **Expressions in the fragment run against the component that declared it**, not the place where it's rendered. `{{ owner }}` shows `Badges` in both cases.

If you forget to import `NgTemplateOutlet`, the build fails:

```text
✘ [ERROR] NG8002: Can't bind to 'ngTemplateOutlet' since it isn't a known property of 'ng-container'.
```

## ng-container

[`<ng-container>`](https://angular.dev/guide/templates/ng-container) groups elements or marks a place in the template without creating a real element in the DOM: the HTML above has no `ng-container` tag. It fits as the host of an outlet (as here, and also of `ngComponentOutlet`, which renders a dynamic component, see [dynamic components](en/posts/angular-dynamic-components/)), and as a place to attach a directive without an extra element. Angular ignores attribute bindings and event listeners written on it.

## Passing a template to another component

The real power of `TemplateRef` is that it can be passed as an input. A list component decides *what* to show, and the caller decides *how* to draw each row:

```typescript
// list.ts
import { Component, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

type RowContext = { $implicit: string; index: number };

@Component({
  selector: 'app-list',
  imports: [NgTemplateOutlet],
  template: `
    <ul>
      @for (item of items(); track item) {
        <li>
          <ng-container
            [ngTemplateOutlet]="row() ?? plain"
            [ngTemplateOutletContext]="{ $implicit: item, index: $index }"
          />
        </li>
      }
    </ul>
    <ng-template #plain let-item>{{ item }}</ng-template>
  `,
})
export class List {
  readonly items = input<string[]>([]);
  readonly row = input<TemplateRef<RowContext>>();
}

@Component({
  selector: 'app-names',
  imports: [List],
  template: `
    <app-list [items]="names" />
    <app-list [items]="names" [row]="numbered" />
    <ng-template #numbered let-name let-i="index">{{ i + 1 }}. <b>{{ name }}</b> ({{ team }})</ng-template>
  `,
})
export class Names {
  protected readonly names = ['Dana', 'Avi'];
  protected readonly team = 'Names';
}
```

```html
<app-list><ul><li>Dana</li><li>Avi</li></ul></app-list>
<app-list><ul><li>1. <b>Dana</b> (Names)</li><li>2. <b>Avi</b> (Names)</li></ul></app-list>
```

The first list uses the default `plain` template, and the second uses the caller's. `{{ team }}` comes from `Names`, even though the row is drawn inside `List`. The docs point out that this is how, for example, Angular Material's tabs and table are built. You can also get a `TemplateRef` in code with `viewChild` (see [queries](en/posts/angular-queries/)) and render it with `ViewContainerRef`.

### In older versions

Up to version 17, the most common use of `<ng-template>` was the `else` of `*ngIf`, which points to a named fragment:

```html
<p *ngIf="user; else guest">Hello, {{ user.name }}</p>
<ng-template #guest><p>Hello, guest</p></ng-template>
```

It was replaced by `@if ... @else` ([control flow](en/posts/angular-control-flow/)). `*ngIf` is syntactic sugar: Angular wraps the element in an `<ng-template>` behind the scenes, which is what the asterisk is for (see [structural directives](en/posts/angular-structural-directives/)).

## Mistakes beginners make

- **Expecting the content of an `<ng-template>` to show up by itself.** Without an outlet (or code that renders it) it doesn't appear in the DOM.
- **Forgetting to import `NgTemplateOutlet`.** That's the `NG8002` error above.
- **Writing `let-count` when you want the `count` key.** `let-count` with no value reads `$implicit`. To read `count`, write `let-count="count"`.

## What's next

Next: styling components, view encapsulation, `:host` and `[class]`.
