---
title: "Web Workers in Angular: heavy computations without freezing the UI"
summary: "Moving heavy computation to a Web Worker in Angular: ng generate web-worker, messaging between the component and the worker, when it helps, and what a worker can't do."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 70 }
---

The app's code runs on one thread in the browser, the main thread. A loop that runs for two seconds freezes the screen for two seconds: clicks aren't handled, and Angular doesn't render. A [Web Worker](https://angular.dev/ecosystem/web-workers) runs code on a separate thread, and the UI keeps responding.

Every example was checked with Angular 22.2, and the full example ran in a browser from a production build.

## ng generate web-worker

```bash
ng generate web-worker app
```

```text
CREATE src/app/app.worker.ts (157 bytes)
CREATE tsconfig.worker.json (334 bytes)
UPDATE angular.json (2067 bytes)
UPDATE src/app/app.ts (690 bytes)
```

The command creates a sample worker and adds `"webWorkerTsConfig": "tsconfig.worker.json"` to `angular.json`. That tsconfig compiles `*.worker.ts` files with the `webworker` types instead of the `dom` ones. `app.ts` gets code that creates the worker and sends it `'hello'`, inside a `typeof Worker !== 'undefined'` check.

## Messaging

A worker that counts prime numbers up to a limit, a computation that takes a few seconds:

```typescript
/// <reference lib="webworker" />

addEventListener('message', ({ data }: MessageEvent<number>) => {
  let count = 0;
  for (let n = 2; n <= data; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) {
      if (n % d === 0) {
        prime = false;
        break;
      }
    }
    if (prime) count++;
  }
  postMessage(count);
});
```

And the component that sends it the limit and shows the answer:

```typescript
import { Component, DestroyRef, inject, signal } from '@angular/core';

@Component({
  selector: 'app-primes',
  template: `
    <button (click)="count(5_000_000)">Count primes up to 5,000,000</button>
    <p>{{ result() ?? 'Not counted yet' }}</p>
  `,
})
export class Primes {
  protected readonly result = signal<number | null>(null);
  private readonly worker = new Worker(new URL('./primes.worker', import.meta.url));

  constructor() {
    this.worker.onmessage = ({ data }: MessageEvent<number>) => this.result.set(data);
    inject(DestroyRef).onDestroy(() => this.worker.terminate());
  }

  protected count(limit: number) {
    this.worker.postMessage(limit);
  }
}
```

`postMessage` sends a message to the other side, and `onmessage` receives it. When the answer arrives, `result.set` updates a signal and Angular renders. In the browser, `348513` appeared after the click. `terminate` in `onDestroy` stops the thread when the component is destroyed.

The builder recognizes the `new Worker(new URL('./primes.worker', import.meta.url))` pattern and builds the file into a separate chunk:

```text
Lazy chunk files    | Names         |  Raw size | Estimated transfer size
worker-FV2NBWS2.js  | primes-worker | 150 bytes |               150 bytes
```

## When it helps, and what it can't do

A worker fits work that keeps the CPU busy: processing a large file, computing over lots of data, image processing. It isn't needed for HTTP requests, which are already async and don't block the main thread.

The limits, per [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers):

- **No DOM.** A worker has no `document`, and `self` replaces `window`. The main thread updates the screen once the answer arrives.
- **Data is copied.** Every message goes through structured clone: the other side gets a copy, not the same object. Functions can't be sent.
- **No Angular inside.** The worker is a plain TypeScript file, with none of the app's DI, components or signals.

## Mistakes beginners make

- **Creating a worker in an app with SSR or prerendering without a check.** Per the [docs](https://angular.dev/ecosystem/web-workers), `@angular/platform-server` doesn't support workers. Create the worker only in the browser, for example after a `typeof Worker !== 'undefined'` check, and keep a fallback.
- **Creating a new worker on every click.** Each one is a thread that stays open until `terminate`. Create one and send it many messages.
- **Moving small work to a worker.** Copying the data on every message takes time, and for a computation of a few milliseconds it doesn't pay off.

## What's next

Next: how the build itself is configured: the `@angular/build:application` builder, configurations in `angular.json`, environment values and source maps.
