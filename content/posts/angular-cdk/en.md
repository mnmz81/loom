---
title: "Angular CDK: Overlay, drag and drop and FocusTrap"
summary: "Angular's Component Dev Kit: a floating panel with cdkConnectedOverlay, a list you reorder by dragging with cdkDrag and cdkDropList, and a dialog that traps focus with cdkTrapFocus."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 62 }
---

The CDK (Component Dev Kit) is a set of behaviors without styling: floating panels, dragging, focus management, [virtual scroll](https://material.angular.dev/cdk/scrolling/overview) for long lists and more. Angular Material is built on it, and you can use it on its own in components you style yourself. This post shows three parts, each in one component.

Every example was checked with Angular 22.2 and `@angular/cdk` 22.2.3: in a Vitest test, and in a real browser for dragging and focus trapping.

## Installation

```bash
ng add @angular/cdk
```

```text
✔ Installing package
Nothing to be done.
```

The package has no setup schematic: `ng add` only adds it to `package.json`, and `npm install @angular/cdk` does the same. Each part is imported from its own path (`@angular/cdk/overlay`, `@angular/cdk/drag-drop`, `@angular/cdk/a11y`).

## Overlay: a floating panel next to a button

[Overlay](https://material.angular.dev/cdk/overlay/overlay) opens a panel that floats above the page and positions it relative to another element. Without Material, add its structural styles to the global `styles.css`:

```css
@import '@angular/cdk/overlay-prebuilt.css';
```

The short way is the `cdkConnectedOverlay` directive on an `ng-template`:

```typescript
import { Component, signal } from '@angular/core';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';

@Component({
  selector: 'app-help-popover',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin],
  template: `
    <button type="button" cdkOverlayOrigin #origin="cdkOverlayOrigin" [aria-expanded]="open()" (click)="open.set(!open())">
      Help
    </button>
    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      (overlayOutsideClick)="open.set(false)"
      (detach)="open.set(false)"
    >
      <div class="panel">Press ? to see all shortcuts.</div>
    </ng-template>
  `,
  styles: `.panel { background: white; border: 1px solid; padding: 0.5rem; }`,
})
export class HelpPopover {
  protected readonly open = signal(false);
}
```

- `cdkOverlayOrigin` marks the button as the anchor, and `cdkConnectedOverlayOpen` opens and closes the panel from the signal. `ng-template` is covered in the [ng-template](en/posts/angular-ng-template/) post.
- `overlayOutsideClick` fires on a click outside the panel. A click on the button itself doesn't count as "outside", so the button keeps toggling.
- Escape closes the panel (unless `cdkConnectedOverlayDisableClose` is set), and `detach` updates the signal to match.

In the browser, the panel appeared right below the button as a `popover="manual"` element: in browsers that support the Popover API the CDK uses it, and the panel goes above everything without `z-index` fights.

## Drag and drop

The CDK's [drag and drop](https://angular.dev/guide/drag-drop) moves elements on screen, but it doesn't touch your data. You apply the new order in the `cdkDropListDropped` event:

```typescript
import { Component, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-playlist',
  imports: [CdkDropList, CdkDrag],
  template: `
    <ol cdkDropList (cdkDropListDropped)="drop($event)">
      @for (song of songs(); track song) {
        <li cdkDrag>{{ song }}</li>
      }
    </ol>
  `,
  styles: `
    .cdk-drag-placeholder { opacity: 0.3; }
    .cdk-drag-animating { transition: transform 200ms; }
  `,
})
export class Playlist {
  protected readonly songs = signal(['Intro', 'Verse', 'Chorus', 'Outro']);

  protected drop(event: CdkDragDrop<string[]>) {
    this.songs.update((list) => {
      const copy = [...list];
      moveItemInArray(copy, event.previousIndex, event.currentIndex);
      return copy;
    });
  }
}
```

The event carries `previousIndex` and `currentIndex`, and `moveItemInArray` moves the item in the array. `moveItemInArray` changes the array in place, so you pass it a copy and return that from `update`: the signal gets a new array and notifies everything that reads it. `.cdk-drag-placeholder` styles the spot where the item will land, and `.cdk-drag-animating` the animation after the drop. In the browser, dragging Intro to the end of the list showed `Verse, Chorus, Outro, Intro`. To move items between two lists there's `transferArrayItem` and `cdkDropListConnectedTo`.

## FocusTrap: focus that stays in the dialog

In a modal dialog, Tab shouldn't escape to the page behind it. [`cdkTrapFocus`](https://material.angular.dev/cdk/a11y/overview) traps focus inside the element:

```typescript
import { Component, signal } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';

@Component({
  selector: 'app-confirm-delete',
  imports: [CdkTrapFocus],
  template: `
    <button type="button" (click)="open.set(true)">Delete project</button>
    @if (open()) {
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" cdkTrapFocus cdkTrapFocusAutoCapture>
        <h2 id="confirm-title">Delete this project?</h2>
        <button type="button" (click)="open.set(false)">Cancel</button>
        <button type="button" (click)="open.set(false)">Delete</button>
      </div>
    }
  `,
})
export class ConfirmDelete {
  protected readonly open = signal(false);
}
```

In the browser: after "Delete project", focus moved to Cancel (`cdkTrapFocusAutoCapture` moves it to the first Tab-reachable element). Tab and Shift+Tab cycled between Cancel and Delete only, and after closing, focus returned to "Delete project". Without `AutoCapture` the trap still works, but focus doesn't enter the dialog or come back on its own. The trap doesn't block mouse clicks outside the region. The CDK's `Dialog` (and Material's `MatDialog`) include all of this, together with Escape and a backdrop.

## Mistakes beginners make

- **Forgetting `overlay-prebuilt.css`.** Without Material, Overlay needs these styles to work correctly.
- **Expecting the drag to change the array.** The directives only draw the drag; without `moveItemInArray` in `cdkDropListDropped` the item jumps back.
- **Dragging as the only way to reorder.** The official guide describes mouse and touch only, so give keyboard users "up" and "down" buttons as well.

## What's next

Next: Angular Material, the styled components built on the CDK: installing with `ng add`, buttons, form fields, a dialog and a theme.
