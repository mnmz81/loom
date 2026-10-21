---
title: "OnPush in Angular: when a component is checked"
summary: "The rules of OnPush, the default strategy since v22: a new input reference, events, signals, markForCheck and the async pipe. Plus the mutation trap, with a demo that runs."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 23 }
---

Since v22, [OnPush is the default](https://angular.dev/best-practices/skipping-subtrees#using-onpush): a component is checked only in certain cases. Knowing those cases solves most "the screen doesn't update" bugs.

Every example was checked with Angular 22.2 and Vitest 5.

## The rules

An OnPush component is checked when:

1. **An input gets a new value from a template binding.** Angular compares the old and new value with `Object.is`, that is by reference, not by content.
2. **An event is handled in it or in one of its descendants**: an event binding, an output or `@HostListener`. The event marks all its ancestors too.
3. **A signal its template reads changes.**
4. **Someone calls `ChangeDetectorRef.markForCheck()`** inside it.
5. **`AsyncPipe` receives a new value.** It calls `markForCheck` itself.

The first two rules are in [the OnPush docs](https://angular.dev/best-practices/skipping-subtrees), the last three in [the zoneless guide](https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility). Anything else, such as a plain field changed inside `setTimeout`, doesn't cause a check.

## The mutation trap

A parent passes an object to a child through an [input](en/posts/angular-inputs/), and has two ways to change the name:

```typescript
import { Component, input } from '@angular/core';

interface User {
  name: string;
}

@Component({
  selector: 'app-badge',
  template: `<span>{{ user().name }}</span>`,
})
export class Badge {
  readonly user = input.required<User>();
}

@Component({
  selector: 'app-profile',
  imports: [Badge],
  template: `
    <app-badge [user]="user" />
    <button (click)="mutate()">Mutate</button>
    <button (click)="replace()">Replace</button>
  `,
})
export class Profile {
  protected user: User = { name: 'Dana' };

  mutate() {
    this.user.name = 'Noa';
  }

  replace() {
    this.user = { ...this.user };
  }
}
```

```typescript
import { TestBed } from '@angular/core/testing';
import { Profile } from './profile';

it('ignores mutation, sees a new reference', async () => {
  const fixture = TestBed.createComponent(Profile);
  await fixture.whenStable();
  const el: HTMLElement = fixture.nativeElement;
  const [mutate, replace] = el.querySelectorAll('button');

  mutate.click();
  await fixture.whenStable();
  console.log('after mutate: ', el.querySelector('span')!.textContent);

  replace.click();
  await fixture.whenStable();
  console.log('after replace:', el.querySelector('span')!.textContent);
  expect(el.querySelector('span')!.textContent).toBe('Noa');
});
```

```text
after mutate:  Dana
after replace: Noa
```

The Mutate click is an event in `Profile`, so `Profile` is checked. But `[user]` holds the same reference, `Object.is` returns `true`, and `Badge` is skipped: the name is already `Noa` in memory, and the screen still shows `Dana`. Replace creates a new object, so the input counts as new. `{ ...this.user }` is enough here because `name` was already changed. In normal code you create the new object with the new value in one go: `{ ...this.user, name: 'Noa' }`.

The same goes for arrays: `push` keeps the reference, `[...list, item]` doesn't. A signal won't help either if you change the object inside it: [signals compare with `Object.is`](https://angular.dev/guide/signals) by default.

## markForCheck for a plain field

When state changes outside a template event, for example in a timer, Angular needs to be told:

```typescript
import { ChangeDetectorRef, Component, inject } from '@angular/core';

@Component({
  selector: 'app-ticks',
  template: `<p>Ticks: {{ ticks }}</p>`,
})
export class Ticks {
  protected ticks = 0;
  private readonly cdr = inject(ChangeDetectorRef);

  start(notify: boolean) {
    setTimeout(() => {
      this.ticks++;
      if (notify) this.cdr.markForCheck();
    });
  }
}
```

The test calls `start(false)`, waits, then `start(true)`:

```text
without markForCheck: Ticks: 0
with markForCheck:    Ticks: 2
```

After the first call `ticks` is 1, but nobody said so. [`markForCheck`](https://angular.dev/api/core/ChangeDetectorRef) in the second call marked the view and scheduled a check, which showed the current value, 2. Most of the time a signal is simpler: `ticks = signal(0)` and `ticks.update((n) => n + 1)`, with no `ChangeDetectorRef` at all.

### In older versions

Before v22 you had to ask for OnPush in every component, and inputs were written with the `@Input()` decorator:

```typescript
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span>{{ user.name }}</span>`,
})
export class BadgeComponent {
  @Input({ required: true }) user!: { name: string };
}
```

The rules are the same. In Angular 22 the `changeDetection: ChangeDetectionStrategy.OnPush` line is redundant but harmless, and `ng update` leaves it as is.

## Mistakes beginners make

- **Mutating an object or array passed as an input.** Create a new reference.
- **Expecting an event in one component to refresh a sibling OnPush component.** An event marks the component it happened in and its ancestors, not its siblings.
- **Calling `detectChanges()` everywhere.** It runs a check on the view right away. Usually a signal or `markForCheck` is the better fit.

## What's next

Next post: what OnPush by default means for existing code, what `ng update` to v22 does, and how to move to OnPush one component at a time.
