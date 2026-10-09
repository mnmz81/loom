---
title: "Angular signals — the basics"
summary: "signal, computed and effect in short."
date: 2026-09-20
tags: [angular, signals]
---

A signal is a wrapper around a value that notifies whoever reads it when the value changes. Angular uses signals to know exactly which parts of a template need updating, and they are the foundation of zoneless apps. There are three basic tools: `signal`, `computed` and `effect`.

## `signal` — a writable value

```ts
import { signal } from '@angular/core';

const count = signal(0);

count();                     // read: 0
count.set(5);                // write
count.update((n) => n + 1);  // write based on the previous value: 6
```

You read the value by calling the signal like a function — in templates too: `{{ count() }}`.

## `computed` — a derived value

```ts
import { computed } from '@angular/core';

const price = signal(100);
const quantity = signal(2);
const total = computed(() => price() * quantity());

total(); // 200
quantity.set(3);
total(); // 300
```

`computed` is read-only. It automatically tracks every signal read inside it, is evaluated only when someone reads it (lazy), and caches the result until one of its dependencies changes.

### A common mistake

Don't write to signals from inside `computed`. The derivation function should be pure — just read and return a value.

## `effect` — side effects

```ts
import { Component, effect, signal } from '@angular/core';

@Component({ selector: 'app-counter', template: `{{ count() }}` })
export class Counter {
  readonly count = signal(0);

  constructor() {
    effect(() => {
      localStorage.setItem('count', String(this.count()));
    });
  }
}
```

An `effect` runs at least once, and again whenever a signal it reads changes. Runs are scheduled asynchronously, so several changes in a row cause a single run. It must be created in an injection context (for example the constructor), and it is destroyed automatically with the component.

## When to use what

- **`signal`** — state that changes.
- **`computed`** — anything that can be derived from other state. This is the default.
- **`effect`** — only for syncing with the outside world: `localStorage`, logging, non-Angular libraries. If you are copying a value from one signal to another inside an `effect`, you probably wanted `computed`.
