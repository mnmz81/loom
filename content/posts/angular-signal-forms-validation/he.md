---
title: "ולידציה ב-Signal Forms: ולידטורים מובנים, משלכם ובדיקה מול השרת"
summary: "ולידציה ב-Signal Forms של Angular 22: ‏required, ‏email ו-minLength עם הודעות, מתי להציג שגיאות, ‏validate() לחוקים משלכם ולהשוואת שדות, ‏when, ו-validateHttp עם pending."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 47 }
---

ב-Signal Forms כל חוקי הבדיקה של טופס נכתבים בפונקציה אחת, ה-schema, שמועברת כארגומנט השני של `form()`. הפוסט ממשיך את [היסודות](he/posts/angular-signal-forms/) ומוסיף לטופס בדיקות והודעות שגיאה.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ולידטורים מובנים

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

ה-schema מקבל `path`, עץ של נתיבים באותה צורה של המודל, וכל ולידטור נקשר לנתיב אחד. הוא רץ פעם אחת כשהטופס נוצר, והחוקים עצמם רצים מחדש בכל שינוי ערך. ‏[המובנים](https://angular.dev/guide/forms/signals/validation) הם `required`, ‏`email`, ‏`min`, ‏`max`, ‏`minLength`, ‏`maxLength`, ‏`pattern`, ‏`minDate` ו-`maxDate`, וכולם מקבלים `message`.

כל שגיאה ב-`errors()` היא אובייקט עם `kind` (למשל `'required'`) ו-`message`. כל החוקים רצים, ולא רק הראשון שנכשל, כך שבשדה אחד יכולות להיות כמה שגיאות. ‏`minLength` לא נכשל על ערך ריק: בבדיקה, סיסמה ריקה הציגה רק `Password is required`, והסיסמה `abc` הציגה רק `At least 8 characters`. לכן שדה חובה צריך `required` משלו.

## מתי להציג שגיאות

התנאי `touched() && invalid()` מסתיר שגיאות עד שהמשתמש יצא מהשדה. בבדיקה של הטופס למעלה:

1. בטעינה אין שגיאות, אף על פי ששני השדות לא תקינים.
2. אחרי הקלדת `a@` עדיין אין שגיאה, כי השדה לא touched.
3. אחרי יציאה מהשדה מופיע `Enter a valid email`.
4. לחיצה על Sign up מסמנת את כל השדות כ-touched, ולכן מופיע גם `Password is required`, ו-`action` לא רץ.

רק אחרי ששני הערכים תקינים, השליחה מריצה את `action` עם `{ email: 'dana@example.com', password: 'abcdefgh' }`.

## ולידטורים משלכם

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

- ‏`validate(path, fn)` מריץ פונקציה שמחזירה אובייקט שגיאה, או `null` כשהערך תקין. ‏`value` הוא signal של השדה.
- ‏`noSpaces` היא פונקציה רגילה שעוטפת `validate`, ומשתמשים בה כמו בוולידטור מובנה. ‏`SchemaPath<string>` מגביל אותה לשדות מחרוזת.
- ‏`valueOf(path.password)` קורא שדה אחר. החוק של `confirm` רץ מחדש גם כשהסיסמה משתנה: בבדיקה, שינוי הסיסמה ל-`mypass2` אחרי שהשדות התאימו החזיר את `Passwords do not match`.
- ‏`errorSummary()` על השורש אוסף את השגיאות מכל השדות.

## חוק עם תנאי

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

החוק פעיל רק כש-`when` מחזיר `true`, ו-`when` מתעדכן כמו `computed`. בבדיקה הטופס היה תקין, וסימון התיבה הפך אותו ללא תקין. כדי להפעיל קבוצה שלמה של חוקים לפי תנאי יש `applyWhen()`, שמתואר ב-[מדריך ה-schemas](https://angular.dev/guide/forms/signals/schemas).

## בדיקה מול השרת

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

‏[‏`validateHttp`](https://angular.dev/guide/forms/signals/async-operations) שולח בקשה דרך `HttpClient`, ולכן האפליקציה צריכה [‏`provideHttpClient()`](he/posts/angular-http-client/). ‏`onSuccess` ממפה את התשובה לשגיאה או ל-`null`, ו-`onError` מטפל בכשל רשת. מה שהבדיקה (עם `HttpTestingController`) הראתה:

- ‏`debounce(path.username, 300)` מעכב את הכתיבה למודל: מיד אחרי ההקלדה לא נשלחה בקשה, ואחרי 300ms נשלחה בקשה אחת.
- בזמן הבקשה `pending()` הוא `true` והופיע `Checking...`. גם `valid()` וגם `invalid()` היו `false`.
- כששדה ריק נכשל ב-`required`, לא נשלחה בקשה בכלל: בדיקה אסינכרונית רצה רק אחרי שכל הבדיקות הסינכרוניות עברו.

לבדיקה שלא עוברת ב-HTTP יש `validateAsync()`, שמקבל [resource](he/posts/angular-resource/) משלכם.

## טעויות נפוצות של מתחילים

- **‏`!valid()` במקום `invalid()`.** בזמן בדיקה אסינכרונית שניהם `false`, ולכן `!valid()` יציג "לא תקין" לפני שהשרת ענה.
- **להציג שגיאות בלי `touched()`.** הטופס נטען עם שגיאות על כל שדה ריק, לפני שהמשתמש הקליד משהו.

## מה הלאה

בפוסט הבא: אובייקטים מקוננים, מערכים של שדות עם הוספה ומחיקה של שורות, שדות מושבתים ומוסתרים לפי תנאי, וטיפול בשגיאות מהשרת בשליחה.
