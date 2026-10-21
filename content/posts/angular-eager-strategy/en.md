---
title: "ChangeDetectionStrategy.Eager: the old default strategy"
summary: "Eager, called Default until v22, checks a component every time a check reaches it. How it differs from OnPush in a real tree, when you still need it, and why Default is deprecated."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 22 }
---

Every component has a change detection strategy, which decides when it is checked as a check walks the tree. Until v21 the default was called `Default`. In v22 it is called `Eager`, and it is no longer the default.

Every example was checked with Angular 22.2 and Vitest 5.

## Two values and an old name

According to [the API](https://angular.dev/api/core/ChangeDetectionStrategy), `ChangeDetectionStrategy` has three names today:

| Value | Meaning |
|---|---|
| `OnPush` | The default since v22. Checked only in certain cases: a new input, an event, a signal, `markForCheck` |
| `Eager` | Checked every time a check reaches it |
| `Default` | Deprecated. Equivalent to `Eager` and "due to be removed" |

`Eager` was added as an alias for `Default` in v21.2 ([changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#2120-2026-02-25)). `ng generate component` knows only the first two as well: `--change-detection` accepts `Eager` or `OnPush`, and the default is `OnPush`.

## Eager vs OnPush in the same tree

Two identical components that each record every time their template is evaluated, next to a button that changes a signal in the parent:

```typescript
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

export const checks: string[] = [];

@Component({
  selector: 'app-eager-panel',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `{{ check('eager') }}`,
})
export class EagerPanel {
  check(name: string) {
    checks.push(name);
    return name;
  }
}

@Component({
  selector: 'app-onpush-panel',
  template: `{{ check('onpush') }}`,
})
export class OnPushPanel extends EagerPanel {}

@Component({
  selector: 'app-dashboard',
  imports: [EagerPanel, OnPushPanel],
  template: `
    <button (click)="clicks.set(clicks() + 1)">{{ clicks() }}</button>
    <app-eager-panel />
    <app-onpush-panel />
  `,
})
export class Dashboard {
  protected readonly clicks = signal(0);
}
```

`OnPushPanel` inherits the class but not the decorator, so it is OnPush, the default. The test clicks the button:

```typescript
import { TestBed } from '@angular/core/testing';
import { checks, Dashboard } from './dashboard';

it('checks the Eager panel on every pass', async () => {
  const fixture = TestBed.createComponent(Dashboard);
  await fixture.whenStable();
  console.log('first render:', checks.join(', '));

  checks.length = 0;
  fixture.nativeElement.querySelector('button').click();
  await fixture.whenStable();
  console.log('after click: ', checks.join(', '));
  expect(checks).not.toContain('onpush');
});
```

```text
first render: eager, onpush
after click:  eager
```

The click marked `Dashboard` for checking. When the check reached the children, the Eager panel was re-evaluated even though nothing of its own changed, and the OnPush panel was skipped: it got no new input and no event happened inside it. [The docs](https://angular.dev/best-practices/skipping-subtrees#an-event-is-handled-by-a-component-with-eager-change-detection) describe exactly this. In a large tree, every Eager component is evaluated on every check that passes through it, with all its bindings.

The function in the template is only there to make the checks visible: it runs every time the view is checked, so real code should use a signal or `computed`.

## When Eager still fits

- **Code after `ng update` to v22.** The migration adds `Eager` to every component without an explicit strategy, so behavior doesn't change. [The post on OnPush by default](en/posts/angular-onpush-default-v22/) shows it.
- **A library that hosts user components** with `ViewContainerRef.createComponent`. According to the [zoneless guide](https://angular.dev/guide/zoneless#onpush-compatible-components), if those components might be Eager, the host can't be OnPush.
- **A helper component that exists only in tests.** The same guide allows `Eager` for it.

`Eager` only decides *who* is checked once a check is already running. In a zoneless app it doesn't schedule checks, so it doesn't bring back automatic updates after `setTimeout`. [The zoneless post](en/posts/angular-zoneless/) demonstrates it.

### In older versions

Before v22, leaving out `changeDetection` was equivalent to this:

```typescript
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-legacy-widget',
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<p>{{ title }}</p>`,
})
export class LegacyWidget {
  title = 'Old code';
}
```

This code still compiles in 22.2, but `Default` is marked deprecated. `ng update` to v22 replaces it with `ChangeDetectionStrategy.Eager`.

## Mistakes beginners make

- **Adding `Eager` to "fix" a component that doesn't update in a zoneless app.** It doesn't help. A notification is missing: a signal or `markForCheck`.
- **Writing `Default` in new code.** It is deprecated and due to be removed. When you really need that behavior, write `Eager`.

## What's next

Next post: OnPush, the default strategy, the rules that decide when a component is checked, and the mutation trap.
