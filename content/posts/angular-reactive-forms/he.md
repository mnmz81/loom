---
title: "Reactive Forms ב-Angular: ‏FormGroup, ‏FormBuilder וטפסים עם טיפוסים"
summary: "‏Reactive Forms לקוד קיים: ‏FormGroup ו-FormControl, ‏FormBuilder, טפסים עם טיפוסים מגרסה 14, ולידטורים, ולמה valueChanges צריך toSignal או markForCheck באפליקציה zoneless."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 49 }
---

‏Reactive Forms היו הדרך המרכזית לבנות טפסים ב-Angular עד ש-[Signal Forms](he/posts/angular-signal-forms/) הגיעו, ולכן הם נמצאים בהרבה קוד קיים. ‏[התיעוד](https://angular.dev/guide/forms/signals/overview) ממליץ להמשיך איתם באפליקציה שכבר משתמשת בהם. הפוסט מראה את מה שצריך כדי לקרוא ולתחזק טופס כזה.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ‏FormGroup ו-FormControl

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

‏`FormControl` מחזיק ערך ומצב של שדה אחד, ו-`FormGroup` מאגד כמה controls, גם קבוצות מקוננות. בתבנית, ‏`[formGroup]` מחבר את ה-`<form>` לקבוצה, ‏`formControlName` מחבר input לפי שם, ו-`formGroupName` נכנס לקבוצה המקוננת. ‏`ngSubmit` רץ בשליחה, ובבדיקה הוא הדפיס `{ name: 'Dana', address: { city: 'Haifa' } }`.

## ‏FormBuilder, טיפוסים וולידטורים

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

- **‏`FormBuilder`** בונה את אותו עץ בקיצור: מערך `[ערך, ולידטורים]` לכל control. ‏`NonNullableFormBuilder` מוסיף `nonNullable: true` לכולם.
- **ולידטור** הוא פונקציה שמקבלת control ומחזירה אובייקט שגיאות או `null`. ‏`Validators` מכיל את המובנים, ו-`noSpaces` הוא ולידטור משלנו. בבדיקה, ‏`age` של 16 החזיר `{ min: { min: 18, actual: 16 } }`.
- **הודעות השגיאה** כתובות בתבנית, לפי המפתח: `hasError('required')`. זה ההבדל הבולט מ-Signal Forms, שבהם ההודעה מוגדרת ליד החוק.

מ-[Angular 14](https://angular.dev/guide/forms/typed-forms) הטפסים עם טיפוסים כברירת מחדל: ‏`age` הוא `FormControl<number>`, ולכן ערך מטיפוס אחר לא עובר build:

```text
✘ [ERROR] TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

‏`nonNullable` חשוב בגלל `reset()`: בלעדיו control חוזר ל-`null` והטיפוס שלו כולל `null`. עם `nonNullable` הוא חוזר לערך ההתחלתי. בבדיקה, ‏`reset()` החזיר את הטופס ל-`{ username: '', age: 18 }`.

## ‏valueChanges באפליקציה zoneless

כל control חושף את השינויים שלו כ-Observable ‏(`valueChanges`). כאן מסתתרת המלכודת של אפליקציה [zoneless](he/posts/angular-zoneless/): לפי [מדריך Reactive Forms](https://angular.dev/guide/forms/reactive-forms), שינוי של מודל הטופס מהקוד לא מתזמן change detection.

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

בבדיקה, אחרי `setValue(5)` ה-input הראה `5` (ה-directive כותב ל-DOM ישירות), אבל הטקסט נשאר `Total: 10`. הקלדה של המשתמש כן מרעננת את התצוגה, כי היא אירוע בתבנית. התיקון הפשוט הוא להפוך את ה-Observable ל-signal עם [‏`toSignal`](he/posts/angular-rxjs-interop/):

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

עכשיו התבנית קוראת signal, והטקסט התעדכן ל-`Total: 50`. התיעוד מציע גם דרך שנייה: להירשם ל-`valueChanges` עם `takeUntilDestroyed()` ולקרוא ל-`ChangeDetectorRef.markForCheck()` בכל שינוי. גם היא עברה בבדיקה. אותה בעיה קיימת ב-`FormArray.push()` מהקוד: בבדיקה השורה החדשה לא הופיעה בלי אחד מהתיקונים.

### בגרסאות קודמות

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

לפני גרסה 14 הטפסים היו בלי טיפוסים, ו-`value` היה `any`, כך שהשגיאה ב-`adress` עוברת build. הסוגים עם הקידומת `Untyped` (‏`UntypedFormGroup`, ‏`UntypedFormControl`, ‏`UntypedFormBuilder`) [מתנהגים בדיוק](https://angular.dev/guide/forms/typed-forms) כמו הסוגים של לפני גרסה 14, ו-[‏`UntypedFormGroup`](https://angular.dev/api/forms/UntypedFormGroup) הוא פשוט `FormGroup<any>`. כשרואים אותם בקוד, אפשר להסיר את הקידומת בהדרגה ולקבל טיפוסים. שני דברים נוספים מזהים קוד ישן: הזרקה בבנאי במקום [‏`inject()`](he/posts/angular-inject/), ו-`ReactiveFormsModule` שמיובא ב-NgModule. עם Zone.js, כל `setTimeout` הריץ change detection, ולכן הבעיה של `valueChanges` לא הופיעה עד המעבר ל-zoneless.

## טעויות נפוצות של מתחילים

- **לשכוח את `nonNullable`.** ‏`new FormControl('')` הוא `FormControl<string | null>`, ואחרי `reset()` הערך שלו `null`.
- **לסמוך על `value` כשיש שדות מושבתים.** ‏`value` משמיט controls מושבתים: בבדיקה קבוצה עם `id` מושבת החזירה `{ name: 'Dana' }`, ו-`getRawValue()` החזיר `{ name: 'Dana', id: 7 }`.

## מה הלאה

בפוסט הבא: קומפוננטת קלט משלכם שעובדת בתוך טופס, עם `ControlValueAccessor` ל-Reactive Forms ועם `FormValueControl` ל-Signal Forms.
