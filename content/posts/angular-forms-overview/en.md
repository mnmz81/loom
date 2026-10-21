---
title: "Forms in Angular: template-driven, Reactive Forms or Signal Forms?"
summary: "The three ways to build a form in Angular 22: ngModel in the template, Reactive Forms and Signal Forms. The same form in all three, how they differ and how to choose."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 45 }
---

Angular has three ways to build a form, and all three live in the `@angular/forms` package. To see the difference, this post builds the same newsletter signup form with each one: a required email field, and a button that stays disabled until the address is valid.

Every example was checked with Angular 22.2 and Vitest.

## Template-driven: ngModel in the template

```typescript
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-signup-template',
  imports: [FormsModule],
  template: `
    <form #signupForm="ngForm" (ngSubmit)="save()">
      <input type="email" name="email" [(ngModel)]="email" required email />
      <button [disabled]="signupForm.invalid">Join</button>
    </form>
  `,
})
export class SignupTemplate {
  protected readonly email = signal('');

  save() {
    console.log('Saving', this.email());
  }
}
```

Everything is in the template. `[(ngModel)]` connects the field to a signal in the component, and the checks are HTML attributes (`required`, `email`) that `FormsModule` turns into validators. The `NgModel` directive creates a `FormControl` for each field behind the scenes, and `#signupForm="ngForm"` gives access to the state of the whole form. Per [the docs](https://angular.dev/guide/forms), this approach suits a simple form like an email list signup, but it doesn't scale well to complex forms.

## Reactive Forms: an explicit model in code

```typescript
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-signup-reactive',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="signupForm" (ngSubmit)="save()">
      <input type="email" formControlName="email" />
      <button [disabled]="signupForm.invalid">Join</button>
    </form>
  `,
})
export class SignupReactive {
  protected readonly signupForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  save() {
    console.log('Saving', this.signupForm.getRawValue().email);
  }
}
```

Here the form is a tree of objects (`FormGroup`, `FormControl`) built in the class, and the template only connects to it. Validators are functions, types are inferred from the initial values, and changes are exposed as an Observable (`valueChanges`). Reactive Forms get [their own post](en/posts/angular-reactive-forms/) later in this level.

## Signal Forms: a form on top of a signal

```typescript
import { Component, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';

@Component({
  selector: 'app-signup-signal',
  imports: [FormField, FormRoot],
  template: `
    <form [formRoot]="signupForm">
      <input type="email" [formField]="signupForm.email" />
      <button [disabled]="signupForm().invalid()">Join</button>
    </form>
  `,
})
export class SignupSignal {
  protected readonly model = signal({ email: '' });
  protected readonly signupForm = form(
    this.model,
    (path) => {
      required(path.email);
      email(path.email);
    },
    { submission: { action: async () => console.log('Saving', this.model().email) } },
  );
}
```

The data sits in a plain [signal](en/posts/angular-signals/), `form()` builds a tree of fields with the same shape, and `[formField]` connects each field to an input in both directions. All checks are defined in one place, the schema function, and every piece of state (value, validity, touched) is a signal. `[formRoot]` cancels the browser's normal submit and runs `action` only when the form is valid. [Signal Forms are stable since version 22](https://angular.dev/guide/forms/signals/comparison) and are imported from `@angular/forms/signals`.

All three examples behave the same: the button is disabled after `bad`, enabled after `dana@example.com`, and submitting prints `Saving dana@example.com`.

## How to choose

| | Template-driven | Reactive Forms | Signal Forms |
|---|---|---|---|
| Where the data lives | Fields in the component | `FormControl` / `FormGroup` | A signal you define |
| Where the checks live | Attributes in the template | A validator list per control | One schema, by path |
| Types | Minimal | Explicit (typed forms) | Inferred from the model |
| Changes exposed as | Managed by Angular | Observables | Signals |

Per the [comparison guide](https://angular.dev/guide/forms/signals/comparison):

- **New, signal-based code:** Signal Forms. [The docs](https://angular.dev/guide/forms/signals/overview) say they work best in new applications.
- **An existing project with Reactive Forms:** keep using them. The docs call them "a solid choice" in an existing app, and there is a [migration guide](https://angular.dev/guide/forms/signals/migration) for moving over gradually.
- **A small form, a prototype, or existing ngModel code:** template-driven.

### In older versions

Up to version 20 only the first two approaches existed. Signal Forms arrived in Angular 21 [as experimental](https://v21.angular.dev/guide/forms/signals/overview), and the API changed during that period: in 21.0 the directive was called `Field` and templates used `[field]`; from 21.1 it is `FormField` with `[formField]`. Tutorials from the v21 days may show the old name. Older tutorials also bind `ngModel` to a plain field instead of a signal, for example `email = ''`, and that still works.

## Mistakes beginners make

- **Forgetting to import the module or the directive.** Without `FormsModule`, `ReactiveFormsModule` or `FormField` in `imports`, the build fails:

```text
✘ [ERROR] NG8002: Can't bind to 'formField' since it isn't a known property of 'input'.
```

- **`ngModel` inside a `<form>` without `name`.** `NgForm` registers each field by its name, and without one you get a runtime error: `NG01352: If ngModel is used within a form tag, either the name attribute must be set or the form control must be defined as 'standalone' in ngModelOptions.`

## What's next

Next: Signal Forms basics. A model, `form()`, binding fields with `[formField]`, reading state and submitting.
