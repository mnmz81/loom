---
title: "Validation in Signal Forms: built-in, your own, and server checks"
summary: "Validation in Angular 22 Signal Forms: required, email and minLength with messages, when to show errors, validate() for your own rules and cross-field checks, when, and validateHttp with pending."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 47 }
---

In Signal Forms every validation rule of a form is written in one function, the schema, passed as the second argument of `form()`. This post continues [the basics](en/posts/angular-signal-forms/) and adds checks and error messages to the form.

Every example was checked with Angular 22.2 and Vitest.

## Built-in validators

```typescript
import { Component, signal } from '@angular/core';
import { email, form, FormField, FormRoot, minLength, required } from '@angular/forms/signals';

@Component({
  selector: 'app-signup',
  imports: [FormField, FormRoot],
  template: `
    <form [formRoot]="signupForm">
      <input type="email" [formField]="signupForm.email" />
      @if (signupForm.email().touched() && signupForm.email().invalid()) {
        @for (error of signupForm.email().errors(); track error.kind) {
          <p class="error">{{ error.message }}</p>
        }
      }
      <input type="password" [formField]="signupForm.password" />
      @if (signupForm.password().touched() && signupForm.password().invalid()) {
        @for (error of signupForm.password().errors(); track error.kind) {
          <p class="error">{{ error.message }}</p>
        }
      }
      <button type="submit">Sign up</button>
    </form>
  `,
})
export class Signup {
  protected readonly model = signal({ email: '', password: '' });
  protected readonly signupForm = form(
    this.model,
    (path) => {
      required(path.email, { message: 'Email is required' });
      email(path.email, { message: 'Enter a valid email' });
      required(path.password, { message: 'Password is required' });
      minLength(path.password, 8, { message: 'At least 8 characters' });
    },
    { submission: { action: async (field) => console.log('Saving', field().value()) } },
  );
}
```

The schema receives `path`, a tree of paths with the same shape as the model, and each validator binds to one path. The schema runs once when the form is created; the rules themselves rerun on every value change. The [built-in ones](https://angular.dev/guide/forms/signals/validation) are `required`, `email`, `min`, `max`, `minLength`, `maxLength`, `pattern`, `minDate` and `maxDate`, and all accept a `message`.

Each error in `errors()` is an object with a `kind` (for example `'required'`) and a `message`. Every rule runs, not only the first one that fails, so one field can have several errors. `minLength` doesn't fail an empty value: in the test, an empty password showed only `Password is required`, and the password `abc` showed only `At least 8 characters`. So a required field needs its own `required`.

## When to show errors

The `touched() && invalid()` condition hides errors until the user leaves the field. In the test of the form above:

1. On load there are no errors, even though both fields are invalid.
2. After typing `a@` there is still no error, because the field isn't touched.
3. After leaving the field, `Enter a valid email` appears.
4. Clicking Sign up marks every field as touched, so `Password is required` appears too, and `action` doesn't run.

Only once both values are valid does submitting run `action` with `{ email: 'dana@example.com', password: 'abcdefgh' }`.

## Your own validators

```typescript
import { Component, signal } from '@angular/core';
import { form, FormField, required, SchemaPath, validate } from '@angular/forms/signals';

function noSpaces(path: SchemaPath<string>) {
  validate(path, ({ value }) =>
    value().includes(' ') ? { kind: 'noSpaces', message: 'No spaces allowed' } : null,
  );
}

@Component({
  selector: 'app-change-password',
  imports: [FormField],
  template: `
    <input type="password" [formField]="passwordForm.password" />
    <input type="password" [formField]="passwordForm.confirm" />
    @for (error of passwordForm().errorSummary(); track error) {
      <p class="error">{{ error.message }}</p>
    }
  `,
})
export class ChangePassword {
  protected readonly model = signal({ password: '', confirm: '' });
  protected readonly passwordForm = form(this.model, (path) => {
    required(path.password, { message: 'Password is required' });
    noSpaces(path.password);
    validate(path.confirm, ({ value, valueOf }) =>
      value() === valueOf(path.password)
        ? null
        : { kind: 'mismatch', message: 'Passwords do not match' },
    );
  });
}
```

- `validate(path, fn)` runs a function that returns an error object, or `null` when the value is valid. `value` is the field's signal.
- `noSpaces` is a plain function that wraps `validate`, and you use it like a built-in validator. `SchemaPath<string>` limits it to string fields.
- `valueOf(path.password)` reads another field. The `confirm` rule reruns when the password changes too: in the test, changing the password to `mypass2` after the fields matched brought back `Passwords do not match`.
- `errorSummary()` on the root collects the errors from every field.

## A rule with a condition

```typescript
import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';

@Component({
  selector: 'app-checkout',
  imports: [FormField],
  template: `
    <label><input type="checkbox" [formField]="checkoutForm.hasPromo" /> I have a code</label>
    <input [formField]="checkoutForm.promoCode" />
    <p>Valid: {{ checkoutForm().valid() }}</p>
  `,
})
export class Checkout {
  protected readonly model = signal({ hasPromo: false, promoCode: '' });
  protected readonly checkoutForm = form(this.model, (path) => {
    required(path.promoCode, {
      message: 'Enter the code',
      when: ({ valueOf }) => valueOf(path.hasPromo),
    });
  });
}
```

The rule is active only while `when` returns `true`, and `when` updates like a `computed`. In the test the form was valid, and ticking the box made it invalid. To switch a whole group of rules on a condition there is `applyWhen()`, described in the [schemas guide](https://angular.dev/guide/forms/signals/schemas).

## Checking against the server

```typescript
import { Component, signal } from '@angular/core';
import { debounce, form, FormField, required, validateHttp } from '@angular/forms/signals';

@Component({
  selector: 'app-username',
  imports: [FormField],
  template: `
    <input [formField]="usernameForm.username" />
    @if (usernameForm.username().pending()) {
      <p>Checking...</p>
    }
    @for (error of usernameForm.username().errors(); track error.kind) {
      <p class="error">{{ error.message }}</p>
    }
  `,
})
export class Username {
  protected readonly model = signal({ username: '' });
  protected readonly usernameForm = form(this.model, (path) => {
    debounce(path.username, 300);
    required(path.username, { message: 'Pick a username' });
    validateHttp(path.username, {
      request: ({ value }) => `/api/users/check?username=${encodeURIComponent(value())}`,
      onSuccess: (response: { available: boolean }) =>
        response.available ? null : { kind: 'taken', message: 'Username is taken' },
      onError: () => ({ kind: 'serverError', message: 'Could not check the username' }),
    });
  });
}
```

[`validateHttp`](https://angular.dev/guide/forms/signals/async-operations) sends the request through `HttpClient`, so the app needs [`provideHttpClient()`](en/posts/angular-http-client/). `onSuccess` maps the response to an error or `null`, and `onError` handles a network failure. What the test (with `HttpTestingController`) showed:

- `debounce(path.username, 300)` delays the write to the model: right after typing no request was sent, and after 300ms exactly one request went out.
- During the request `pending()` was `true` and `Checking...` appeared. Both `valid()` and `invalid()` were `false`.
- When an empty field failed `required`, no request was sent at all: async validation runs only after every synchronous check has passed.

For checks that don't go over HTTP there is `validateAsync()`, which takes a [resource](en/posts/angular-resource/) of your own.

## Mistakes beginners make

- **`!valid()` instead of `invalid()`.** During an async check both are `false`, so `!valid()` shows "invalid" before the server has answered.
- **Showing errors without `touched()`.** The form loads with an error on every empty field, before the user has typed anything.

## What's next

Next: nested objects, arrays of fields with adding and removing rows, fields disabled or hidden by a condition, and handling server errors on submit.
