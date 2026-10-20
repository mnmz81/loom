---
title: "What is Angular, and how is it different from AngularJS?"
summary: "What Angular is, what comes with it, how it differs from AngularJS, and how it changed up to v22: standalone, signals, zoneless and OnPush by default."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 1 }
---

Angular is Google's framework for building web applications. The official site, [angular.dev](https://angular.dev/overview), describes it as "a web framework that empowers developers to build fast, reliable applications". You write it in TypeScript and split the UI into components.

Every example in this series ran on Angular 22.2, and every claim was checked against the official docs.

## AngularJS and Angular are not the same thing

AngularJS (versions 1.x) came out in 2010 and was written in JavaScript. In 2016 Angular 2 shipped: a rewrite from scratch in TypeScript, with no backward compatibility. Since then the name is just Angular, and the number goes up with every major version. Version 3 was skipped because the router package was already at 3.x, so 4 came after 2.

AngularJS support ended on December 31, 2021. A tutorial that uses `ng-controller` or `$scope` is about AngularJS, not this series.

## What a component looks like

A component is a TypeScript class with the `@Component` decorator. `selector` is the tag name in HTML, and `template` is what gets shown:

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <button (click)="count.set(count() + 1)">+1</button>
    <p>Clicked {{ count() }} times</p>
    @if (count() >= 3) {
      <p>That's enough clicks.</p>
    }
  `,
})
export class Counter {
  protected readonly count = signal(0);
}
```

`count` is a signal: a value Angular knows has changed. The click updates it with `set`, and the template reads it with `count()`. `@if` shows the last line only from the third click. Each of these pieces gets its own post later.

## What comes in the box

Angular is a framework, not a library: one team maintains all the pieces, and they ship together under one version. In React, by contrast, the router and forms are separate libraries you pick yourself.

| Piece | What it does |
|---|---|
| Router | Navigation between pages, lazy loading, access guards |
| Forms | Forms and input validation |
| HttpClient | Calls to a server |
| Dependency injection | Sharing services between components |
| Angular CLI | Creating, running, building and upgrading (`ng update`) a project |
| SSR and SSG | Server rendering and pre-built static pages |

## How Angular changed

Today's Angular is very different from the 2020 one, and most tutorials online were written for the old versions:

| Versions | What changed |
|---|---|
| 2 to 13 | Every component registered in an `NgModule`, Zone.js detects changes, `*ngIf` and `*ngFor` in templates |
| 14 to 17 | Standalone components without NgModule, signals (16), `@if` and `@for` (17) |
| 18 to 20 | Working without Zone.js (zoneless): experimental in 18, stable in 20 |
| 21 to 22 | Zoneless by default (21), OnPush by default and stable Signal Forms (22) |

The big change is in change detection, the way Angular knows the screen needs updating. Zone.js used to wrap every async operation (a click, `setTimeout`, an HTTP call), and after each one Angular checked the whole component tree. Today [there is no Zone.js](https://angular.dev/guide/zoneless): Angular renders when a signal the template reads changes, when an event bound in the template fires, or when you call `markForCheck`. And because [OnPush is the default](https://angular.dev/best-practices/skipping-subtrees), a component is checked only when its inputs are replaced or an event happens inside it. Level 3 of this series is all about this.

### In older versions

The same counter, as written before version 17:

```typescript
import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-counter',
  template: `
    <button (click)="count = count + 1">+1</button>
    <p>Clicked {{ count }} times</p>
    <p *ngIf="count >= 3">That's enough clicks.</p>
  `,
})
export class CounterComponent {
  count = 0;
}

@NgModule({
  declarations: [CounterComponent],
  imports: [CommonModule],
})
export class CounterModule {}
```

Three differences: the NgModule registers the component, `count` is a plain field instead of a signal, and `*ngIf` replaces `@if`. `*ngIf` is [deprecated since version 20](https://angular.dev/api/common/NgIf), and since version 19 [components are standalone by default](https://angular.dev/guide/components), so a component registered in an NgModule now needs `standalone: false`. Code like this is still common in existing projects, and the end of the series shows how to move it to the new style.

## Versions and support

Per the [release policy](https://angular.dev/reference/releases), since version 22 a major version ships about once a year (every six months before that). Each major gets 12 months of active support plus 12 months of LTS, which brings only security and critical bug fixes. `ng update` runs scripts that update your code when you move to a new major.

Angular 22 [requires](https://angular.dev/reference/versions) Node.js 22.22.3, 24.15.0 or 26.0.0 and up, and TypeScript 6.0.

## When Angular fits

It fits when:

- the app is large, with many screens and forms;
- several teams work on the same code and want one structure;
- you'd rather have every tool come from one source and update together.

It's a weaker fit for a small content site or a single widget on a page, where a whole framework is more than you need. The start of the learning curve is also longer: TypeScript, dependency injection and signals come together.

## Mistakes beginners make

- **Learning from an AngularJS tutorial.** `$scope` and `ng-app` belong to a completely different framework.
- **Copying code from an old tutorial without checking the version.** NgModule, `*ngIf` and Zone.js still work in some cases, but that's not Angular 22 style. `ng version` shows the version in a project.

## What's next

Next: the TypeScript you need to write Angular.
