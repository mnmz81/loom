---
title: "Change detection in Angular: how the screen knows to update"
summary: "What change detection is: the component tree, checking bindings, dirty views, and what schedules a check in Angular 22: signals, template events, markForCheck, AsyncPipe and setInput."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 20 }
---

A template shows data from the component class. When the data changes, something has to update the DOM. In Angular that process is called change detection, and the docs define it as ["the process through which Angular checks to see whether your application state has changed, and if any DOM needs to be updated"](https://angular.dev/best-practices/runtime-performance).

Every example was checked with Angular 22.2 and Vitest 5.

## The component tree

An app is a tree of components, and every component owns a view: the DOM of its template and the bindings in it (`{{ }}`, `[prop]`). This is the tree the docs use as an example:

```text
AppComponent
├── HeaderComponent
│   └── SearchComponent
└── MainComponent
    ├── LoginComponent
    └── DetailsComponent
```

A check walks the tree from the root down. In every view it enters, Angular re-evaluates each binding, compares it with the previous value, and touches the DOM only where the value changed. Which views get entered depends on each component's strategy, [OnPush](en/posts/angular-onpush/) or [Eager](en/posts/angular-eager-strategy/).

## A check runs only after a notification

Angular 22 runs no checks "just in case". A check is scheduled only when something tells Angular that state changed:

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-score',
  template: `<p>{{ label }}: {{ score() }}</p>`,
})
export class Score {
  label = 'Score';
  readonly score = signal(0);
}
```

The test changes the plain field first, then the signal:

```typescript
import { TestBed } from '@angular/core/testing';
import { Score } from './score';

it('renders only after a notification', async () => {
  const fixture = TestBed.createComponent(Score);
  await fixture.whenStable();
  const text = () => fixture.nativeElement.textContent;
  console.log('1.', text());

  fixture.componentInstance.label = 'Points';
  await fixture.whenStable();
  console.log('2.', text());

  fixture.componentInstance.score.set(5);
  await fixture.whenStable();
  console.log('3.', text());
  expect(text()).toBe('Points: 5');
});
```

```text
1. Score: 0
2. Score: 0
3. Points: 5
```

In step 2 `label` changed, but nobody said so, so no check ran. In step 3 `score.set` marked the view dirty and scheduled a check. The check re-evaluated **all** the view's bindings, so `Points` showed up too. The notification decides when and which view; the check itself reads the current values.

## What schedules a check

According to the [zoneless guide](https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility), these are the notifications Angular listens to:

| Notification | Example |
|---|---|
| A signal read in the template changes | `score.set(5)` |
| A template or host listener runs | `(click)="save()"` |
| `ChangeDetectorRef.markForCheck()` | after changing a plain field by hand |
| `AsyncPipe` | `{{ user$ \| async }}` calls `markForCheck` itself |
| `ComponentRef.setInput()` | a component created in code |
| Attaching a view marked dirty by one of these | |

Each of them marks a view as "dirty", meaning it needs re-rendering. [`markForCheck`](https://angular.dev/api/core/ChangeDetectorRef) does that explicitly; the others do it for you. Signals are covered in the [signals post](en/posts/angular-signals/).

### In older versions

Before v21, Zone.js scheduled the checks: after every async event (a click, a `setTimeout`, an HTTP response) Angular checked the tree from the root, whether anything changed or not. In a component using the old strategy, the `label` change from step 2 would have appeared on the next async event, with no notification at all. How that worked is in [the next post](en/posts/angular-zone-js/).

## Mistakes beginners make

- **Changing a plain field inside `setTimeout` or `subscribe` and expecting the screen to update.** No notification, no check. A signal fixes it.
- **Thinking a check re-renders the whole page.** It re-evaluates bindings, but touches the DOM only where a value changed.
- **Calling `fixture.detectChanges()` in every test.** It runs a check even when Angular wouldn't have scheduled one, and hides a missing notification. [The docs](https://angular.dev/guide/zoneless#using-zoneless-in-testbed) recommend `await fixture.whenStable()`.

## What's next

Next post: Zone.js, the way Angular apps knew something changed before zoneless, and how existing apps still run on it.
