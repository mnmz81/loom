---
title: "Signal Forms: nested objects, arrays and conditional fields"
summary: "Complex forms with Angular 22 Signal Forms: nested groups and a reusable schema, an array of rows with add and remove, hidden and disabled, and server errors on submit."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 48 }
---

A real form is not a flat list of fields: it has an address made of several fields, a list of items the user adds and removes, and fields that appear only in some states. In Signal Forms all of these follow from the shape of the model and from rules in the schema, continuing from [validation](en/posts/angular-signal-forms-validation/).

Every example was checked with Angular 22.2 and Vitest.

## Nested objects

```typescript
import { Component, signal } from '@angular/core';
import { apply, email, form, FormField, required, schema } from '@angular/forms/signals';

interface Contact {
  name: string;
  email: string;
}

const contactSchema = schema<Contact>((path) => {
  required(path.name, { message: 'Name is required' });
  email(path.email, { message: 'Enter a valid email' });
});

@Component({
  selector: 'app-shipping',
  imports: [FormField],
  template: `
    <input [formField]="shippingForm.contact.name" />
    <input type="email" [formField]="shippingForm.contact.email" />
    <input [formField]="shippingForm.address.city" />
    <p>Contact valid: {{ shippingForm.contact().valid() }}</p>
    <p>Form valid: {{ shippingForm().valid() }}</p>
  `,
})
export class Shipping {
  protected readonly model = signal({
    contact: { name: '', email: '' },
    address: { city: '' },
  });
  protected readonly shippingForm = form(this.model, (path) => {
    apply(path.contact, contactSchema);
    required(path.address.city, { message: 'City is required' });
  });
}
```

An object inside the model becomes a branch of the tree: `shippingForm.contact.name` in the template, and `path.contact.name` in the schema. Each branch has its own state, which sums up the fields below it. In the test, after filling in the name and email `contact().valid()` was `true` while the whole form was still `false`, until the city was filled in.

[`schema<Contact>()`](https://angular.dev/guide/forms/signals/schemas) defines rules for a type without knowing where it sits, and `apply()` attaches them to a path, so the same `contactSchema` can serve a shipping contact and a billing contact.

## An array of rows

```typescript
import { Component, signal } from '@angular/core';
import { applyEach, form, FormField, min, minLength, required } from '@angular/forms/signals';

interface Item {
  product: string;
  quantity: number;
}

@Component({
  selector: 'app-order',
  imports: [FormField],
  template: `
    @for (item of orderForm.items; track item; let i = $index) {
      <div>
        <input [formField]="item.product" />
        <input type="number" [formField]="item.quantity" />
        <button type="button" (click)="remove(i)">Remove</button>
      </div>
    }
    <button type="button" (click)="add()">Add item</button>
    @for (error of orderForm.items().errors(); track error.kind) {
      <p class="error">{{ error.message }}</p>
    }
  `,
})
export class Order {
  protected readonly model = signal<{ items: Item[] }>({
    items: [{ product: '', quantity: 1 }],
  });
  protected readonly orderForm = form(this.model, (path) => {
    minLength(path.items, 1, { message: 'Add at least one item' });
    applyEach(path.items, (item) => {
      required(item.product, { message: 'Product is required' });
      min(item.quantity, 1, { message: 'At least 1' });
    });
  });

  add() {
    this.model.update((order) => ({
      ...order,
      items: [...order.items, { product: '', quantity: 1 }],
    }));
  }

  remove(index: number) {
    this.model.update((order) => ({
      ...order,
      items: order.items.filter((_, i) => i !== index),
    }));
  }
}
```

- **Adding or removing a row** is a model update. There is no special array API.
- **`@for` runs directly over `orderForm.items`**, and each `item` is the `FieldTree` of one row. [The docs](https://angular.dev/guide/forms/signals/field-state-management) recommend `track item`, because Angular keeps a stable identity for each row. In the test the first row (`Pen`) was removed, and the `Ink` row kept the same `<input>` element in the DOM.
- **`applyEach`** applies the rules to every row, including rows added later.
- **`minLength` on an array** counts items. After every row was removed, `Add at least one item` appeared. `required` doesn't fit here, because per the docs an empty array already counts as a value.

## Hidden and disabled fields

```typescript
import { Component, signal } from '@angular/core';
import { disabled, form, FormField, hidden, required } from '@angular/forms/signals';

@Component({
  selector: 'app-gift',
  imports: [FormField],
  template: `
    <label><input type="checkbox" [formField]="giftForm.isGift" /> This is a gift</label>
    @if (!giftForm.message().hidden()) {
      <textarea [formField]="giftForm.message"></textarea>
    }
    <input [formField]="giftForm.coupon" />
    @for (reason of giftForm.coupon().disabledReasons(); track reason) {
      <p>{{ reason.message }}</p>
    }
    <p>Valid: {{ giftForm().valid() }}</p>
  `,
})
export class Gift {
  protected readonly model = signal({ total: 30, isGift: false, message: '', coupon: '' });
  protected readonly giftForm = form(this.model, (path) => {
    required(path.message, { message: 'Write a message' });
    hidden(path.message, { when: ({ valueOf }) => !valueOf(path.isGift) });
    disabled(path.coupon, {
      when: ({ valueOf }) => (valueOf(path.total) < 50 ? 'Coupons start at $50' : false),
    });
  });
}
```

- **`hidden()`** only marks the field. `[formField]` hides nothing, so you hide it yourself with `@if`.
- **`disabled()`** disables the input without a `[disabled]` in the template. When `when` returns a string it is kept in `disabledReasons()`, and `false` leaves the field enabled. There is also `readonly()` for a field you can see but not edit.
- **A hidden or disabled field is not validated.** In the test the form was valid despite `required` on an empty message, because the message was hidden. Ticking the box showed it and made the form invalid. Raising `total` to 80 enabled the coupon and removed the explanation.

The value of a hidden or disabled field [stays in the model](https://angular.dev/guide/forms/signals/form-logic), so ignore it on submit if it isn't relevant.

## Server errors on submit

```typescript
import { Component, signal } from '@angular/core';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';

async function saveUser(user: { email: string }) {
  return user.email === 'taken@example.com' ? { ok: false } : { ok: true };
}

@Component({
  selector: 'app-register',
  imports: [FormField, FormRoot],
  template: `
    <form [formRoot]="registerForm">
      <input type="email" [formField]="registerForm.email" />
      @for (error of registerForm.email().errors(); track error.kind) {
        <p class="error">{{ error.message }}</p>
      }
      <button type="submit">Register</button>
    </form>
  `,
})
export class Register {
  protected readonly model = signal({ email: '' });
  protected readonly registerForm = form(
    this.model,
    (path) => required(path.email, { message: 'Email is required' }),
    {
      submission: {
        action: async (field) => {
          const result = await saveUser(field().value());
          if (result.ok) return;
          return { kind: 'taken', message: 'Email already registered', fieldTree: field.email };
        },
        onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );
}
```

Per the [submission guide](https://angular.dev/guide/forms/signals/form-submission), an `action` that returns an error marks a failure, and `fieldTree` sets which field it belongs to. What the test showed:

- Submitting with an empty field didn't run `action`. `onInvalid` ran instead, and `focusBoundControl()` moved focus to the first input with an error.
- With `taken@example.com`, `Email already registered` appeared under the field.
- A server error is cleared as soon as the user changes the field, and doesn't come back even when the same value is typed again, until the next submit.

## Mistakes beginners make

- **Changing the array in place.** `this.model().items.push(...)` doesn't notify the signal, and in the test the new row didn't appear. Always create a new array with `update`.
- **`track $index` on form rows.** After a removal the indexes shift, and Angular may attach an existing element to a different row. `track item` follows the row itself.

## What's next

Next: Reactive Forms, for existing code. `FormGroup`, `FormControl`, `FormBuilder`, typed forms, and what to watch for when the app is zoneless.
