---
title: "linkedSignal in Angular: state that resets when its source changes"
summary: "linkedSignal is a writable signal that recomputes when its source changes: a selection that resets when the list is replaced, the source and previous form, and why not to do it with effect."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 14 }
---

[`computed`](en/posts/angular-signals/) derives from other signals, but you can't write to it. A plain signal is writable, but it doesn't know when its source changed. [`linkedSignal`](https://angular.dev/guide/signals/linked-signal) combines the two: a value the user changes, which is recomputed when the source changes.

Every example was checked with Angular 22.2. TypeScript snippets without a component ran on Node.js 24.

## The problem: a selection that doesn't know the list changed

```typescript
// sizes-stale.ts
import { signal } from '@angular/core';

const sizes = signal(['S', 'M', 'L']);
const selected = signal(sizes()[0]);

selected.set('L');
sizes.set(['XS', 'S']);
console.log(selected()); // L
```

```text
L
```

The user picked `L`, then the list was replaced with kids' sizes. `selected` is still `L`, a size that no longer exists.

## The short form

```typescript
// sizes-linked.ts
import { linkedSignal, signal } from '@angular/core';

const sizes = signal(['S', 'M', 'L']);
const selected = linkedSignal(() => sizes()[0]);

selected.set('L');
console.log(selected()); // L
sizes.set(['XS', 'S']);
console.log(selected()); // XS
```

```text
L
XS
```

`linkedSignal` takes a computation function, like `computed`. As long as the list doesn't change it behaves like a plain signal, and `set` keeps the selection. When a signal the computation read changes, the value goes back to the computation's result: the first size in the new list.

## source and computation: keeping a selection that's still valid

```typescript
// sizes-previous.ts
import { linkedSignal, signal } from '@angular/core';

const sizes = signal(['S', 'M', 'L']);
const selected = linkedSignal<string[], string>({
  source: sizes,
  computation: (list, previous) =>
    previous && list.includes(previous.value) ? previous.value : list[0],
});

selected.set('M');
sizes.set(['S', 'M']);
console.log(selected()); // M
sizes.set(['XL', 'XXL']);
console.log(selected()); // XL
```

```text
M
XL
```

The full form takes an object. `source` is the signal to follow, and `computation` receives its new value and `previous`, which holds `previous.source` (the source's previous value) and `previous.value` (the linkedSignal's previous value). Here the selection is kept if it's still in the list, and otherwise goes back to the first one. On the first run there is no previous value, so `previous` is optional in the type and the check `previous &&` is there. When you use `previous`, [write the generic types explicitly](https://angular.dev/guide/signals/linked-signal#accounting-for-previous-state): the first is the source type, the second the result type.

## Inside a component

```typescript
import { Component, linkedSignal, signal } from '@angular/core';

@Component({
  selector: 'app-size-picker',
  template: `
    @for (size of sizes(); track size) {
      <button (click)="selected.set(size)">{{ size }}</button>
    }
    <p>Selected: {{ selected() }}</p>
    <button (click)="sizes.set(['XS', 'S'])">Kids sizes</button>
  `,
})
export class SizePicker {
  readonly sizes = signal(['S', 'M', 'L']);
  readonly selected = linkedSignal(() => this.sizes()[0]);
}
```

After clicking `L` and then `Kids sizes`, it shows `Selected: XS`. The source can be any signal, including a `computed` or a component input (the topic of the [next post](en/posts/angular-inputs/)), for example a selection that resets when the parent passes a new list. Since version 22.1 you can also [pass a `set` function](https://angular.dev/guide/signals/linked-signal#customizing-the-set-operation) that writes back to the source signal instead of storing the value in the linkedSignal itself.

### In older versions

`linkedSignal` arrived in version 19 and was marked stable [in version 20](https://github.com/angular/angular/blob/main/CHANGELOG.md). Before that, the usual solution was a plain signal and an effect that resets it (before version 19 also with `allowSignalWrites: true`):

```typescript
import { Component, effect, signal } from '@angular/core';

@Component({
  selector: 'app-size-picker-old',
  template: `<p>Selected: {{ selected() }}</p>`,
})
export class SizePickerOld {
  readonly sizes = signal(['S', 'M', 'L']);
  readonly selected = signal('S');

  constructor() {
    effect(() => this.selected.set(this.sizes()[0]));
  }
}
```

This is the pattern the [post on effect](en/posts/angular-effect/) recommends avoiding. In a test, after `selected.set('L')` and `sizes.set(['XS', 'S'])`, the effect version still returned `L` until the next change detection. `linkedSignal` returned `XS` on the very first read, because it is computed when read rather than waiting to be scheduled.

## Mistakes beginners make

- **Using linkedSignal when nobody writes to the value.** No `set` means it's a `computed`.
- **Forgetting that every signal the computation reads resets the value.** [Per the docs](https://angular.dev/guide/signals/linked-signal#accounting-for-previous-state) this holds in the `source` form too. Read a signal that only helps the computation with `untracked`.

## What's next

Next: inputs, the way a component receives data from its parent, with `input()`.
