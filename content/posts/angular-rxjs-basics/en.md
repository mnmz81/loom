---
title: "RxJS in Angular: the Observable and the operators you actually need"
summary: "The RxJS you need in Angular: Observable, subscribe and unsubscribe, pipe with map and filter, Subject and BehaviorSubject, and a search box with debounceTime and switchMap."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 43 }
---

[RxJS](https://rxjs.dev/guide/overview) is a library for streams of values over time. Angular uses it in `HttpClient`, the router and forms, so you meet it even in an app built on signals. This post covers only the part you need in Angular.

Every example was checked with RxJS 7.8 and Angular 22.2. The plain RxJS snippets ran in Node.js 24, and the component in a Vitest spec with `HttpTestingController`.

## Observable, subscribe and unsubscribe

```typescript
// ticks.ts
import { Observable } from 'rxjs';

const ticks = new Observable<number>((subscriber) => {
  let n = 0;
  const id = setInterval(() => subscriber.next(n++), 100);
  return () => {
    clearInterval(id);
    console.log('cleaned up');
  };
});

const sub = ticks.subscribe((n) => console.log('tick', n));
setTimeout(() => sub.unsubscribe(), 350);
```

```text
tick 0
tick 1
tick 2
cleaned up
```

An Observable is a recipe: the function inside it runs only when `subscribe` is called, and from there it sends values with `next`. The function it returns runs on `unsubscribe` and cleans up. An `HttpClient` Observable sends one value and completes, but `interval` or DOM events don't complete on their own, and whoever subscribes to them has to unsubscribe. The next post shows how Angular does that for you.

## pipe, map and filter

```typescript
// operators.ts
import { from, filter, map } from 'rxjs';

from([1, 2, 3, 4, 5, 6])
  .pipe(
    filter((n) => n % 2 === 0),
    map((n) => n * 10),
  )
  .subscribe((n) => console.log(n));
```

```text
20
40
60
```

An [operator](https://rxjs.dev/guide/operators) takes an Observable and returns a new one, and `pipe` connects several in order. `filter` passes only values that match the condition, and `map` turns each value into another. RxJS `filter` filters *values in the stream*, not items in an array. When `HttpClient` returns an array, that's one value, and you filter its items with `map((users) => users.filter(...))`.

## Subject and BehaviorSubject

```typescript
// subjects.ts
import { BehaviorSubject, Subject } from 'rxjs';

const clicks = new Subject<string>();
clicks.subscribe((v) => console.log('A got', v));
clicks.next('first');
clicks.subscribe((v) => console.log('B got', v));
clicks.next('second');

const count = new BehaviorSubject(0);
count.next(1);
count.subscribe((v) => console.log('C got', v));
console.log('current:', count.value);
```

```text
A got first
A got second
B got second
C got 1
current: 1
```

A [Subject](https://rxjs.dev/guide/subject) is an Observable you can push values into from outside with `next`, and every subscriber gets them. A late subscriber misses what was already sent: B didn't get `first`. A `BehaviorSubject` keeps the last value, gives it right away to every new subscriber and exposes it as `.value`. In new Angular code, state usually lives in a [signal](en/posts/angular-signals/), and a Subject suits a stream of events, as in the next example.

## A search box: debounceTime and switchMap

```typescript
// search.ts
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-search',
  template: `
    <input #box (input)="terms.next(box.value)" aria-label="Search users" />
    <ul>
      @for (user of results(); track user.id) {
        <li>{{ user.name }}</li>
      }
    </ul>
  `,
})
export class Search {
  private readonly http = inject(HttpClient);
  protected readonly terms = new Subject<string>();
  protected readonly results = toSignal(
    this.terms.pipe(
      map((term) => term.trim()),
      debounceTime(300),
      filter((term) => term.length >= 2),
      distinctUntilChanged(),
      switchMap((term) => this.http.get<User[]>('/api/users', { params: { q: term } })),
    ),
    { initialValue: [] },
  );
}
```

Every keystroke sends the text to the Subject, and the chain decides when to call the server:

- [`debounceTime(300)`](https://rxjs.dev/api/operators/debounceTime) passes a value only after 300ms with no new value. Typing `a`, `ad`, `ada` quickly sends one request, with `ada`.
- `filter` drops searches shorter than 2 characters, and [`distinctUntilChanged`](https://rxjs.dev/api/operators/distinctUntilChanged) drops a search equal to the previous one: `'ada '` after `trim` is `ada` again, and no request goes out.
- [`switchMap`](https://rxjs.dev/api/operators/switchMap) turns each term into an HTTP request, and cancels the previous request when a new term arrives. That way a slow response to an old search can't overwrite new results.
- [`toSignal`](https://angular.dev/ecosystem/rxjs-interop) turns the result into a signal for the template and unsubscribes when the component is destroyed.

The spec types with Vitest's fake timers and checks with `HttpTestingController` that only `q=ada` and `q=grace` went out, and that the first one was cancelled.

## Mistakes beginners make

- **`mergeMap` instead of `switchMap` in a search.** `mergeMap` doesn't cancel earlier requests, and an old response can arrive last and show wrong results.
- **`subscribe` inside `subscribe`.** A request that depends on another's result is written with `switchMap` inside `pipe`.
- **Forgetting to unsubscribe** from an Observable that doesn't complete, such as `interval`. `toSignal` or `takeUntilDestroyed` do it for you.

## What's next

Next post: the bridge between RxJS and signals: `toSignal`, `toObservable`, `takeUntilDestroyed`, and outputs from an Observable.
