---
title: "קומפוננטת קלט משלכם ב-Angular: ‏ControlValueAccessor ו-FormValueControl"
summary: "איך הופכים קומפוננטה לשדה בטופס: ‏ControlValueAccessor עם NG_VALUE_ACCESSOR ל-Reactive Forms ול-ngModel, ‏FormValueControl עם model() ל-Signal Forms, והשוואה ביניהם."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 50 }
---

לפעמים input רגיל לא מספיק: בורר תאריכים, דירוג בכוכבים, או מונה עם כפתורי פלוס ומינוס. כדי שקומפוננטה כזו תעבוד בטופס כמו input, ‏Angular צריך לדעת איך לכתוב אליה ערך ואיך לשמוע ממנה שינויים. הפוסט בונה את אותו מונה פעמיים: פעם ל-[Reactive Forms](he/posts/angular-reactive-forms/) ול-`ngModel`, ופעם ל-[Signal Forms](he/posts/angular-signal-forms/).

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ‏ControlValueAccessor

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

[‏`ControlValueAccessor`](https://angular.dev/api/forms/ControlValueAccessor) הוא גשר בין ה-control לקומפוננטה, בארבע מתודות:

- ‏`writeValue` — הטופס כותב ערך לקומפוננטה (ערך התחלתי, `setValue`, ‏`reset`).
- ‏`registerOnChange` — הטופס נותן פונקציה, והקומפוננטה קוראת לה כשהמשתמש משנה את הערך.
- ‏`registerOnTouched` — אותו דבר לסימון touched.
- ‏`setDisabledState` (אופציונלי) — הטופס מודיע שה-control הושבת או הופעל.

הספק `NG_VALUE_ACCESSOR` עם `multi: true` הוא מה שמאפשר ל-directives של הטפסים למצוא את הקומפוננטה. ‏`forwardRef` נחוץ כי המחלקה עוד לא מוגדרת בשורה של ה-decorator.

‏`value` ו-`disabled` הם signals ולא שדות רגילים. ‏`writeValue` נקרא מקוד הטופס ולא מאירוע בתבנית, ובאפליקציה zoneless רק signal יגרום לרינדור מחדש.

## שימוש בטופס

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

בבדיקה, לחיצה על `+` שינתה את ה-control ל-`2` וסימנה אותו touched, ‏`quantity.setValue(7)` הציג `7` במונה, ו-`quantity.disable()` השבית את שני הכפתורים. אותה קומפוננטה עובדת גם עם `[(ngModel)]` ו-`formControlName`, כי שלושתם מחפשים את אותו `NG_VALUE_ACCESSOR`.

## ‏Signal Forms: ‏FormValueControl

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

ב-Signal Forms אין מתודות לרשום ואין provider. לפי [מדריך הקונטרולים](https://angular.dev/guide/forms/signals/custom-controls), החובה היחידה היא [‏`model()`](he/posts/angular-outputs-model/) בשם `value`, ו-`[formField]` מחבר אליו את ערך השדה בשני הכיוונים. כל השאר אופציונלי: ‏`input()` בשם של מצב (`disabled`, ‏`readonly`, ‏`errors`, ‏`required`, ‏`min`...) מקבל אותו מהטופס, ו-`output()` בשם `touch` מסמן את השדה כ-touched.

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

החוק `min(path.quantity, 1)` הגיע לקומפוננטה דרך ה-input ‏`min`: בבדיקה כפתור ה-`-` היה מושבת על `1`, ואחרי `+` הוא נפתח והשדה היה `2` ו-touched. חוק `disabled()` ב-schema השבית את שני הכפתורים דרך ה-input ‏`disabled`. הבדיקה עצמה נשארת ב-schema, והקומפוננטה רק מציגה.

## זה מול זה

| | ‏ControlValueAccessor | ‏FormValueControl |
|---|---|---|
| ערך | ‏`writeValue` + קריאה ל-`onChange` | ‏`value = model()` |
| touched | קריאה ל-`onTouched` | ‏`touch = output()` |
| מושבת | ‏`setDisabledState` | ‏`disabled = input()` |
| חיבור | ספק `NG_VALUE_ACCESSOR` | אין, רק `implements` |
| ולידציה ואילוצים | לא חלק מהממשק | ‏`errors`, ‏`min`, ‏`required` כ-inputs |

השניים גם עובדים בצד השני. לפי התיעוד, קונטרול של Signal Forms עובד עם Reactive Forms ו-template-driven בלי קוד תאימות, ובבדיקה `SignalStepper` עם `[formControl]` עדכן את ה-control ל-`6` וסימן אותו touched. בכיוון ההפוך, ‏[‏`FormField`](https://angular.dev/api/forms/signals/FormField) מקבל גם קומפוננטה עם `ControlValueAccessor`, לתאימות לאחור: ‏`Stepper` עם `[formField]` עדכן את המודל.

### בגרסאות קודמות

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

כך נראה `ControlValueAccessor` לפני signals: שדות רגילים, ו-Zone.js שמרענן את התצוגה אחרי כל פעולה אסינכרונית. הממשק עצמו לא השתנה, אבל באפליקציה [zoneless](he/posts/angular-zoneless/) הקומפוננטה הזו נשברת חלקית. בבדיקה, לחיצות עבדו כי הן אירועים בתבנית, אבל `setValue(9)` מתוך `setTimeout` השאיר את המונה על `2`. כשמעבירים קומפוננטה כזו לגרסה חדשה, הופכים את השדות ל-signals.

## טעויות נפוצות של מתחילים

- **לשכוח את הספק `NG_VALUE_ACCESSOR`.** הקומפוננטה מממשת את הממשק, אבל הטופס לא מוצא אותה: `NG01203: No value accessor for form control unspecified name attribute`.
- **לא לשלוח `touch` ב-blur.** לפי [התיעוד](https://angular.dev/guide/forms/signals/custom-controls), בלי `touch` השדה לא נרשם כאילו יצאו ממנו, ו-`debounce(path, 'blur')` לא משפיע. שולחים אותו ביציאה מהקונטרול, לא בכניסה אליו.

## מה הלאה

בפוסט הבא: ‏attribute directives ו-host bindings, התנהגות שמוסיפים לאלמנט קיים בלי תבנית משלה.
