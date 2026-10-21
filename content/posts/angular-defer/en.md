---
title: "@defer in Angular: load part of a template only when needed"
summary: "How @defer moves components into a separate chunk: @placeholder, @loading and @error, the viewport, idle, interaction, hover and timer triggers, when, prefetch, and testing with DeferBlockBehavior."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 54 }
---

`@defer` wraps a part of the template that Angular loads only when a condition is met: when it scrolls into view, when the browser is idle, or after a click. The components inside it move into a separate chunk, so the initial bundle gets smaller. The block exists since version 17, and unlike `import()` from [the previous post](en/posts/angular-dynamic-components/) it needs no code.

Every example was checked with Angular 22.2 and Vitest.

## A first @defer block

```typescript
import { Component } from '@angular/core';
import { Comments } from './comments';

@Component({
  selector: 'app-article',
  imports: [Comments],
  template: `
    <article>Long article text…</article>
    @defer (on viewport) {
      <app-comments />
    } @placeholder {
      <p>Comments</p>
    } @loading (after 100ms; minimum 500ms) {
      <p>Loading comments…</p>
    } @error {
      <p>Couldn't load comments.</p>
    }
  `,
})
export class Article {}
```

`ng build` moves `Comments` into its own chunk:

```text
Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-V3HDUI2H.js   | comments      | 302 bytes |               302 bytes
```

Per [the docs](https://angular.dev/guide/templates/defer):

- `@placeholder` shows until the trigger fires. `on viewport` watches the placeholder, so it needs a single root element.
- `@loading` replaces the placeholder while loading. `after 100ms` shows it only if loading takes longer than 100ms, and `minimum 500ms` keeps it for at least half a second so it doesn't flicker.
- `@error` shows if loading fails.

All three blocks are optional, and their own dependencies load eagerly, not lazily.

## Triggers

| Trigger | When the block loads |
|---|---|
| `on idle` | When the browser is idle (`requestIdleCallback`). The default when no trigger is given |
| `on viewport` | When the element enters the viewport (`IntersectionObserver`) |
| `on interaction` | On click or keydown |
| `on hover` | On mouseover or focus |
| `on immediate` | Right after the non-deferred content renders |
| `on timer(5s)` | After a fixed time |
| `when cond` | When the expression becomes truthy, once only |

```typescript
import { Component, signal } from '@angular/core';
import { Comments } from './comments';

@Component({
  selector: 'app-triggers',
  imports: [Comments],
  template: `
    <button #more>More</button>
    @defer (on interaction(more); on timer(5s)) {
      <app-comments />
    }

    <label><input type="checkbox" (change)="ready.set(true)" /> Show</label>
    @defer (when ready()) {
      <app-comments />
    }

    @defer (on interaction; prefetch on idle) {
      <app-comments />
    } @placeholder {
      <button>Load comments</button>
    }
  `,
})
export class Triggers {
  protected readonly ready = signal(false);
}
```

- Several triggers separated by `;` act as "or": the first block loads on a click on `#more` or after five seconds, whichever comes first.
- `interaction`, `hover` and `viewport` take a template reference such as `(more)`. Without one they watch the placeholder.
- `prefetch on idle` downloads the JavaScript when the browser is idle, but shows the content only on click. That way the click doesn't wait for the network.

## When @defer defers nothing

The docs set two conditions: the component must be standalone, and it must not appear in the same file outside `@defer` blocks (not even in a `viewChild`). When I added `<app-comments />` outside the block in `Article`, the build passed with no warning at all, but the `Lazy chunk files` line was gone: `Comments` was back in the main bundle.

`ng serve` with HMR also loads every chunk right away and ignores the triggers. To see the real behavior, run `ng serve --no-hmr`.

## Testing the states

`DeferBlockBehavior.Manual` lets a test move the block between states itself:

```typescript
import { TestBed } from '@angular/core/testing';
import { DeferBlockBehavior, DeferBlockState } from '@angular/core/testing';
import { Article } from './article';

it('shows each defer state', async () => {
  TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual });
  const fixture = TestBed.createComponent(Article);
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).toContain('Comments');

  const [block] = await fixture.getDeferBlocks();
  await block.render(DeferBlockState.Loading);
  expect(fixture.nativeElement.textContent).toContain('Loading comments…');
  await block.render(DeferBlockState.Complete);
  expect(fixture.nativeElement.textContent).toContain('42 comments');
});
```

Component tests get a full explanation later in this level.

## Mistakes beginners make

- **Using the component outside the block in the same file.** It loads eagerly, with no error and no warning. Check in `ng build` that the chunk exists.
- **Deferring content at the top of the page.** The docs advise against deferring what's visible on load, to avoid layout shifts.
- **Importing through an `index.ts` file.** A barrel file can keep the component in the main bundle; import straight from its file.

## What's next

Next: animations with `animate.enter` and `animate.leave`, and what happened to the `@angular/animations` package.
