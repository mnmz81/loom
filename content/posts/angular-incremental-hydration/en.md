---
title: "Incremental hydration in Angular: @defer with hydrate on and hydrate never"
summary: "Incremental hydration lets Angular load and wire up parts of a page only when needed: hydrate on triggers, hydrate never for static content, and how it differs from plain @defer. On by default in v22."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 66 }
---

After [SSR and hydration](en/posts/angular-ssr-hydration/), the browser still downloads and runs the code of every component on the page to wire it up. With [incremental hydration](https://angular.dev/guide/incremental-hydration) you decide which parts stay "dry" (HTML without code) until something justifies activating them.

Every example was checked with Angular 22.2: `ng build`, a Node server with `curl`, and a real browser.

## Enabling it

In Angular 22 there's nothing to enable: [`provideClientHydration()`](https://angular.dev/api/platform-browser/provideClientHydration) already includes incremental hydration, and event replay with it. To turn it off there's `withNoIncrementalHydration()`.

## `hydrate on` and `hydrate never`

The tool is `@defer` ([post 54](en/posts/angular-defer/)) with a `hydrate` trigger. On this page, the comments are wired up only when the user touches them, and the footer never is:

```typescript
import { Component } from '@angular/core';
import { Comments } from './comments';
import { FooterLinks } from './footer-links';

@Component({
  selector: 'app-article',
  imports: [Comments, FooterLinks],
  template: `
    <h1>Incremental hydration</h1>
    @defer (on viewport; hydrate on interaction) {
      <app-comments />
    } @placeholder {
      <p>Comments are loading…</p>
    }
    @defer (hydrate never) {
      <app-footer-links />
    } @placeholder {
      <footer>…</footer>
    }
  `,
})
export class Article {}
```

The server renders the real content of both blocks, not the `@placeholder`, and the browser receives full HTML:

```text
<app-comments jsaction="click:;keydown:;" ngb="d0" ngh="0">
<h2>Comments (2)</h2>
<button type="button" jsaction="click:;" ngb="d0">Like (0)</button>
</app-comments>
...
<app-footer-links>
<footer><a href="/about">About</a> · <a href="/privacy">Privacy</a></footer>
</app-footer-links>
```

In the browser, after the page loaded, no component chunk had been downloaded. Clicking "Like" loaded the `comments` chunk, wired up the component, and the captured click was replayed: the button showed `Like (1)`. The `footer-links` chunk was never downloaded, and its links keep working as ordinary links, because they're HTML.

What each one does:

- **`hydrate on <trigger>`**: the triggers are `idle`, `viewport`, `interaction` (click or key), `hover`, `immediate` and `timer(500ms)`. You can list several, separated by `;`, and the first one to fire activates the block.
- **`hydrate when <condition>`**: activates when the condition becomes true. It works only for the top-most `@defer` block that's still dry, because the condition lives in the parent component.
- **`hydrate never`**: the block stays static HTML, including everything nested inside it. Good for content that needs no interaction.

## How it differs from plain `@defer`

Without `hydrate`, a server-rendered `@defer` block renders its `@placeholder` on the server. In the browser the placeholder is replaced by the content when the trigger fires, which causes a layout shift. I ran the same example with only `@defer (on viewport)`, and the server returned `<p>Comments are loading…</p>`.

With `hydrate`, the real content comes from the server, so you can put `@defer` above the fold too without a layout shift. `hydrate` triggers apply only to the first load of a page that was rendered on the server. When you navigate to it in the browser (no SSR), the regular triggers apply (`on viewport` in the example), which is why `@placeholder` is still required. With nested blocks, Angular wires up the parent first and then the child.

### In older versions

In Angular 19 the feature shipped as a developer preview, and from version 20 it is stable; in both you had to enable it explicitly, together with event replay:

```typescript
provideClientHydration(withIncrementalHydration(), withEventReplay());
```

Since version 22 `withIncrementalHydration()` is marked deprecated because it's the default, and it's planned for removal in version 24. `withEventReplay()` is redundant with it.

## Mistakes beginners make

- **Using `hydrate` without SSR.** The triggers affect only a page rendered on the server. Without `ng add @angular/ssr` they do nothing.
- **Removing the `@placeholder`.** It isn't used for SSR, but it's displayed when you enter the page through browser navigation.
- **`hydrate never` on a block that has interaction.** Per the docs, everything nested inside it stays dry too, and no other `hydrate` trigger inside it will fire.

## What's next

Next: generating a static site, SSG and prerendering, HTML built ahead of time with no server.
