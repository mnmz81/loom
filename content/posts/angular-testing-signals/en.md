---
title: "Testing signals in Angular: computed, effect and TestBed.tick()"
summary: "How to test signals, computed and effects in Angular 22: when you need TestBed.tick(), controlling time with Vitest's fake timers without Zone.js, and a first component harness."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 59 }
---

A signal and a `computed` update right away, so they're easy to test. Effects and rendering happen later, when Angular chooses, and the test has to know how to wait for them. This post continues [component tests](en/posts/angular-testing-components/) and [service tests](en/posts/angular-testing-services/).

Every example was checked with Angular 22.2, Angular CDK 22.2 and Vitest 5.

## computed and effect in a service

```typescript
import { Service, computed, effect, signal } from '@angular/core';

@Service()
export class Preferences {
  readonly fontSize = signal(16);
  readonly lineHeight = computed(() => Math.round(this.fontSize() * 1.5));
  readonly saved: number[] = [];

  constructor() {
    effect(() => this.saved.push(this.fontSize()));
  }
}
```

```typescript
import { TestBed } from '@angular/core/testing';
import { Preferences } from './preferences';

describe('Preferences', () => {
  it('updates computed values right away', () => {
    const prefs = TestBed.inject(Preferences);
    prefs.fontSize.set(20);
    expect(prefs.lineHeight()).toBe(30);
  });

  it('runs the effect on TestBed.tick()', () => {
    const prefs = TestBed.inject(Preferences);
    expect(prefs.saved).toEqual([]);

    TestBed.tick();
    expect(prefs.saved).toEqual([16]);

    prefs.fontSize.set(18);
    prefs.fontSize.set(20);
    TestBed.tick();
    expect(prefs.saved).toEqual([16, 20]);
  });
});
```

- `computed` is calculated when you read it, so `lineHeight()` returns 30 right after `set`.
- Per [the docs](https://angular.dev/guide/signals/effect), effects always run asynchronously, as part of change detection. Right after `inject` the effect hasn't run yet, and `saved` is empty.
- [`TestBed.tick()`](https://angular.dev/api/core/testing/TestBedStatic) runs all the pending work needed to sync state to the screen, including effects. Two `set` calls before `tick` run the effect once, with the latest value. Effects have [their own post](en/posts/angular-effect/).

## Time without Zone.js: Vitest's fake timers

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-toast',
  template: `
    <button (click)="show()">Save</button>
    @if (visible()) {
      <p role="status">Saved</p>
    }
  `,
})
export class Toast {
  protected readonly visible = signal(false);

  show() {
    this.visible.set(true);
    setTimeout(() => this.visible.set(false), 3000);
  }
}
```

```typescript
import { TestBed } from '@angular/core/testing';
import { Toast } from './toast';

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('hides the message after 3 seconds', async () => {
    const fixture = TestBed.createComponent(Toast);
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector('button')!.click();
    TestBed.tick();
    expect(el.querySelector('[role=status]')).not.toBeNull();

    await vi.advanceTimersByTimeAsync(2999);
    TestBed.tick();
    expect(el.querySelector('[role=status]')).not.toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    TestBed.tick();
    expect(el.querySelector('[role=status]')).toBeNull();
  });
});
```

- `vi.useFakeTimers()` replaces `setTimeout` with a clock Vitest controls, and `advanceTimersByTimeAsync` moves it forward. The test runs instantly, without really waiting three seconds.
- `TestBed.tick()` updates the DOM synchronously. Angular also schedules rendering with timers, so with a fake clock `await fixture.whenStable()` never finishes by itself: my test hung until the 5-second timeout.
- After the test, `vi.useRealTimers()` restores the real clock for the next tests.

## Component harnesses

A harness is a class that describes how to use a component, so tests don't depend on its HTML structure. It comes from `@angular/cdk/testing` (the CDK gets [its own post](en/posts/angular-cdk/)). Here's a harness for `Rating` from the [component testing post](en/posts/angular-testing-components/):

```typescript
import { ComponentHarness } from '@angular/cdk/testing';

export class RatingHarness extends ComponentHarness {
  static hostSelector = 'app-rating';
  private readonly label = this.locatorFor('p');
  private readonly upButton = this.locatorFor('button');

  async getText() {
    return (await this.label()).text();
  }

  async rateUp() {
    await (await this.upButton()).click();
  }
}
```

```typescript
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Rating } from './rating';
import { RatingHarness } from './rating.harness';

@Component({
  imports: [Rating],
  template: `<app-rating label="Speed" [value]="value()" (rated)="value.set($event)" />`,
})
class Host {
  readonly value = signal(2);
}

it('rates up through the harness', async () => {
  const fixture = TestBed.createComponent(Host);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const rating = await loader.getHarness(RatingHarness);

  expect(await rating.getText()).toBe('Speed: 2/5');
  await rating.rateUp();
  expect(await rating.getText()).toBe('Speed: 3/5');
});
```

- `hostSelector` finds the component, and `locatorFor` returns a function that finds an element inside it. [The docs](https://angular.dev/guide/testing/creating-component-harnesses) stress that it doesn't find it right away.
- Every harness method is async, and the harness waits for Angular to finish updating the DOM before and after each action. That's why there's no `whenStable` here at all.
- If `Rating`'s HTML changes, you fix only the harness. Angular Material has a harness for every component.

### In older versions

Older tests use `TestBed.flushEffects()`:

```typescript
import { TestBed } from '@angular/core/testing';
import { Preferences } from './preferences';

it('runs the effect (old API)', () => {
  const prefs = TestBed.inject(Preferences);
  TestBed.flushEffects();
  expect(prefs.saved).toEqual([16]);
});
```

It still works in 22.2, but it's deprecated, and the API says to use `TestBed.tick()` instead. Tests written with Zone.js also have `fakeAsync` and `tick()` from `@angular/core/testing` (a function, not `TestBed.tick`), whose job moved to Vitest's fake timers.

## Mistakes beginners make

- **Testing an effect without `TestBed.tick()`.** The test runs before the effect and sees the previous state.
- **`await fixture.whenStable()` with `vi.useFakeTimers()`.** The test hangs until the timeout; with a fake clock, update the DOM with `TestBed.tick()`.
- **Forgetting `vi.useRealTimers()`.** The fake clock stays for the next tests and breaks them.

## What's next

Next: end-to-end tests with Playwright, which run the app in a real browser.
