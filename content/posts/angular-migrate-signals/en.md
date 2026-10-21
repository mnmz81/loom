---
title: "Signal migrations: inputs, outputs, queries, inject and control flow"
summary: "Five @angular/core schematics that move a decorator-based component to Angular 22 style: input(), output(), viewChild(), inject() and @if/@for. A real run, the result, and what they don't move."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 82 }
---

After [moving to standalone](en/posts/angular-migrate-standalone/) the code is still written with decorators: `@Input`, `@Output`, `@ViewChild`, constructor injection and `*ngIf`. Each has a migration in `@angular/core`. This post runs all of them on one component.

Every example was checked with Angular 22.2 and Vitest.

## The component before

```typescript
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { TodoStore } from './todo-store';

@Component({
  selector: 'app-todo-list',
  imports: [NgIf, NgFor],
  template: `
    <h2>{{ title }}</h2>
    <input #box />
    <ul *ngIf="store.items.length; else empty">
      <li *ngFor="let item of store.items">{{ item }}</li>
    </ul>
    <ng-template #empty><p>Nothing yet</p></ng-template>
    <button (click)="add()">Add</button>
  `,
})
export class TodoList {
  @Input() title = 'Todos';
  @Output() added = new EventEmitter<string>();
  @ViewChild('box') box!: ElementRef<HTMLInputElement>;

  constructor(public store: TodoStore) {}

  add() {
    const text = this.box.nativeElement.value;
    this.store.items.push(text);
    this.added.emit(text);
  }
}
```

A Vitest test sets `title`, clicks the button and checks the heading, the list and the value sent through `added`. It passed before the migrations and after them, and the migrations didn't change it.

## Inputs, outputs and queries

```bash
ng generate @angular/core:signal-input-migration
ng generate @angular/core:output-migration
ng generate @angular/core:signal-queries-migration
```

```text
    Successfully migrated to signal inputs 🎉
      -> Migrated 1/1 inputs.
    Successfully migrated to outputs as functions 🎉
      -> Migrated 1 out of 1 detected outputs (100.00 %).
    Successfully migrated to signal queries 🎉
      -> Migrated 1/1 queries.
```

(The output is shortened to the summary lines.) All three migrations also update the code that uses the field, not only the declaration:

- `@Input() title` became `readonly title = input('Todos')`, and `{{ title }}` in the template became `{{ title() }}` ([inputs](en/posts/angular-inputs/)).
- `@Output() added = new EventEmitter<string>()` became `readonly added = output<string>()`. The `emit` call stayed ([outputs](en/posts/angular-outputs-model/)).
- `@ViewChild('box') box!` became `viewChild.required(...)`, and `this.box.nativeElement` became `this.box().nativeElement` ([queries](en/posts/angular-queries/)).

The `ng generate @angular/core:signals` schematic runs these three migrations together (`--migrations` picks some of them). Each one is documented on its own page under [Migrations](https://angular.dev/reference/migrations).

## inject() and control flow

```bash
ng generate @angular/core:inject-migration
ng generate @angular/core:control-flow-migration
```

The [inject migration](https://angular.dev/reference/migrations/inject-function) replaced `constructor(public store: TodoStore) {}` with a `store = inject(TodoStore)` field and deleted the empty constructor. The [control flow migration](https://angular.dev/reference/migrations/control-flow) replaced `*ngIf` and `*ngFor` with `@if` and `@for`, and removed `NgIf` and `NgFor` from `imports`.

## The result

```typescript
import { Component, ElementRef, input, output, viewChild, inject } from '@angular/core';

import { TodoStore } from './todo-store';

@Component({
  selector: 'app-todo-list',
  imports: [],
  template: `
    <h2>{{ title() }}</h2>
    <input #box />
    @if (store.items.length) {
      <ul>
        @for (item of store.items; track item) {
          <li>{{ item }}</li>
        }
      </ul>
    } @else {
      <p>Nothing yet</p>
    }
    <button (click)="add()">Add</button>
  `,
})
export class TodoList {
  store = inject(TodoStore);

  readonly title = input('Todos');
  readonly added = output<string>();
  readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');

  add() {
    const text = this.box().nativeElement.value;
    this.store.items.push(text);
    this.added.emit(text);
  }
}
```

The test passed on this code too. Three things are left to do by hand:

- `track item` tracks the value itself. If the same text can appear twice, a unique id is better ([control flow](en/posts/angular-control-flow/)).
- `store` stayed a public, writable field. Per the [style guide](https://angular.dev/style-guide), `protected readonly` is better.
- `TodoStore` still holds a plain array that `push` changes. For OnPush to work without relying on events, it has to become a signal, and that change has no migration.

## What the migrations don't move

The default is cautious: whatever isn't safe to move stays as it is. Per the [signal inputs docs](https://angular.dev/reference/migrations/signal-inputs), for example, an input your code writes to (`this.title = ...`) isn't migrated, because you can't write to an `input()`. Two options change this:

- `--insert-todos` adds a TODO comment with the reason above each field that wasn't migrated.
- `--best-effort-mode` migrates as much as possible, even at the cost of a broken build.

The input, output and query migrations also take `--path`, and `--dry-run` shows what would change without writing. Per the same page, the signal input migration is also available as a refactor action in Angular's VS Code extension.

## Mistakes beginners make

- **Running everything on the whole project at once.** With `--path` and a commit after each migration, every diff is easier to review.
- **Not reading the summary line.** In a real project not every field gets migrated, and you find the ones left behind with `--insert-todos`.
- **Not running the tests after each step.** The migration also changes code that reads the fields, and a mistake there only shows up in a test.

## What's next

Next, the last post in the series: Angular and AI tools. The Angular CLI's MCP server and the files angular.dev publishes for language models.
