---
title: "Error handling in Angular: ErrorHandler, resource and @boundary"
summary: "Where errors go in an Angular app: a custom ErrorHandler, provideBrowserGlobalErrorListeners, errors as state in resource and HTTP, and the @boundary block (developer preview in 22.2)."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 56 }
---

An error nobody catches doesn't crash an Angular app. It reaches `ErrorHandler`, which by default only writes it to the console, and the screen stays as it was. This post shows where to catch errors: centrally, in data, and in the template.

Every example was checked with Angular 22.2 and Vitest.

## Your own ErrorHandler

```typescript
import { ErrorDetails, ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class ReportingErrorHandler implements ErrorHandler {
  readonly reported: unknown[] = [];

  handleError(error: unknown) {
    this.reported.push(error);
    console.error('Reported:', error);
  }

  onViewError(error: Error, details: ErrorDetails) {
    console.warn('Caught by @boundary in', details.boundary?.type.name, error.message);
  }
}
```

```typescript
import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { ReportingErrorHandler } from './reporting-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: ReportingErrorHandler },
  ],
};
```

`handleError` receives every uncaught error. Here it's stored in an array; in a real app you send it to a monitoring service. `{ provide: ErrorHandler, useClass: ... }` replaces the default (providers have [their own post](en/posts/angular-providers/)). `onViewError` is optional and belongs to `@boundary`, further down.

[`provideBrowserGlobalErrorListeners`](https://angular.dev/best-practices/error-handling) listens to the `error` and `unhandledrejection` events of `window` and forwards them to `ErrorHandler`. `ng new` already adds it to `app.config.ts`.

## Which errors reach ErrorHandler

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-save-button',
  template: `
    <button (click)="save()">Save</button>
    <button (click)="later()">Save later</button>
  `,
})
export class SaveButton {
  save() {
    throw new Error('Save failed');
  }

  later() {
    setTimeout(() => {
      throw new Error('Background save failed');
    });
  }
}
```

- `save()` runs from a listener Angular calls, so Angular catches the error and passes it to `handleError`. The same goes for constructors and lifecycle methods.
- The `setTimeout` callback runs outside Angular. The error reaches the `error` event of `window`, and from there `handleError` only thanks to `provideBrowserGlobalErrorListeners`.
- An error from an API your code calls directly is yours to handle: `try`/`catch` or `catchError`.

In tests, TestBed rethrows these errors so the test fails. `rethrowApplicationErrors: false` in `configureTestingModule` sends them to `ErrorHandler` instead.

## resource and HTTP: errors as state

`resource` doesn't forward errors to `ErrorHandler`. It keeps them in `error()` and `status()`, and the template decides what to show:

```typescript
import { Component, resource } from '@angular/core';

@Component({
  selector: 'app-profile',
  template: `
    @if (user.error(); as error) {
      <p>Couldn't load the profile: {{ error.message }}</p>
      <button (click)="user.reload()">Retry</button>
    } @else if (user.hasValue()) {
      <p>{{ user.value().name }}</p>
    }
  `,
})
export class Profile {
  protected readonly user = resource({
    loader: async (): Promise<{ name: string }> => {
      throw new Error('Server unavailable');
    },
  });
}
```

It shows `Couldn't load the profile: Server unavailable`, and `handleError` isn't called at all. `resource` has [its own post](en/posts/angular-resource/), and HTTP errors, including `catchError` and retries, are in the [HTTP errors post](en/posts/angular-http-errors/).

## @boundary

`@boundary` is a template block added in 22.2, and [the docs](https://angular.dev/guide/templates/error-boundaries) mark it as developer preview: the API may still change. It catches errors from components and directives inside it, on first render or during change detection, and shows `@error` in their place:

```typescript
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-price',
  template: `<p>{{ formatted() }}</p>`,
})
export class Price {
  readonly amount = input.required<number>();
  protected readonly formatted = computed(() => {
    if (this.amount() < 0) throw new Error(`Invalid amount: ${this.amount()}`);
    return `₪${this.amount().toFixed(2)}`;
  });
}
```

```typescript
import { Component, signal } from '@angular/core';
import { Price } from './price';

@Component({
  selector: 'app-cart',
  imports: [Price],
  template: `
    @boundary {
      <app-price [amount]="total()" />
    } @error {
      <p>Couldn't show the price: {{ $error.message }}</p>
      <button (click)="total.set(0); $reset()">Reset</button>
    }
    <app-price [amount]="10" />
  `,
})
export class Cart {
  protected readonly total = signal(-5);
}
```

- It shows `Couldn't show the price: Invalid amount: -5`, and the second price, outside the block, renders normally.
- `$error` is the caught error. `$reset()` renders the original content again; here, after resetting the amount, it shows `₪0.00`.
- In my test the error reached the `ErrorHandler`'s `onViewError`, not `handleError`.
- You can have several `@error` blocks with `when`, such as `@error (let err; when isNetworkError(err))`. Angular picks the first that matches, and an `@error` without `when` catches the rest.

## Mistakes beginners make

- **Relying on `ErrorHandler` for user messages.** The docs describe it as a way to report errors, not to show them. A message to the user belongs where the error happened.
- **Removing `provideBrowserGlobalErrorListeners`.** Errors in `setTimeout` and promises rejected without a `catch` stop reaching `ErrorHandler`.
- **Wrapping `<ng-content>` in `@boundary`.** Errors in projected content belong to the template that declared it, and aren't caught there. Wrap the component in the parent template.

## What's next

Next: testing components with TestBed and Vitest.
