---
title: "HttpClient in Angular: GET, POST, typed responses and toSignal"
summary: "Calling a server with HttpClient in Angular 22: provideHttpClient, typed get and post, params and headers, toSignal vs subscribe, and testing with HttpTestingController without a real server."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 38 }
---

`HttpClient` is Angular's service for HTTP calls. Every method returns an Observable, and all of its code can be tested without a server.

Every example was checked with Angular 22.2 and RxJS 7.8, in Vitest specs with `HttpTestingController` instead of a server.

## Setup: provideHttpClient

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
```

According to the [setup guide](https://angular.dev/guide/http/setup), since version 21 `HttpClient` can be injected even without this line. `provideHttpClient` is where you add features to it, such as interceptors, the topic of the next post.

Requests go out through the browser's `fetch`. `provideHttpClient(withXhr())` switches to `XMLHttpRequest`, which you need only to [report file upload progress](https://angular.dev/api/common/http/withXhr).

## A service with typed requests

```typescript
// user-api.ts
import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface User {
  id: number;
  name: string;
}

@Service()
export class UserApi {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<User[]>('/api/users');
  }

  search(q: string, page: number) {
    return this.http.get<User[]>('/api/users', {
      params: { q, page },
      headers: { 'X-Client': 'loom' },
    });
  }

  create(name: string) {
    return this.http.post<User>('/api/users', { name });
  }
}
```

- `inject(HttpClient)` gets the service ([inject](en/posts/angular-inject/)), and `@Service()` registers the class in DI ([@Service](en/posts/angular-service-decorator/)).
- `get<User[]>` tells TypeScript what comes back. `post` sends its second argument as a JSON body.
- `params` becomes the query string and `headers` the request headers. The request from `search('ada', 2)` goes to:

```text
/api/users?q=ada&page=2
```

The type is an assumption, not a check. [The docs](https://angular.dev/guide/http/making-requests) say plainly that `HttpClient` doesn't verify the response against it: if the server returns `[{ "id": "1", "title": "x" }]`, `users[0].name` is `undefined` with no error at all. For checking at runtime, see [validating data at runtime](en/posts/typescript-runtime-validation/).

## In a component: toSignal or subscribe

```typescript
// users.ts
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { User, UserApi } from './user-api';

@Component({
  selector: 'app-users',
  template: `
    <ul>
      @for (user of users(); track user.id) {
        <li>{{ user.name }}</li>
      }
    </ul>
    <button (click)="add()">Add Grace</button>
    <p>Added: {{ added()?.name }}</p>
  `,
})
export class Users {
  private readonly api = inject(UserApi);
  protected readonly users = toSignal(this.api.list(), { initialValue: [] });
  protected readonly added = signal<User | undefined>(undefined);

  protected add() {
    this.api.create('Grace').subscribe((user) => this.added.set(user));
  }
}
```

An `HttpClient` Observable is "cold": no request goes out until something subscribes to it, and unsubscribing cancels a request that hasn't returned yet.

- **Reading data to display:** `toSignal` subscribes right away, returns a signal the template reads, and unsubscribes when the component is destroyed. `initialValue` is the value until the response arrives. The [RxJS and signals](en/posts/angular-rxjs-interop/) post goes deeper.
- **An action in response to an event:** a manual `subscribe` suits a POST on click. An HTTP request completes after one response, so nothing leaks here.

## Testing without a server

```typescript
// users.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Users } from './users';

describe('Users', () => {
  it('loads the list, then posts a new user', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Users);

    http.expectOne('/api/users').flush([{ id: 1, name: 'Ada' }]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('li').textContent).toBe('Ada');

    fixture.nativeElement.querySelector('button').click();
    const req = http.expectOne({ method: 'POST', url: '/api/users' });
    expect(req.request.body).toEqual({ name: 'Grace' });
    req.flush({ id: 2, name: 'Grace' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('p').textContent).toBe('Added: Grace');
    http.verify();
  });
});
```

`provideHttpClientTesting()` replaces sending to the network with a test controller, which is why it comes after `provideHttpClient()`. `expectOne` checks that exactly one matching request went out, `flush` answers it, and `verify` fails if a request was left unanswered ([testing guide](https://angular.dev/guide/http/testing)).

### In older versions

```typescript
import { NgModule } from '@angular/core';
import { HttpClientModule, provideHttpClient, withFetch } from '@angular/common/http';

// Apps built on NgModules imported HttpClientModule
@NgModule({
  imports: [HttpClientModule],
})
export class AppModule {}

// Before Angular 22, provideHttpClient used XMLHttpRequest unless you added withFetch()
export const providers = [provideHttpClient(withFetch())];
```

`HttpClientModule` is [deprecated](https://angular.dev/api/common/http/HttpClientModule); use `provideHttpClient()` instead. `withFetch()` is deprecated since `fetch` became the default in version 22. `ng update` to version 22 adds `withXhr()` to every `provideHttpClient()` call that has neither `withFetch()` nor `withXhr()`, to keep the old behaviour; an existing `withFetch()` stays where it is.

## Mistakes beginners make

- **Calling `get` without subscribing** (or `toSignal`, or `async`) and waiting for the request. It never goes out.
- **Trusting `get<T>`.** The type checks nothing. Data that comes from outside needs validating.
- **Building the query string by hand** (`'/api/users?q=' + q`). `params` encodes the values for you.

## What's next

Next post: interceptors, functions that wrap every request, for example to add an authorization header or to log.
