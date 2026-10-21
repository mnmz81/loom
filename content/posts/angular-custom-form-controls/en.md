---
title: "Your own input component in Angular: ControlValueAccessor and FormValueControl"
summary: "How to turn a component into a form field: ControlValueAccessor with NG_VALUE_ACCESSOR for Reactive Forms and ngModel, FormValueControl with model() for Signal Forms, compared side by side."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 50 }
---

Sometimes a plain input isn't enough: a date picker, a star rating, or a counter with plus and minus buttons. For such a component to work in a form like an input, Angular needs to know how to write a value into it and how to hear changes from it. This post builds the same counter twice: once for [Reactive Forms](en/posts/angular-reactive-forms/) and `ngModel`, and once for [Signal Forms](en/posts/angular-signal-forms/).

Every example was checked with Angular 22.2 and Vitest.

## ControlValueAccessor

```typescript
import { Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-stepper',
  template: `
    <button type="button" (click)="change(-1)" [disabled]="disabled()">-</button>
    <span>{{ value() }}</span>
    <button type="button" (click)="change(1)" [disabled]="disabled()">+</button>
  `,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Stepper), multi: true }],
})
export class Stepper implements ControlValueAccessor {
  protected readonly value = signal(0);
  protected readonly disabled = signal(false);
  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number) {
    this.value.set(value);
  }

  registerOnChange(fn: (value: number) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled.set(isDisabled);
  }

  protected change(delta: number) {
    this.value.update((value) => value + delta);
    this.onChange(this.value());
    this.onTouched();
  }
}
```

[`ControlValueAccessor`](https://angular.dev/api/forms/ControlValueAccessor) is a bridge between the control and the component, in four methods:

- `writeValue` — the form writes a value into the component (initial value, `setValue`, `reset`).
- `registerOnChange` — the form hands over a function, and the component calls it when the user changes the value.
- `registerOnTouched` — the same for marking touched.
- `setDisabledState` (optional) — the form says the control was disabled or enabled.

The `NG_VALUE_ACCESSOR` provider with `multi: true` is what lets the forms directives find the component. `forwardRef` is needed because the class isn't defined yet on the decorator's line.

`value` and `disabled` are signals, not plain fields. `writeValue` is called from the form's code, not from a template event, and in a zoneless app only a signal causes a re-render.

## Using it in a form

```typescript
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Stepper } from './stepper';

@Component({
  selector: 'app-cart',
  imports: [ReactiveFormsModule, Stepper],
  template: `
    <app-stepper [formControl]="quantity" />
    <p>Quantity: {{ quantity.value }}, touched: {{ quantity.touched }}</p>
  `,
})
export class Cart {
  readonly quantity = new FormControl(1, { nonNullable: true });
}
```

In the test, clicking `+` changed the control to `2` and marked it touched, `quantity.setValue(7)` showed `7` in the counter, and `quantity.disable()` disabled both buttons. The same component works with `[(ngModel)]` and `formControlName` too, because all three look for the same `NG_VALUE_ACCESSOR`.

## Signal Forms: FormValueControl

```typescript
import { Component, input, model, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

@Component({
  selector: 'app-signal-stepper',
  template: `
    <button type="button" (click)="change(-1)" [disabled]="disabled() || value() === min()">
      -
    </button>
    <span>{{ value() }}</span>
    <button type="button" (click)="change(1)" [disabled]="disabled()">+</button>
  `,
})
export class SignalStepper implements FormValueControl<number> {
  readonly value = model(0);
  readonly disabled = input(false);
  readonly min = input<number | undefined>(undefined);
  readonly touch = output<void>();

  protected change(delta: number) {
    this.value.update((value) => value + delta);
    this.touch.emit();
  }
}
```

In Signal Forms there are no methods to register and no provider. Per the [custom controls guide](https://angular.dev/guide/forms/signals/custom-controls), the only requirement is a [`model()`](en/posts/angular-outputs-model/) named `value`, and `[formField]` binds the field's value to it in both directions. Everything else is optional: an `input()` named after a piece of state (`disabled`, `readonly`, `errors`, `required`, `min`...) receives it from the form, and an `output()` named `touch` marks the field as touched.

```typescript
import { Component, signal } from '@angular/core';
import { form, FormField, min } from '@angular/forms/signals';
import { SignalStepper } from './signal-stepper';

@Component({
  selector: 'app-signal-cart',
  imports: [FormField, SignalStepper],
  template: `
    <app-signal-stepper [formField]="cartForm.quantity" />
    <p>Quantity: {{ cartForm.quantity().value() }}, touched: {{ cartForm.quantity().touched() }}</p>
  `,
})
export class SignalCart {
  protected readonly model = signal({ quantity: 1 });
  protected readonly cartForm = form(this.model, (path) => {
    min(path.quantity, 1);
  });
}
```

The `min(path.quantity, 1)` rule reached the component through the `min` input: in the test the `-` button was disabled at `1`, and after `+` it was enabled and the field was `2` and touched. A `disabled()` rule in the schema disabled both buttons through the `disabled` input. The check itself stays in the schema; the component only displays.

## Side by side

| | ControlValueAccessor | FormValueControl |
|---|---|---|
| Value | `writeValue` + calling `onChange` | `value = model()` |
| Touched | Calling `onTouched` | `touch = output()` |
| Disabled | `setDisabledState` | `disabled = input()` |
| Wiring | An `NG_VALUE_ACCESSOR` provider | None, just `implements` |
| Validation and constraints | Not part of the interface | `errors`, `min`, `required` as inputs |

Each also works on the other side. Per the docs, a Signal Forms control works with Reactive and template-driven forms without compatibility code, and in the test `SignalStepper` with `[formControl]` updated the control to `6` and marked it touched. The other way round, [`FormField`](https://angular.dev/api/forms/signals/FormField) also accepts a component with a `ControlValueAccessor`, for backwards compatibility: `Stepper` with `[formField]` updated the model.

### In older versions

```typescript
import { Component, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-old-stepper',
  template: `
    <button type="button" (click)="change(-1)" [disabled]="disabled">-</button>
    <span>{{ value }}</span>
    <button type="button" (click)="change(1)" [disabled]="disabled">+</button>
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => OldStepper), multi: true },
  ],
})
export class OldStepper implements ControlValueAccessor {
  value = 0;
  disabled = false;
  onChange = (value: number) => {};
  onTouched = () => {};

  writeValue(value: number) {
    this.value = value; // plain field: no re-render in a zoneless app
  }

  registerOnChange(fn: (value: number) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  change(delta: number) {
    this.value += delta;
    this.onChange(this.value);
    this.onTouched();
  }
}
```

This is what a `ControlValueAccessor` looked like before signals: plain fields, and Zone.js refreshing the view after every async operation. The interface itself hasn't changed, but in a [zoneless](en/posts/angular-zoneless/) app this component partly breaks. In the test, clicks worked because they are template events, but `setValue(9)` from inside a `setTimeout` left the counter at `2`. When you bring such a component to a new version, turn its fields into signals.

## Mistakes beginners make

- **Forgetting the `NG_VALUE_ACCESSOR` provider.** The component implements the interface, but the form can't find it: `NG01203: No value accessor for form control unspecified name attribute`.
- **Not emitting `touch` on blur.** Per [the docs](https://angular.dev/guide/forms/signals/custom-controls), without `touch` the field never registers as blurred, and `debounce(path, 'blur')` has no effect. Emit it when focus leaves the control, not when it enters.

## What's next

Next: attribute directives and host bindings, behavior you add to an existing element without a template of its own.
