---
title: "Animations in Angular: animate.enter and animate.leave"
summary: "Enter and leave animations with animate.enter, animate.leave and plain CSS: keyframes, transitions with @starting-style, functions with animationComplete, and why @angular/animations is deprecated."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 55 }
---

An element that enters or leaves the page because of `@if` or `@for` appears and disappears at once. To animate it, Angular adds CSS classes at the right moment, and on removal waits for the animation to finish before deleting it from the DOM. `animate.enter` and `animate.leave` were added in version 20.2, and per [the docs](https://angular.dev/guide/animations) they are part of the compiler, not directives, so there's nothing to import.

Every example was checked with Angular 22.2 and Vitest.

## Keyframes on enter and leave

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-panel',
  template: `
    <button (click)="open.set(!open())">Toggle</button>
    @if (open()) {
      <div class="panel" animate.enter="fade-in" animate.leave="fade-out">Hello</div>
    }
  `,
  styles: `
    .fade-in { animation: fade 300ms ease-out; }
    .fade-out { animation: fade 200ms ease-in reverse; }
    @keyframes fade {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: none; }
    }
  `,
})
export class Panel {
  protected readonly open = signal(false);
}
```

- `animate.enter="fade-in"` adds the class when the element enters, and Angular removes it when the animation ends.
- `animate.leave="fade-out"` adds the class when the element is about to leave, and Angular deletes it from the DOM only after the animation ends. With several animations, it waits for the longest one.
- The value can be several space-separated classes or an array. `[animate.enter]="cls()"` takes an expression, including a signal.

## Transitions with @starting-style

With a transition, the class describes the state you animate to, and [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) describes the state you start from:

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-toast',
  template: `
    <button (click)="shown.set(!shown())">Toggle</button>
    @if (shown()) {
      <p class="toast" animate.enter="visible">Saved</p>
    }
  `,
  styles: `
    .toast { transition: opacity 300ms, translate 300ms; }
    .toast.visible {
      opacity: 1;
      translate: 0;
      @starting-style {
        opacity: 0;
        translate: 0 1rem;
      }
    }
  `,
})
export class Toast {
  protected readonly shown = signal(false);
}
```

Without `@starting-style` the browser has no starting state, and the element appears with no transition.

## Animating in code with animationComplete

To use an animation library or the Web Animations API, bind a function with `(animate.leave)`:

```typescript
import { AnimationCallbackEvent, Component, signal } from '@angular/core';

@Component({
  selector: 'app-slide',
  template: `
    <button (click)="shown.set(!shown())">Toggle</button>
    @if (shown()) {
      <p (animate.leave)="slideOut($event)">Bye</p>
    }
  `,
})
export class Slide {
  protected readonly shown = signal(true);

  protected slideOut(event: AnimationCallbackEvent) {
    const animation = event.target.animate(
      [{ transform: 'none' }, { transform: 'translateX(100%)' }],
      { duration: 250 },
    );
    animation.onfinish = () => event.animationComplete();
  }
}
```

`event.target` is the element. With `animate.leave` you must call `animationComplete()` so Angular removes it. If you forget, the element stays for another four seconds, and then Angular calls it itself (the time can be changed with `MAX_ANIMATION_TIMEOUT`).

In TestBed animations are off by default, so in a test the element is removed right away. `animationsEnabled: true` in `configureTestingModule` turns them on.

### In older versions

Before 20.2, animations were written with the `@angular/animations` package, in a TypeScript DSL:

```typescript
import { Component, signal } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-open-close',
  animations: [
    trigger('openClose', [
      state('open', style({ height: '200px', opacity: 1 })),
      state('closed', style({ height: '100px', opacity: 0.8 })),
      transition('open <=> closed', [animate('300ms ease-in-out')]),
    ]),
  ],
  template: `
    <button (click)="isOpen.set(!isOpen())">Toggle</button>
    <div [@openClose]="isOpen() ? 'open' : 'closed'">The box is {{ isOpen() ? 'open' : 'closed' }}</div>
  `,
})
export class OpenClose {
  protected readonly isOpen = signal(true);
}
```

The package also needs `provideAnimationsAsync()` in `app.config.ts`. [The docs](https://angular.dev/guide/legacy-animations) mark it as deprecated and recommend `animate.enter` and `animate.leave` for all new code. Its API notes say it's deprecated since 20.2 with the intent to remove it in version 23. You can't mix the two in the same component, but you can in the same app, so you move one component at a time.

## Mistakes beginners make

- **A transition without `@starting-style`.** There's nothing to transition from, and the element jumps in.
- **Forgetting `animationComplete()` in `(animate.leave)`.** The element stays on the page for four seconds.
- **Ignoring reduced-motion preferences.** Angular doesn't handle it for you; [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) in CSS turns off or shortens the animation for those who asked.

## What's next

Next: error handling, with `ErrorHandler`, `provideBrowserGlobalErrorListeners` and the `@boundary` block.
