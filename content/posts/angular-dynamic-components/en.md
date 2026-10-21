---
title: "Dynamic components in Angular: NgComponentOutlet and createComponent"
summary: "Showing a component chosen at runtime: NgComponentOutlet with inputs, createComponent with inputBinding and outputBinding, lazy loading with import(), and the end of ComponentFactoryResolver."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 53 }
---

Usually the template knows in advance which component to show. Sometimes the decision only comes at runtime: a card type based on server data, notifications added on click, or a heavy widget loaded only when needed. [The docs](https://angular.dev/guide/components/programmatic-rendering) offer two ways: `NgComponentOutlet` in the template and `ViewContainerRef` in code.

Every example was checked with Angular 22.2 and Vitest.

## NgComponentOutlet

Two components with the same input, which `Dashboard` picks between:

```typescript
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-info-card',
  template: `<p>Info: {{ text() }}</p>`,
})
export class InfoCard {
  readonly text = input('');
}

@Component({
  selector: 'app-alert-card',
  template: `<p role="alert">Alert: {{ text() }} <button (click)="closed.emit()">×</button></p>`,
})
export class AlertCard {
  readonly text = input('');
  readonly closed = output();
}
```

```typescript
import { Component, computed, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { AlertCard, InfoCard } from './widgets';

@Component({
  selector: 'app-dashboard',
  imports: [NgComponentOutlet],
  template: `
    <button (click)="urgent.set(!urgent())">Toggle</button>
    <ng-container *ngComponentOutlet="card(); inputs: { text: message() }" />
  `,
})
export class Dashboard {
  protected readonly urgent = signal(false);
  protected readonly message = signal('Disk 80% full');
  protected readonly card = computed(() => (this.urgent() ? AlertCard : InfoCard));
}
```

`*ngComponentOutlet` takes a component class and renders it. At first it shows `Info: Disk 80% full`, and after a click `Alert: Disk 80% full`. `inputs` is an object of input names and values, and it updates when `message` changes. It also has `injector` to override providers and `content` to project into `<ng-content>`. It doesn't connect outputs; for those there's the next approach.

## createComponent with bindings

```typescript
import { Component, ComponentRef, ViewContainerRef, inputBinding, outputBinding, signal, viewChild } from '@angular/core';
import { AlertCard } from './widgets';

@Component({
  selector: 'app-notifications',
  template: `
    <button (click)="add()">Add</button>
    <ng-container #slot />
  `,
})
export class Notifications {
  private readonly slot = viewChild.required('slot', { read: ViewContainerRef });
  private count = 0;

  add() {
    const text = signal(`Notification ${++this.count}`);
    const ref: ComponentRef<AlertCard> = this.slot().createComponent(AlertCard, {
      bindings: [
        inputBinding('text', text),
        outputBinding('closed', () => ref.destroy()),
      ],
    });
  }
}
```

- [`viewChild`](en/posts/angular-queries/) with `read: ViewContainerRef` returns the spot where `#slot` sits. Each click adds a new `AlertCard` there.
- [`inputBinding`](https://angular.dev/api/core/inputBinding) connects an input to a signal or a function, and the input updates when the signal changes. `outputBinding` subscribes to an output; here a click on `×` removes the component. There's also `twoWayBinding` for `model()`.
- `ref.destroy()` removes the component from the DOM and runs its cleanup.

The `ComponentRef<AlertCard>` annotation is needed because `ref` appears inside its own initializer, and without it TypeScript stops with `TS7022`.

## Lazy loading with import()

A dynamic `import()` moves the component into a separate chunk, loaded only when it's called:

```typescript
import { Component, Type, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

@Component({
  selector: 'app-report',
  imports: [NgComponentOutlet],
  template: `
    <button (click)="showChart()">Show chart</button>
    @if (chart(); as chart) {
      <ng-container *ngComponentOutlet="chart" />
    }
  `,
})
export class Report {
  protected readonly chart = signal<Type<unknown> | null>(null);

  async showChart() {
    const { Chart } = await import('./chart');
    this.chart.set(Chart);
  }
}
```

`ng build` lists `chart.ts` as a lazy chunk:

```text
Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-SBCFHI6M.js   | chart         | 297 bytes |               297 bytes
```

When loading depends only on what happens in the template (a click, scrolling), the docs recommend `@defer` first, the topic of the next post. `import()` fits when the decision lives in code.

### In older versions

Before version 13, dynamic creation went through a factory:

```typescript
import { Component, ComponentFactoryResolver, ViewChild, ViewContainerRef } from '@angular/core';
import { AlertCard } from './widgets';

@Component({
  selector: 'app-notifications-old',
  template: `<ng-container #slot></ng-container>`,
})
export class NotificationsOld {
  @ViewChild('slot', { read: ViewContainerRef }) slot!: ViewContainerRef;

  constructor(private resolver: ComponentFactoryResolver) {}

  add() {
    const factory = this.resolver.resolveComponentFactory(AlertCard);
    const ref = this.slot.createComponent(factory);
    ref.setInput('text', 'Notification');
    ref.instance.closed.subscribe(() => ref.destroy());
  }
}
```

`ComponentFactoryResolver` was deprecated in version 13 and [removed in version 22](https://github.com/angular/angular/blob/main/CHANGELOG.md), so this code no longer compiles:

```text
✘ [ERROR] TS2305: Module '"@angular/core"' has no exported member 'ComponentFactoryResolver'. [plugin angular-compiler]
```

Today you pass the class straight to `createComponent`. Even older code also has `entryComponents` in an NgModule, removed in version 16. `ref.setInput` still exists, but `bindings` connects the input to a signal up front.

## Mistakes beginners make

- **Forgetting `NgComponentOutlet` in `imports`.** Without the import, `*ngComponentOutlet` renders nothing, and the build only warns (`NG8116`).
- **Not calling `destroy()`.** A component created with `createComponent` stays until you remove it or the container is destroyed.
- **Using `import()` when `@defer` is enough.** In a template, `@defer` does the same lazy loading with no code.

## What's next

Next: `@defer`, which loads part of a template in a separate chunk on triggers such as `on viewport` and `on idle`.
