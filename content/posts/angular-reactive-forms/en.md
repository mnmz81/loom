---
title: "Reactive Forms in Angular: FormGroup, FormBuilder and typed forms"
summary: "Reactive Forms for existing code: FormGroup and FormControl, FormBuilder, typed forms since v14, validators, and why valueChanges needs toSignal or markForCheck in a zoneless app."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 49 }
---

Reactive Forms were the main way to build forms in Angular until [Signal Forms](en/posts/angular-signal-forms/) arrived, so they are in a lot of existing code. [The docs](https://angular.dev/guide/forms/signals/overview) recommend staying with them in an app that already uses them. This post shows what you need to read and maintain such a form.

Every example was checked with Angular 22.2 and Vitest.

## FormGroup and FormControl

```typescript
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="profileForm" (ngSubmit)="save()">
      <input formControlName="name" />
      <div formGroupName="address">
        <input formControlName="city" />
      </div>
      <button>Save</button>
    </form>
  `,
})
export class ProfileForm {
  protected readonly profileForm = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    address: new FormGroup({
      city: new FormControl('', { nonNullable: true }),
    }),
  });

  save() {
    console.log(this.profileForm.value);
  }
}
```

A `FormControl` holds the value and state of one field, and a `FormGroup` combines several controls, nested groups included. In the template, `[formGroup]` connects the `<form>` to the group, `formControlName` connects an input by name, and `formGroupName` steps into the nested group. `ngSubmit` runs on submit, and in the test it printed `{ name: 'Dana', address: { city: 'Haifa' } }`.

## FormBuilder, types and validators

```typescript
import { Component, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';

const noSpaces: ValidatorFn = (control) =>
  String(control.value).includes(' ') ? { noSpaces: true } : null;

@Component({
  selector: 'app-signup-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="signupForm">
      <input formControlName="username" />
      @let username = signupForm.controls.username;
      @if (username.touched && username.hasError('required')) {
        <p class="error">Username is required</p>
      }
      @if (username.hasError('noSpaces')) {
        <p class="error">No spaces allowed</p>
      }
      <input type="number" formControlName="age" />
    </form>
  `,
})
export class SignupForm {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly signupForm = this.fb.group({
    username: ['', [Validators.required, noSpaces]],
    age: [18, Validators.min(18)],
  });
}
```

- **`FormBuilder`** builds the same tree in shorthand: a `[value, validators]` array per control. `NonNullableFormBuilder` adds `nonNullable: true` to all of them.
- **A validator** is a function that takes a control and returns an errors object or `null`. `Validators` holds the built-in ones, and `noSpaces` is our own. In the test, an `age` of 16 returned `{ min: { min: 18, actual: 16 } }`.
- **Error messages** live in the template, by key: `hasError('required')`. That is the most visible difference from Signal Forms, where the message is defined next to the rule.

Since [Angular 14](https://angular.dev/guide/forms/typed-forms) forms are typed by default: `age` is a `FormControl<number>`, so a value of another type fails the build:

```text
✘ [ERROR] TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

`nonNullable` matters because of `reset()`: without it a control goes back to `null` and its type includes `null`. With `nonNullable` it goes back to its initial value. In the test, `reset()` returned the form to `{ username: '', age: 18 }`.

## valueChanges in a zoneless app

Every control exposes its changes as an Observable (`valueChanges`). Here lies the trap of a [zoneless](en/posts/angular-zoneless/) app: per the [Reactive Forms guide](https://angular.dev/guide/forms/reactive-forms), changing the form model from code doesn't schedule change detection.

```typescript
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-quantity',
  imports: [ReactiveFormsModule],
  template: `
    <input type="number" [formControl]="quantity" />
    <p>Total: {{ quantity.value * 10 }}</p>
  `,
})
export class QuantityStale {
  protected readonly quantity = new FormControl(1, { nonNullable: true });

  constructor() {
    // stands in for data that arrives later, e.g. from the server
    setTimeout(() => this.quantity.setValue(5), 100);
  }
}
```

In the test, after `setValue(5)` the input showed `5` (the directive writes to the DOM directly), but the text stayed `Total: 10`. Typing by the user does refresh the view, because it is an event bound in the template. The simple fix is to turn the Observable into a signal with [`toSignal`](en/posts/angular-rxjs-interop/):

```typescript
import { Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-quantity',
  imports: [ReactiveFormsModule],
  template: `
    <input type="number" [formControl]="quantity" />
    <p>Total: {{ quantityValue() * 10 }}</p>
  `,
})
export class Quantity {
  protected readonly quantity = new FormControl(1, { nonNullable: true });
  protected readonly quantityValue = toSignal(this.quantity.valueChanges, {
    initialValue: this.quantity.value,
  });

  constructor() {
    setTimeout(() => this.quantity.setValue(5), 100);
  }
}
```

Now the template reads a signal, and the text updated to `Total: 50`. The docs also offer a second way: subscribe to `valueChanges` with `takeUntilDestroyed()` and call `ChangeDetectorRef.markForCheck()` on every change. That one passed the test too. The same problem applies to `FormArray.push()` from code: in the test the new row didn't appear without one of the fixes.

### In older versions

```typescript
import { Component, NgModule } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-old-profile',
  standalone: false,
  template: `
    <form [formGroup]="profileForm">
      <input formControlName="name" />
    </form>
  `,
})
export class OldProfileComponent {
  profileForm: UntypedFormGroup;

  constructor(private fb: UntypedFormBuilder) {
    this.profileForm = this.fb.group({ name: ['', Validators.required] });
  }

  get city() {
    return this.profileForm.value.adress.city; // typo compiles: value is any
  }
}

@NgModule({
  declarations: [OldProfileComponent],
  imports: [ReactiveFormsModule],
})
export class OldProfileModule {}
```

Before version 14 forms had no types, and `value` was `any`, so the `adress` typo passes the build. The types with the `Untyped` prefix (`UntypedFormGroup`, `UntypedFormControl`, `UntypedFormBuilder`) [behave exactly](https://angular.dev/guide/forms/typed-forms) like the types from before version 14, and [`UntypedFormGroup`](https://angular.dev/api/forms/UntypedFormGroup) is simply `FormGroup<any>`. When you see them in code, you can remove the prefix step by step and get types. Two more things mark old code: constructor injection instead of [`inject()`](en/posts/angular-inject/), and `ReactiveFormsModule` imported in an NgModule. With Zone.js every `setTimeout` ran change detection, so the `valueChanges` problem didn't show up until the move to zoneless.

## Mistakes beginners make

- **Forgetting `nonNullable`.** `new FormControl('')` is a `FormControl<string | null>`, and after `reset()` its value is `null`.
- **Relying on `value` when some fields are disabled.** `value` leaves out disabled controls: in the test a group with a disabled `id` returned `{ name: 'Dana' }`, while `getRawValue()` returned `{ name: 'Dana', id: 7 }`.

## What's next

Next: an input component of your own that works inside a form, with `ControlValueAccessor` for Reactive Forms and `FormValueControl` for Signal Forms.
