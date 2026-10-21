---
title: "Control flow in templates: @if, @for and @switch"
summary: "Show, hide and repeat content in a template with @if, @else, @for with track and @empty, and @switch with exhaustiveness checking. In older versions: *ngIf, *ngFor and trackBy."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 6 }
---

[Control flow](https://angular.dev/guide/templates/control-flow) is blocks in the template that decide what to show and how many times. They're part of the template syntax itself, so there's nothing to import. One component uses all three:

```typescript
// tasks.ts
import { Component, signal } from '@angular/core';

type Task = { id: number; title: string; status: 'todo' | 'doing' | 'done' };

@Component({
  selector: 'app-tasks',
  template: `
    @if (tasks().length > 2) {
      <p>Busy day: {{ tasks().length }} tasks</p>
    } @else if (tasks().length > 0) {
      <p>{{ tasks().length }} tasks</p>
    } @else {
      <p>Nothing to do</p>
    }

    @if (tasks()[0]; as next) {
      <p>Next: {{ next.title }}</p>
    }

    <ul>
      @for (task of tasks(); track task.id; let i = $index, isLast = $last) {
        <li>
          {{ i + 1 }}. {{ task.title }}
          @switch (task.status) {
            @case ('todo') {
              <b>to do</b>
            }
            @case ('doing') {
              <b>in progress</b>
            }
            @default {
              <b>done</b>
            }
          }
          @if (isLast) {
            <i>(last)</i>
          }
        </li>
      } @empty {
        <li>The list is empty</li>
      }
    </ul>

    <button (click)="clear()">Clear</button>
  `,
})
export class Tasks {
  protected readonly tasks = signal<Task[]>([
    { id: 1, title: 'Write post', status: 'doing' },
    { id: 2, title: 'Review', status: 'todo' },
    { id: 3, title: 'Publish', status: 'done' },
  ]);

  protected clear() {
    this.tasks.set([]);
  }
}
```

Every example in this post was checked with Angular 22.2 in a Vitest test, including a test after clicking `Clear`, which showed the `@empty` block.

## @if, @else if and @else

`@if (condition) { ... }` shows its content when the condition is true. After it you can chain several `@else if` and one `@else`. In `@if (tasks()[0]; as next)`, `as` saves the expression's result in the variable `next` for use inside the block, which helps when the expression is long. After `Clear` the list is empty, `tasks()[0]` is `undefined`, and the block isn't shown.

## @for and track

`@for (task of tasks(); track task.id) { ... }` repeats for each item in a collection. `track` is **required**, and without it the build fails:

```text
✘ [ERROR] NG5002: @for loop must have a "track" expression
```

The `track` expression links each piece of data to its DOM node, so when the list changes Angular moves, adds and removes only what it must instead of rebuilding everything. The [docs recommend](https://angular.dev/guide/templates/control-flow) tracking a property that uniquely identifies each item, such as `id`. For [static collections](https://angular.dev/guide/templates/control-flow) that never change, `track $index` is fine. `track item` tracks by object identity, and is best avoided, because every new object rebuilds its DOM.

Inside `@for` there are ready-made variables: `$count`, `$index`, `$first`, `$last`, `$even` and `$odd`. You can alias them with `let`, as in `let i = $index, isLast = $last` above. Aliasing mostly helps in nested loops, so the inner loop can read the outer one's `$index`. The alias must point directly at the variable: `let n = $index + 1` fails with `Unrecognized for loop context variable n`, which is why the example writes `{{ i + 1 }}`.

`@empty` comes right after the `@for` content and is shown when there are no items. `@for` has no `break` or `continue`; to skip items, filter the collection first.

## @switch

`@switch` compares a value to each `@case` with `===`, and has no fallthrough, so there's no need for `break`. `@default` is shown when no `@case` matched, and without a `@default` nothing is shown.

Several `@case` blocks in a row before one block let several values share content. And for exhaustiveness checking, `@default never;` tells Angular to verify at compile time that every value of the union is handled. Here's a component that handles three states, and joins two of them with two consecutive `@case`:

```typescript
// status.ts
import { Component, input } from '@angular/core';

type Status = 'loggedOut' | 'loading' | 'loggedIn';

@Component({
  selector: 'app-status',
  template: `
    @let s = state();
    @switch (s) {
      @case ('loggedOut') {
        <button>Login</button>
      }
      @case ('loading')
      @case ('loggedIn') {
        <p>Please wait or welcome</p>
      }
      @default never;
    }
  `,
})
export class StatusView {
  readonly state = input.required<Status>();
}
```

The component compiles. If you delete `@case ('loggedIn')`, the build fails, because `'loggedIn'` is left over for the `@default never` block:

```text
✘ [ERROR] TS2322: Type '"loggedIn"' is not assignable to type 'never'.
```

The check works only on a variable, not on a signal call. That's why `@let s = state();` comes first, and only then `@switch (s)`. ([`@let`](en/posts/angular-template-expressions/) is covered in the next post.) The consecutive-`@case` form and `@default never` appear in the [current guide](https://angular.dev/guide/templates/control-flow) and compiled on 22.2; I didn't check which version added them.

### In older versions

Before version 17, control flow was done with directives, `*ngIf` and `*ngFor`, and with `[ngSwitch]`. `*ngIf` and `*ngFor` are [deprecated since version 20](https://angular.dev/api/common/NgIf), and need to be imported (or `CommonModule` in an NgModule). The same task list in the old style, without the signal:

```typescript
import { Component } from '@angular/core';
import { NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';

type Task = { id: number; title: string; status: 'todo' | 'doing' | 'done' };

@Component({
  selector: 'app-tasks-old',
  imports: [NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault],
  template: `
    <p *ngIf="tasks.length > 0; else empty">{{ tasks.length }} tasks</p>
    <ng-template #empty><p>Nothing to do</p></ng-template>

    <ul>
      <li *ngFor="let task of tasks; trackBy: trackById; let i = index; let last = last">
        {{ i + 1 }}. {{ task.title }}
        <ng-container [ngSwitch]="task.status">
          <b *ngSwitchCase="'todo'">to do</b>
          <b *ngSwitchCase="'doing'">in progress</b>
          <b *ngSwitchDefault>done</b>
        </ng-container>
        <i *ngIf="last">(last)</i>
      </li>
    </ul>
  `,
})
export class TasksOld {
  protected tasks: Task[] = [
    { id: 1, title: 'Write post', status: 'doing' },
    { id: 2, title: 'Review', status: 'todo' },
  ];

  protected trackById(_index: number, task: Task) {
    return task.id;
  }
}
```

The differences: `else` points to a named `<ng-template>` instead of an `@else` block, `trackBy` takes a function (and without it Angular tracks by object identity) instead of an expression, and it's `index` and `last` instead of `$index` and `$last`. All of this was checked and works on 22.2.

The [migration schematic](https://angular.dev/reference/migrations/control-flow) converts a whole project:

```bash
ng generate @angular/core:control-flow
```

Run on the old component, it replaced every directive with blocks and removed them from `imports`. It converted `trackBy: trackById` into `track trackById(i, task)`, which works, but is better replaced with `track task.id`.

## Mistakes beginners make

- **Forgetting `track`.** It's a compile error, and the fix is `track item.id`.
- **`track item` on objects that are recreated.** If the list arrives from the server as new objects every time, the whole DOM is rebuilt. Track by `id`.

## What's next

Next: what you can write inside `{{ }}` and inside bindings, `@let`, `?.`, and what's not allowed.
