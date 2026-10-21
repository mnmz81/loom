---
title: "Providers in Angular: useClass, useValue, useFactory and InjectionToken"
summary: "How to tell Angular what to inject: providers in app.config.ts, useClass, useValue, useFactory and useExisting, InjectionToken, the injector hierarchy, and optional, self and skipSelf."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 30 }
---

A provider is an instruction to Angular: when someone asks for this token, give them this value. `@Service()` from the previous post creates such a provider on its own. Here you write them yourself.

Every example was checked with Angular 22.2 and Vitest.

## providers in app.config.ts

A new project's `app.config.ts` already has a `providers` array. Everything registered there is available to the whole app:

```typescript
import { ApplicationConfig, InjectionToken, inject } from '@angular/core';

export abstract class Logger {
  abstract log(message: string): string;
}

export class ConsoleLogger extends Logger {
  log(message: string) {
    return `[console] ${message}`;
  }
}

export const API_URL = new InjectionToken<string>('API_URL');
export const USERS_URL = new InjectionToken<string>('USERS_URL');

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: Logger, useClass: ConsoleLogger },
    { provide: API_URL, useValue: 'https://api.example.com' },
    { provide: USERS_URL, useFactory: () => `${inject(API_URL)}/users` },
  ],
};
```

`provide` is the token, and the second key sets the value ([provider types](https://angular.dev/guide/di/defining-dependency-providers)):

- `useClass`: Angular creates an instance of the class. `inject(Logger)` returns a `ConsoleLogger`, and a test can swap in another class without touching the code that uses it.
- `useValue`: a ready value of any type.
- `useFactory`: a function that computes the value. It runs in an injection context, so `inject` is allowed in it. `inject(USERS_URL)` returns `https://api.example.com/users`.
- `useExisting`: an alias. `{ provide: OldLogger, useExisting: Logger }` makes both tokens return the same instance.

## InjectionToken

A class's token is the class itself. A string, a number or an interface has no runtime representation, so you create an [`InjectionToken`](https://angular.dev/api/core/InjectionToken) for it. The generic type (`<string>`) sets what `inject` returns. The string passed to the constructor is only for error messages: Angular compares tokens by object, so two tokens with the same description are two different tokens.

A token can also get a `factory`, like `ANALYTICS_ENABLED` in the previous post. Such a token registers itself in root, and the factory gives a default value that a provider can override.

## The injector hierarchy

Angular doesn't have one injector but a [tree](https://angular.dev/guide/di/hierarchical-dependency-injection):

- **element injectors**: for every component or directive that has `providers`. That's how `Draft` in the previous post got a separate instance per editor.
- **environment injectors**: root, built from `app.config.ts` and from `@Service()` services, and the platform injector above it.

When `inject(X)` is called, Angular looks first in the component's element injector and walks up the component tree. If it finds nothing, it moves on to the environment injectors. If it's not there either, NG0201 is thrown. The first provider found wins, so a provider in a component hides the one in root.

## Changing the lookup: optional, self and skipSelf

The second argument of `inject` changes the lookup:

```typescript
import { Component, Service, inject } from '@angular/core';

@Service({ autoProvided: false })
export class Theme {
  name = 'light';
}

@Component({
  selector: 'app-panel',
  providers: [{ provide: Theme, useValue: { name: 'dark' } }],
  template: `own: {{ own.name }}, parent: {{ parent?.name ?? 'none' }}`,
})
export class Panel {
  protected readonly own = inject(Theme, { self: true });
  protected readonly parent = inject(Theme, { skipSelf: true, optional: true });
}
```

- `self: true` looks only in the component's own injector, and finds `dark`.
- `skipSelf: true` starts at the parent and skips the local provider.
- `optional: true` returns `null` instead of throwing when nothing is found.

On its own, `app-panel` shows `own: dark, parent: none`. Inside a component with `providers: [Theme]` it shows `own: dark, parent: light`. There's also `host: true`, which stops the lookup at the host component.

### In older versions

Before `inject()`, the same options were decorators on constructor parameters, and `useFactory` got its dependencies through `deps`:

```typescript
import { Component, Inject, Optional, SkipSelf } from '@angular/core';
import { API_URL, USERS_URL } from './logger';
import { Theme } from './modifiers';

export const oldProviders = [
  { provide: USERS_URL, useFactory: (api: string) => `${api}/users`, deps: [API_URL] },
];

@Component({ selector: 'app-old-panel', template: `{{ url }} {{ parent?.name ?? 'none' }}` })
export class OldPanel {
  constructor(
    @Inject(USERS_URL) protected url: string,
    @Optional() @SkipSelf() protected parent: Theme | null,
  ) {}
}
```

`@Inject(TOKEN)` is needed because the parameter type (`string`) isn't enough to identify the token. `deps` lists the tokens in the order of the factory's parameters. `@Self()` and `@Host()` work the same way.

## Mistakes beginners make

- **Using an interface as a token.** `inject(MyInterface)` doesn't compile, because interfaces are erased at compile time. Use an `InjectionToken` or an abstract class, like `Logger`.
- **Creating the same `InjectionToken` twice.** Every `new InjectionToken` is a new token, even with the same description. Export it from one file and import it.

## What's next

Next: advanced DI. Providers with `multi: true`, functions that run at app startup, your own environment injectors, and `injectAsync` for lazy-loading a service.
