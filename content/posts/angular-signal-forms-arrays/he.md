---
title: "Signal Forms: אובייקטים מקוננים, מערכים ושדות לפי תנאי"
summary: "טפסים מורכבים ב-Signal Forms של Angular 22: קבוצות מקוננות ו-schema לשימוש חוזר, מערך שורות עם הוספה ומחיקה, ‏hidden ו-disabled, ושגיאות מהשרת בשליחה."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 48 }
---

טופס אמיתי הוא לא רשימה שטוחה של שדות: יש בו כתובת עם כמה שדות, רשימת פריטים שהמשתמש מוסיף ומוחק, ושדות שמופיעים רק במצב מסוים. ב-Signal Forms כל אלה נגזרים מצורת המודל ומחוקים ב-schema, בהמשך ל[ולידציה](he/posts/angular-signal-forms-validation/).

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## אובייקטים מקוננים

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

אובייקט בתוך המודל הופך לענף בעץ: ‏`shippingForm.contact.name` בתבנית, ו-`path.contact.name` ב-schema. לכל ענף יש מצב משלו, שמסכם את השדות שמתחתיו. בבדיקה, אחרי מילוי השם והאימייל `contact().valid()` היה `true` והטופס כולו עדיין `false`, עד שהעיר מולאה.

‏[‏`schema<Contact>()`](https://angular.dev/guide/forms/signals/schemas) מגדיר חוקים לטיפוס בלי לדעת איפה הוא יושב, ו-`apply()` מחבר אותם לנתיב, כך שאותו `contactSchema` יכול לשמש לאיש קשר למשלוח ולאיש קשר לחשבונית.

## מערך של שורות

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

- **שורה חדשה או מחיקה** הן עדכון של המודל. אין API מיוחד למערכים.
- **‏`@for` רץ ישר על `orderForm.items`**, וכל `item` הוא `FieldTree` של שורה. ‏[התיעוד](https://angular.dev/guide/forms/signals/field-state-management) ממליץ על `track item`, כי Angular שומר זהות קבועה לכל שורה. בבדיקה נמחקה השורה הראשונה (`Pen`), והשורה של `Ink` נשארה עם אותו אלמנט `<input>` ב-DOM.
- **‏`applyEach`** מחיל את החוקים על כל שורה, גם על שורות שיתווספו אחר כך.
- **‏`minLength` על מערך** סופר פריטים. אחרי מחיקת כל השורות הופיע `Add at least one item`. ‏`required` לא מתאים כאן, כי לפי התיעוד מערך ריק נחשב כבר ערך.

## שדות מוסתרים ומושבתים

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

- **‏`hidden()`** רק מסמן את השדה. ‏`[formField]` לא מסתיר שום דבר, ולכן מסתירים בעצמכם עם `@if`.
- **‏`disabled()`** משבית את ה-input בלי `[disabled]` בתבנית. כש-`when` מחזיר מחרוזת היא נשמרת ב-`disabledReasons()`, ו-`false` משאיר את השדה פעיל. יש גם `readonly()` לשדה שרואים ואי אפשר לערוך.
- **שדה מוסתר או מושבת לא נבדק.** בבדיקה הטופס היה תקין למרות `required` על הודעה ריקה, כי היא הייתה מוסתרת. סימון התיבה הציג אותה והפך את הטופס ללא תקין. העלאת `total` ל-80 הפעילה את הקופון והעלימה את ההסבר.

הערך של שדה מוסתר או מושבת [נשאר במודל](https://angular.dev/guide/forms/signals/form-logic), כך שצריך להתעלם ממנו בשליחה אם הוא לא רלוונטי.

## שגיאות מהשרת בשליחה

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

לפי [מדריך השליחה](https://angular.dev/guide/forms/signals/form-submission), ‏`action` שמחזיר שגיאה מסמן כישלון, ו-`fieldTree` קובע לאיזה שדה היא שייכת. מה שהבדיקה הראתה:

- שליחה עם שדה ריק לא הריצה את `action`. ‏`onInvalid` רץ במקומו, ו-`focusBoundControl()` העביר את הפוקוס ל-input הראשון עם שגיאה.
- עם `taken@example.com` הופיע `Email already registered` מתחת לשדה.
- שגיאת שרת נמחקת ברגע שהמשתמש משנה את השדה, ולא חוזרת גם כשמקלידים שוב את אותו ערך, עד השליחה הבאה.

## טעויות נפוצות של מתחילים

- **לשנות את המערך במקום.** ‏`this.model().items.push(...)` לא מודיע ל-signal על שינוי, ובבדיקה השורה החדשה לא הופיעה. תמיד יוצרים מערך חדש עם `update`.
- **‏`track $index` בשורות של טופס.** אחרי מחיקה האינדקסים זזים, ו-Angular עלול לשייך אלמנט קיים לשורה אחרת. ‏`track item` עוקב אחרי השורה עצמה.

## מה הלאה

בפוסט הבא: ‏Reactive Forms, לקוד קיים. ‏`FormGroup`, ‏`FormControl`, ‏`FormBuilder`, טפסים עם טיפוסים, ולמה לשים לב כשהאפליקציה zoneless.
