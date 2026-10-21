---
title: "Pipes: date, currency and more, and how to write your own"
summary: "The built-in pipes (date, currency, number, json, async and more), parameters and chaining, a custom pipe with @Pipe, and pure vs impure. In older versions: pipes in an NgModule."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 10 }
---

A [pipe](https://angular.dev/guide/templates/pipes) is a function that changes a value for display, written in a template after `|`. The value stays as it is in the class; only what's shown changes.

## The built-in pipes

One component with several of them:

```typescript
// builtin.ts
import { Component } from '@angular/core';
import {
  AsyncPipe,
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
  JsonPipe,
  PercentPipe,
  SlicePipe,
  TitleCasePipe,
  UpperCasePipe,
} from '@angular/common';

@Component({
  selector: 'app-builtin',
  imports: [
    AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe, JsonPipe,
    PercentPipe, SlicePipe, TitleCasePipe, UpperCasePipe,
  ],
  template: `
    <p>{{ price | currency }} | {{ price | currency: 'EUR' : 'symbol' : '1.0-0' }}</p>
    <p>{{ day | date: 'yyyy-MM-dd' : 'UTC' }} | {{ day | date: 'fullDate' : 'UTC' }}</p>
    <p>{{ ratio | percent }} | {{ pi | number: '1.1-3' }}</p>
    <p>{{ title | titlecase }} | {{ title | uppercase | slice: 0 : 5 }}</p>
    <pre>{{ user | json }}</pre>
    <p>{{ greeting | async }}</p>
  `,
})
export class BuiltIn {
  protected readonly price = 1234.5;
  protected readonly day = new Date(Date.UTC(2026, 9, 20));
  protected readonly ratio = 0.256;
  protected readonly pi = Math.PI;
  protected readonly title = 'angular pipes';
  protected readonly user = { name: 'Dana', tags: ['a', 'b'] };
  protected readonly greeting = Promise.resolve('hello');
}
```

```text
$1,234.50 | €1,235
2026-10-20 | Tuesday, October 20, 2026
26% | 3.142
Angular Pipes | ANGUL
{ "name": "Dana", "tags": [ "a", "b" ] }
hello
```

Every example was checked with Angular 22.2 in a Vitest test, and the output is shown with whitespace collapsed. What's worth knowing:

- **Every pipe is imported.** Pipes are classes from `@angular/common` that go in the component's `imports`, like components. The [full list](https://angular.dev/guide/templates/pipes) also includes `lowercase`, `keyvalue`, `i18nPlural` and more.
- **Parameters after `:`.** `currency: 'EUR' : 'symbol' : '1.0-0'` is the currency, the display and the digit format (no cents). `date: 'yyyy-MM-dd' : 'UTC'` is a format and a time zone. The latter removes the dependency on the computer's time zone, which is why the output above is stable.
- **Chaining runs left to right.** `title | uppercase | slice: 0 : 5` uppercases and then takes the first five characters.
- **The format depends on the locale.** The default is `en-US` (`$1,234.50`). Another language is set through the app's locale, see [i18n](en/posts/angular-i18n/).
- **`json` is for debugging.** It prints an object as JSON. `async` reads a value from a Promise or an Observable, and `greeting` here is a Promise.

## A custom pipe

A class with `@Pipe`, a name, and a `transform` method. The first parameter is the value, and the rest are the parameters after `:`:

```typescript
// custom.ts
import { Component, Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(name: string, max = 2): string {
    return name
      .split(' ')
      .slice(0, max)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }
}

@Pipe({ name: 'join' })
export class JoinPipe implements PipeTransform {
  transform(items: string[]): string {
    return items.join(', ');
  }
}

@Pipe({ name: 'joinImpure', pure: false })
export class JoinImpurePipe implements PipeTransform {
  transform(items: string[]): string {
    return items.join(', ');
  }
}

@Component({
  selector: 'app-custom',
  imports: [InitialsPipe, JoinPipe, JoinImpurePipe],
  template: `
    <p>{{ 'Dana Levi Cohen' | initials }} | {{ 'Dana Levi Cohen' | initials: 3 }}</p>
    <p>{{ names | join }} | {{ names | joinImpure }}</p>
    <button (click)="add()">Add</button>
  `,
})
export class Custom {
  protected readonly names = ['Dana'];

  protected add() {
    this.names.push('Avi');
  }
}
```

The first line shows `DL | DLC`: `initials` with the default `max = 2`, and with `initials: 3`. Per the [naming conventions in the docs](https://angular.dev/guide/templates/pipes), the `name` is camelCase with no hyphens, and the class name is the same name in PascalCase with `Pipe` at the end. `implements PipeTransform` makes TypeScript verify the signature of `transform`. If you forget to import the pipe, the build fails:

```text
✘ [ERROR] NG8004: No pipe found with name 'initials'.
```

## Pure vs impure

By default every pipe is **pure**: Angular runs it only when the value passed to it (or its parameters) is replaced, that is, a different primitive or a different reference to an object or array. An array you add an item to in place (`push`) is the same reference, so a pure pipe doesn't update. In the test, after clicking `Add`:

```text
Dana | Dana, Avi
```

`join` (pure) still shows `Dana`, and `joinImpure` (with `pure: false`) shows `Dana, Avi`. The [docs](https://angular.dev/guide/templates/pipes) warn that an impure pipe can hurt performance significantly, and suggest putting `Impure` in its name. The preferred fix: create a new array (`this.names = [...this.names, 'Avi']`) and stay with a regular pipe.

### In older versions

Before version 19, a pipe wasn't standalone by default; it was registered in the `declarations` of an NgModule, and to use it you imported the module:

```typescript
@Pipe({ name: 'shout', standalone: false })
class ShoutPipe implements PipeTransform {
  transform(value: string): string {
    return value.toUpperCase() + '!';
  }
}

@Component({ selector: 'app-shout', template: `{{ 'hey' | shout }}`, standalone: false })
class ShoutComponent {}

@NgModule({ declarations: [ShoutPipe, ShoutComponent], exports: [ShoutComponent] })
class ShoutModule {}
```

This code also works on 22.2 (the test showed `HEY!`), but today `standalone: false` has to be written explicitly. Code from versions 14 to 18 sometimes has `standalone: true` on every pipe, which you can remove.

## Mistakes beginners make

- **Mutating an array in place and expecting the pipe to update.** Create a new array instead of `push`, or move to a signal.
- **Using an impure pipe by default.** It can hurt performance. Filter and sort in a `computed` in the class.
- **Expecting an Israeli format without setting a locale.** `date` and `currency` use `en-US` unless you configure otherwise.

## What's next

Next, the last post of this level: projecting content with `<ng-content>`, so a component can receive content from outside.
