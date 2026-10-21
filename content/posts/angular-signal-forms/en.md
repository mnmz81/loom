---
title: "Signal Forms in Angular: a model, form() and [formField]"
summary: "Signal Forms basics in Angular 22: a model in a signal, form() building a field tree, [formField] binding it to the template, reading value, touched and dirty, and submitting with FormRoot."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 46 }
---

Signal Forms build a form on top of a [signal](en/posts/angular-signals/) that holds the data. The [previous post](en/posts/angular-forms-overview/) showed them next to the other two approaches. Here we build one from scratch, still without validation, which gets its own post.

Every example was checked with Angular 22.2 and Vitest.

## A model, form() and [formField]

```typescript
import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';

interface Profile {
  name: string;
  age: number;
  plan: string;
  newsletter: boolean;
}

@Component({
  selector: 'app-profile-editor',
  imports: [FormField, JsonPipe],
  template: `
    <input [formField]="profileForm.name" />
    <input type="number" [formField]="profileForm.age" />
    <select [formField]="profileForm.plan">
      <option value="free">Free</option>
      <option value="pro">Pro</option>
    </select>
    <label>
      <input type="checkbox" [formField]="profileForm.newsletter" />
      Newsletter
    </label>
    <pre>{{ model() | json }}</pre>
  `,
})
export class ProfileEditor {
  protected readonly model = signal<Profile>({
    name: '',
    age: 30,
    plan: 'free',
    newsletter: false,
  });
  protected readonly profileForm = form(this.model);
}
```

Three parts:

- **The model** is a plain `signal` with an initial value for every field. [The docs](https://angular.dev/guide/forms/signals/models) call it the form's single source of truth.
- **`form(this.model)`** returns a `FieldTree`: a tree with the same shape as the model, so `profileForm.name` is the field for `name`. `form()` keeps no copy of its own; it reads and writes the model directly. It needs an [injection context](en/posts/angular-inject/), so you create it in a class field.
- **`[formField]`** binds an input to a field in both directions. The `FormField` directive must be in `imports`.

After typing `Dana` and `31`, picking Pro and ticking the box, the `<pre>` shows:

```text
{
  "name": "Dana",
  "age": 31,
  "plan": "pro",
  "newsletter": true
}
```

`age` is stored as a number, not a string: per [the guide](https://angular.dev/essentials/signal-forms), `type="number"` converts between the two, and a checkbox binds to a boolean.

## Types from the model

The tree takes its types from the interface, so a wrong field name is caught at build time, in the template too:

```text
✘ [ERROR] TS2339: Property 'email' does not exist on type 'FieldTree<Profile, string | number, "writable">'.
```

## Reading state and updating from code

Every field in the tree is also a function. Calling `profileForm.name()` returns a `FieldState`, an object of signals that describe the field:

```typescript
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';

@Component({
  selector: 'app-name-state',
  imports: [FormField],
  template: `
    <input [formField]="nameForm.name" />
    <p>Value: {{ nameForm.name().value() }}</p>
    <p>Touched: {{ nameForm.name().touched() }}, dirty: {{ nameForm().dirty() }}</p>
    <button (click)="load()">Load</button>
  `,
})
export class NameState {
  protected readonly model = signal({ name: '' });
  protected readonly nameForm = form(this.model);

  load() {
    this.nameForm.name().value.set('Noa');
  }
}
```

- `value()` is the current value. It is a `WritableSignal`, so `value.set('Noa')` updates both the input and the model. `this.model.set(...)` works just as well when you want to replace all the data, for example after loading it from a server.
- `touched()` becomes `true` once the user enters the field and leaves it.
- `dirty()` becomes `true` once the user changes the value. In the test, clicking Load left it `false`, and typing turned it `true`.
- `nameForm()`, calling the root of the tree, returns the state of the whole form. The root is dirty if any field is.

There are more signals: `valid()`, `invalid()`, `errors()`, `pending()`, `disabled()`, `hidden()` and `readonly()`. The full list is in the [field state guide](https://angular.dev/guide/forms/signals/field-state-management).

## Submitting

```typescript
import { Component, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';

@Component({
  selector: 'app-newsletter',
  imports: [FormField, FormRoot],
  template: `
    <form [formRoot]="newsletterForm">
      <input type="email" [formField]="newsletterForm.email" />
      <button type="submit" [disabled]="newsletterForm().submitting()">
        {{ newsletterForm().submitting() ? 'Saving...' : 'Subscribe' }}
      </button>
    </form>
    @if (saved()) {
      <p>Saved {{ saved() }}</p>
    }
  `,
})
export class Newsletter {
  protected readonly model = signal({ email: '' });
  protected readonly saved = signal('');
  protected readonly newsletterForm = form(this.model, {
    submission: {
      action: async (field) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        this.saved.set(field().value().email);
      },
    },
  });
}
```

The `FormRoot` directive on `<form>` [does three things](https://angular.dev/guide/forms/signals/form-submission): it adds `novalidate`, prevents the browser's normal submit, and calls `submit()`. `submit()` marks every field as touched, stops if there are validation errors, and otherwise runs `action` from the `submission` option. While `action` runs, `submitting()` is `true`: in the test the button showed `Saving...` and was disabled, and half a second later it went back to `Subscribe` and `Saved dana@example.com` appeared.

You can also call `submit(this.newsletterForm, action)` directly from any method, without `FormRoot`. It returns a `Promise<boolean>` that is `true` when the action succeeded.

### In older versions

In Angular 21 Signal Forms were [experimental](https://v21.angular.dev/guide/forms/signals/overview), and the API changed between minor versions. In 21.0 the directive was called `Field` and templates used `<input [field]="loginForm.email" />`; 21.1 renamed it to `FormField` and `[formField]`. In 21.0 and 21.1 `submit(form, action)` returned `Promise<void>`, and there was no `FormRoot` and no `submission` option. In 21.2.25 both already exist. The comparison was made against the type files of the `@angular/forms` package in each version.

## Mistakes beginners make

- **An optional field in the model.** A field whose value is `undefined` is left out of the tree, and `phone?: string` fails the build with `Type 'undefined' is not assignable to type 'Field<string, string | number>'`. Give every field an initial value, such as `''`.
- **`null` in a text field.** `nick: string | null` bound to a plain `<input>` fails the build, because per [the docs](https://angular.dev/guide/forms/signals/models) text controls don't support `null`. An empty text field is `''`.

## What's next

Next: validation in Signal Forms. Built-in validators, your own validators, showing errors, and async checks against a server.
