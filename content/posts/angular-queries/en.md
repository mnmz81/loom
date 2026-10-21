---
title: "Queries in Angular: viewChild, viewChildren, contentChild and contentChildren"
summary: "How a component reaches elements and components in its template and projected content: viewChild and contentChild as signals, required, the read option, and the old @ViewChild with ngAfterViewInit."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 17 }
---

Sometimes a component needs a direct reference to something in its template: move focus to a field, read a child component's state, know which tabs were projected into it. [Queries](https://angular.dev/guide/components/queries) return those references as signals that update when the template changes.

Every example was checked with Angular 22.2.

## viewChild: an element from the template

```typescript
import { Component, ElementRef, afterNextRender, viewChild } from '@angular/core';

@Component({
  selector: 'app-search-field',
  template: `<input #box placeholder="Search" />`,
})
export class SearchField {
  private readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');

  constructor() {
    afterNextRender(() => this.box().nativeElement.focus());
  }
}
```

`viewChild('box')` looks in the component's template for the `#box` template reference and returns an `ElementRef` wrapping the element. `afterNextRender` runs the code after the template is in the DOM (details in the post on the [lifecycle](en/posts/angular-lifecycle/)), so the field gets focus as soon as the component is shown.

A query that finds nothing returns `undefined`, for example when the element is inside an `@if` that is currently false, so the regular type includes `undefined`. [`viewChild.required`](https://angular.dev/guide/components/queries#required-queries) fits when the element always exists: the type has no `undefined`, and if there's no result Angular throws an error. You can look up a template reference or a component or directive class, but not a CSS selector.

## viewChildren: several components

```typescript
import { Component, computed, input, model, viewChildren } from '@angular/core';

@Component({
  selector: 'app-task',
  template: `<label><input type="checkbox" [checked]="done()" (change)="done.set(!done())" /> {{ title() }}</label>`,
})
export class Task {
  readonly title = input.required<string>();
  readonly done = model(false);
}

@Component({
  selector: 'app-checklist',
  imports: [Task],
  template: `
    @for (title of titles; track title) {
      <app-task [title]="title" />
    }
    <p>{{ doneCount() }} of {{ tasks().length }} done</p>
  `,
})
export class Checklist {
  protected readonly titles = ['Install', 'Build', 'Deploy'];
  private readonly tasks = viewChildren(Task);
  protected readonly doneCount = computed(() => this.tasks().filter((t) => t.done()).length);
}
```

`viewChildren(Task)` returns a signal of an array with every `Task` instance in the template. The `computed` reads both the array and each task's `done()`, so it updates when a task is checked and when `@for` adds or removes one. After checking two tasks it shows `2 of 3 done`. View queries don't enter another component's template: `Checklist` sees `<app-task>`, not the checkbox inside it.

## contentChildren: what the parent projected

```typescript
import { Component, contentChildren, input, signal } from '@angular/core';

@Component({
  selector: 'app-tab',
  template: `@if (active()) { <ng-content /> }`,
})
export class Tab {
  readonly title = input.required<string>();
  readonly active = signal(false);
}

@Component({
  selector: 'app-tabs',
  template: `
    @for (tab of tabs(); track tab) {
      <button (click)="select(tab)">{{ tab.title() }}</button>
    }
    <ng-content />
  `,
})
export class Tabs {
  protected readonly tabs = contentChildren(Tab);

  protected select(selected: Tab) {
    for (const tab of this.tabs()) tab.active.set(tab === selected);
  }
}

@Component({
  selector: 'app-settings',
  imports: [Tabs, Tab],
  template: `
    <app-tabs>
      <app-tab title="Profile">Profile form</app-tab>
      <app-tab title="Billing">Billing details</app-tab>
    </app-tabs>
  `,
})
export class Settings {}
```

The `<app-tab>` elements aren't in the template of `Tabs` but in the content its parent passed in, so you find them with [`contentChildren`](https://angular.dev/guide/components/queries#content-queries) (for `<ng-content>`, see the [post on content projection](en/posts/angular-content-projection/)). `Tabs` builds a button per tab, and clicking `Billing` shows `Billing details` and hides `Profile form`. By default `contentChildren` finds only direct children, and `descendants: true` widens the search. `contentChild` (singular) searches all the way down by default.

## The read option

```typescript
import { Component, ElementRef, afterNextRender, viewChild } from '@angular/core';
import { Tab } from './tabs';

@Component({
  selector: 'app-read-demo',
  imports: [Tab],
  template: `<app-tab #tab title="Intro">Hello</app-tab>`,
})
export class ReadDemo {
  private readonly tab = viewChild.required('tab', { read: ElementRef });
  private readonly tabComponent = viewChild.required(Tab);

  constructor() {
    afterNextRender(() => {
      console.log(this.tab().nativeElement.tagName, this.tabComponent().title());
    });
  }
}
```

```text
APP-TAB Intro
```

On a component's element, a query returns the component instance by default. [`read`](https://angular.dev/guide/components/queries#reading-specific-values-from-an-elements-injector) picks a different value from the same element. Here `read: ElementRef` returns the `<app-tab>` DOM element, while `viewChild(Tab)` returns the component. The common uses are `ElementRef` and `TemplateRef`.

### In older versions

Signal queries arrived in version 17.2 and were marked stable in version 19 ([changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md)). Before that you used [decorators](https://angular.dev/guide/components/queries#decorator-based-queries), and the result was available only from `ngAfterViewInit`:

```typescript
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-search-field-old',
  template: `<input #box placeholder="Search" />`,
})
export class SearchFieldComponent implements AfterViewInit {
  @ViewChild('box') box!: ElementRef<HTMLInputElement>;

  ngAfterViewInit() {
    this.box.nativeElement.focus();
  }
}
```

Before `ngAfterViewInit` the value is `undefined`. `{ static: true }` moved it up to `ngOnInit`, provided the element isn't inside a condition, but a static result doesn't update afterwards. `@ViewChildren` and `@ContentChildren` returned a `QueryList` with a `changes` stream to subscribe to, and `@ContentChild` worked in `ngAfterContentInit`. The decorators are still supported, and the `signal-queries-migration` migration converts them.

## Mistakes beginners make

- **Reading a query in the constructor.** The template doesn't exist yet: a regular query returns `undefined` there, and for `viewChild.required` the build fails with `NG8118`. Read it in the template, a `computed`, an `effect` or `afterNextRender`.
- **Using a view query for something the parent passed in.** Projected content is found with `contentChild`.
- **Writing state into a child through a query.** [Per the docs](https://angular.dev/guide/components/queries#common-query-pitfalls) this leads to brittle code and `ExpressionChangedAfterItHasBeenChecked` errors. Data goes to a child through an input.

## What's next

Next: the component lifecycle, from the constructor and `ngOnInit` to `DestroyRef` and `afterNextRender`.
