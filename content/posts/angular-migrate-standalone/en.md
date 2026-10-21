---
title: "Moving from NgModule to standalone with Angular's migration"
summary: "The ng generate @angular/core:standalone migration on a real NgModule app: its three steps, what each one changed, where the build broke and what was fixed by hand."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 81 }
---

Since version 19 components are standalone by default, but many projects are still built on NgModule. Angular has a migration that does most of the move. This post runs it on a small app and also shows what it didn't sort out.

Every example was checked with Angular 22.2.

## The app before

A root component, a root module, and another module with a component and a pipe:

```typescript
// main.ts
platformBrowser().bootstrapModule(AppModule).catch((err) => console.error(err));

// app.module.ts
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, GreetingModule],
  bootstrap: [AppComponent],
})
export class AppModule {}

// greeting/greeting.module.ts
@NgModule({
  declarations: [GreetingComponent, ShoutPipe],
  imports: [CommonModule],
  exports: [GreetingComponent],
})
export class GreetingModule {}

// greeting/greeting.component.ts
@Component({
  selector: 'app-greeting',
  standalone: false,
  template: `<p>Hello, {{ name | shout }}</p>`,
})
export class GreetingComponent {
  @Input() name = '';
}
```

(Import lines are left out.) `AppComponent` renders `<app-greeting name="Loom" />`, and `ShoutPipe` returns the text in capitals with an exclamation mark.

Per the [migration guide](https://angular.dev/reference/migrations/standalone), before you start you need a project that builds without errors and a clean git branch. Run the three steps in order, and check the build after each one.

## Step 1: declarations to standalone

```bash
ng generate @angular/core:standalone --mode=convert-to-standalone
```

```text
UPDATE src/app/greeting/greeting.component.ts (272 bytes)
UPDATE src/app/greeting/shout.pipe.ts (202 bytes)
UPDATE src/app/greeting/greeting.module.ts (330 bytes)
```

```typescript
@Component({
  selector: 'app-greeting',
  template: `<p>Hello, {{ name | shout }}</p>`,
  imports: [ShoutPipe],
})
export class GreetingComponent {
  @Input() name = '';
}
```

`standalone: false` is gone, and the pipe the template uses was added to `imports`. In `GreetingModule` the declarations moved from `declarations` to `imports`. `AppComponent` didn't change: this step skips a module that bootstraps a component (`bootstrap`).

## Step 2: removing unneeded modules

```bash
ng generate @angular/core:standalone --mode=prune-ng-modules
```

```text
DELETE src/app/greeting/greeting.module.ts
UPDATE src/app/app.module.ts (281 bytes)
```

`GreetingModule` was deleted, and the migration also removed it from `AppModule`'s `imports`. But it didn't put `GreetingComponent` there instead, and the build broke:

```text
✘ [ERROR] NG8001: 'app-greeting' is not a known element:
1. If 'app-greeting' is an Angular component, then verify that it is part of this module.
```

The manual fix: add `GreetingComponent` to `AppModule`'s `imports`. That's why you check the build after every step, not only at the end.

## Step 3: bootstrapping without a module

```bash
ng generate @angular/core:standalone --mode=standalone-bootstrap
```

```text
DELETE src/app/app.module.ts
UPDATE src/main.ts (333 bytes)
UPDATE src/app/app.component.ts (262 bytes)
```

`AppModule` was deleted, `AppComponent` got `imports: [GreetingComponent]`, and `main.ts` moved to `bootstrapApplication`:

```typescript
import { platformBrowser, BrowserModule, bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [importProvidersFrom(BrowserModule)],
}).catch((err) => console.error(err));
```

The migration carried the module's `imports` over as they were, through `importProvidersFrom`. `BrowserModule` isn't needed with `bootstrapApplication`, and `platformBrowser` is no longer used, so after cleanup this is left:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent).catch((err) => console.error(err));
```

The build passed, but the tests didn't: the spec still imported the deleted `AppModule`.

```text
✘ [ERROR] TS2307: Cannot find module './app.module' or its corresponding type declarations. [plugin angular-compiler]
```

Once the spec created `AppComponent` directly (`TestBed.createComponent(AppComponent)`), the test passed too. The guide warns about this: tests aren't AOT compiled, so what the migration writes in them isn't always right.

## Useful options

- `--path=src/app/orders` limits the migration to one folder, so a large project can move gradually.
- `--dry-run` (an option of every `ng generate`) shows which files would change without writing them.

After the move, the code still uses `@Input` and constructor injection. Other migrations handle those, in the next post.

## Mistakes beginners make

- **Running all three steps in a row and checking only at the end.** When the build breaks, it's no longer clear which step broke it.
- **Keeping the code the migration wrote as is.** `importProvidersFrom(BrowserModule)` and unused imports work, but they're noise worth cleaning up.
- **Forgetting the tests.** Spec files that import a deleted module break, and you fix them by hand.

## What's next

Next: signal migrations. `@Input`, `@Output`, `@ViewChild`, constructor injection and `*ngIf`, each with its own schematic.
