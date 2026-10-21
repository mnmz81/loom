---
title: "Testing Angular components with TestBed and Vitest"
summary: "Testing a component in Angular 22: TestBed.createComponent, await fixture.whenStable() without Zone.js, querying the DOM, clicks, inputs with setInput or inputBinding, outputs with outputBinding."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 57 }
---

A component test creates the component in memory, renders it into a simulated DOM, and checks what's shown and what happens on a click. A new project comes with [Vitest and jsdom](https://angular.dev/guide/testing), and `ng test` builds the tests and runs them. jsdom emulates a DOM inside Node.js, so no browser opens.

Every example was checked with Angular 22.2 and Vitest 5.

## A first test

The counter from [the first post](en/posts/angular-what-is-angular/) and its test:

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <button (click)="count.set(count() + 1)">+1</button>
    <p>Clicked {{ count() }} times</p>
  `,
})
export class Counter {
  protected readonly count = signal(0);
}
```

```typescript
import { TestBed } from '@angular/core/testing';
import { Counter } from './counter';

describe('Counter', () => {
  it('counts clicks', async () => {
    const fixture = TestBed.createComponent(Counter);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('p')?.textContent).toBe('Clicked 0 times');

    el.querySelector('button')!.click();
    await fixture.whenStable();
    expect(el.querySelector('p')?.textContent).toBe('Clicked 1 times');
  });
});
```

- `TestBed.createComponent` creates the component and returns a `fixture`. `fixture.nativeElement` is the host element, and `querySelector` searches inside it as in a browser.
- `createComponent` doesn't render right away. [`await fixture.whenStable()`](https://angular.dev/guide/testing/components-scenarios) waits for Angular to finish updating the DOM, and you wait again after every change, such as the click.
- `describe`, `it` and `expect` come from Vitest and are available without an import.

```bash
ng test --watch=false
```

```text
 Test Files  2 passed (2)
      Tests  3 passed (3)
```

## Inputs with setInput

```typescript
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-rating',
  template: `
    <p>{{ label() }}: {{ value() }}/5</p>
    <button (click)="rated.emit(value() + 1)" [disabled]="value() >= 5">Up</button>
  `,
})
export class Rating {
  readonly label = input.required<string>();
  readonly value = input(0);
  readonly rated = output<number>();
}
```

```typescript
import { TestBed } from '@angular/core/testing';
import { Rating } from './rating';

it('shows the inputs set with setInput', async () => {
  const fixture = TestBed.createComponent(Rating);
  fixture.componentRef.setInput('label', 'Speed');
  fixture.componentRef.setInput('value', 5);
  await fixture.whenStable();
  expect(fixture.nativeElement.querySelector('p').textContent).toBe('Speed: 5/5');
  expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
});
```

`input()` is a read-only signal, so you can't write `fixture.componentInstance.value.set(5)`. `componentRef.setInput` passes a value the way a parent template would.

## bindings: inputs and outputs in createComponent

```typescript
import { inputBinding, outputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Rating } from './rating';

it('emits the next value', async () => {
  const value = signal(3);
  const onRated = vi.fn();
  const fixture = TestBed.createComponent(Rating, {
    bindings: [
      inputBinding('label', () => 'Price'),
      inputBinding('value', value),
      outputBinding('rated', onRated),
    ],
  });
  await fixture.whenStable();

  fixture.nativeElement.querySelector('button').click();
  expect(onRated).toHaveBeenCalledWith(4);

  value.set(1);
  await fixture.whenStable();
  expect(fixture.nativeElement.querySelector('p').textContent).toBe('Price: 1/5');
});
```

These are the same `inputBinding` and `outputBinding` from the [dynamic components post](en/posts/angular-dynamic-components/). An input bound to a signal updates when the signal changes, and Vitest's `vi.fn()` records every call to the output. The test doesn't need to wait before `toHaveBeenCalledWith`, because `emit` calls the listener right away.

### In older versions

Before version 21, new projects were created with Karma and Jasmine, and tests looked like this:

```typescript
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Counter } from './counter';

describe('Counter (old style)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Counter] }).compileComponents();
  });

  it('counts clicks', fakeAsync(() => {
    const fixture = TestBed.createComponent(Counter);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p').textContent).toContain('Clicked 1 times');
  }));
});
```

- `fixture.detectChanges()` runs change detection by hand after every change. With zoneless, prefer `await fixture.whenStable()`, which waits for all the work Angular schedules.
- `fakeAsync` and `tick` move a fake clock, but they need Zone.js. In a zoneless project the test fails:

```text
Error: zone-testing.js is needed for the fakeAsync() test helper but could not be found.
        Please make sure that your environment includes zone.js/testing
```

The docs say `fakeAsync` is no longer recommended, and suggest `async`/`await` or Vitest's fake clock (`vi.useFakeTimers()`). Karma is still supported, and there's a [migration guide to Vitest](https://angular.dev/guide/testing/migrating-to-vitest).

## Mistakes beginners make

- **Checking the DOM without `await fixture.whenStable()`.** The test sees the previous state, or an empty template.
- **Trying `componentInstance.value.set(...)` on an input.** `input()` has no `set`; use `setInput` or `inputBinding`.
- **Testing private methods instead of what's shown.** A test that reads the DOM and clicks buttons survives internal changes to the component.

## What's next

Next: testing services, with `TestBed.inject`, mock providers, `HttpTestingController` and `RouterTestingHarness`.
