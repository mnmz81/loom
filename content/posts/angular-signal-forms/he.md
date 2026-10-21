---
title: "Signal Forms ב-Angular: מודל, ‏form() ו-[formField]"
summary: "היסודות של Signal Forms ב-Angular 22: מודל ב-signal, ‏form() שבונה עץ שדות, ‏[formField] שמחבר אותם לתבנית, קריאת value, ‏touched ו-dirty, ושליחה עם FormRoot."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 46 }
---

‏Signal Forms בונים טופס מעל [signal](he/posts/angular-signals/) שמחזיק את הנתונים. ב-[פוסט הקודם](he/posts/angular-forms-overview/) הם הופיעו לצד שתי הגישות האחרות. כאן בונים אחד מההתחלה, עדיין בלי ולידציה, שמקבלת פוסט משלה.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## מודל, ‏form() ו-[formField]

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

שלושה חלקים:

- **המודל** הוא `signal` רגיל עם ערך התחלתי לכל שדה. [התיעוד](https://angular.dev/guide/forms/signals/models) קורא לו מקור האמת של הטופס.
- **‏`form(this.model)`** מחזיר `FieldTree`: עץ באותה צורה של המודל, כך ש-`profileForm.name` הוא השדה של `name`. ‏`form()` לא שומר עותק משלו של הנתונים, הוא קורא וכותב ישר למודל. הוא צריך [injection context](he/posts/angular-inject/), ולכן יוצרים אותו בשדה של המחלקה.
- **‏`[formField]`** מחבר input לשדה בשני הכיוונים. ה-directive ‏`FormField` חייב להופיע ב-`imports`.

אחרי הקלדה של `Dana` ו-`31`, בחירת Pro וסימון התיבה, ה-`<pre>` מראה:

```text
{
  "name": "Dana",
  "age": 31,
  "plan": "pro",
  "newsletter": true
}
```

‏`age` נשמר כמספר ולא כמחרוזת: לפי [המדריך](https://angular.dev/essentials/signal-forms), ‏`type="number"` ממיר בין השניים, ותיבת סימון נקשרת לערך בוליאני.

## טיפוסים מהמודל

העץ מקבל את הטיפוסים מה-interface, כך ששם שדה שגוי נתפס ב-build, גם בתבנית:

```text
✘ [ERROR] TS2339: Property 'email' does not exist on type 'FieldTree<Profile, string | number, "writable">'.
```

## קריאת מצב ועדכון מהקוד

כל שדה בעץ הוא גם פונקציה. קריאה ל-`profileForm.name()` מחזירה `FieldState`, אובייקט של signals שמתארים את השדה:

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

- ‏`value()` הוא הערך הנוכחי. הוא `WritableSignal`, ולכן `value.set('Noa')` מעדכן גם את ה-input וגם את המודל. ‏`this.model.set(...)` עובד באותה מידה כשרוצים להחליף את כל הנתונים, למשל אחרי טעינה מהשרת.
- ‏`touched()` נהיה `true` כשהמשתמש נכנס לשדה ויצא ממנו.
- ‏`dirty()` נהיה `true` כשהמשתמש שינה את הערך. בבדיקה, לחיצה על Load השאירה אותו `false`, והקלדה הפכה אותו ל-`true`.
- ‏`nameForm()`, הקריאה לשורש העץ, מחזירה את המצב של הטופס כולו. השורש מלוכלך אם אחד השדות מלוכלך.

יש עוד signals: ‏`valid()`, ‏`invalid()`, ‏`errors()`, ‏`pending()`, ‏`disabled()`, ‏`hidden()` ו-`readonly()`. הרשימה המלאה ב-[מדריך מצב השדות](https://angular.dev/guide/forms/signals/field-state-management).

## שליחה

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

ה-directive ‏`FormRoot` על `<form>` ‏[עושה שלושה דברים](https://angular.dev/guide/forms/signals/form-submission): מוסיף `novalidate`, מונע את השליחה הרגילה של הדפדפן, וקורא ל-`submit()`. ‏`submit()` מסמן את כל השדות כ-touched, עוצר אם יש שגיאות ולידציה, ואחרת מריץ את `action` מהאפשרות `submission`. בזמן ש-`action` רץ, ‏`submitting()` הוא `true`: בבדיקה הכפתור הציג `Saving...` והיה מושבת, ואחרי חצי שנייה חזר ל-`Subscribe` והופיע `Saved dana@example.com`.

אפשר גם לקרוא ל-`submit(this.newsletterForm, action)` ישירות מכל מתודה, בלי `FormRoot`. הוא מחזיר `Promise<boolean>`, שהוא `true` אם הפעולה הצליחה.

### בגרסאות קודמות

ב-Angular 21 ‏Signal Forms היו [ניסיוניים](https://v21.angular.dev/guide/forms/signals/overview), וה-API השתנה בין גרסאות משנה. ב-21.0 ה-directive נקרא `Field` והתבנית השתמשה ב-`<input [field]="loginForm.email" />`; ב-21.1 הוא שונה ל-`FormField` ול-`[formField]`. ב-21.0 ו-21.1 ‏`submit(form, action)` החזיר `Promise<void>`, ולא היו `FormRoot` והאפשרות `submission`. ב-21.2.25 שניהם כבר קיימים. ההשוואה נעשתה מול קובצי הטיפוסים של החבילה `@angular/forms` בכל גרסה.

## טעויות נפוצות של מתחילים

- **שדה אופציונלי במודל.** שדה שערכו `undefined` לא נכנס לעץ, ו-`phone?: string` נכשל ב-build עם `Type 'undefined' is not assignable to type 'Field<string, string | number>'`. נותנים לכל שדה ערך התחלתי, למשל `''`.
- **‏`null` בשדה טקסט.** ‏`nick: string | null` שמחובר ל-`<input>` רגיל נכשל ב-build, כי לפי [התיעוד](https://angular.dev/guide/forms/signals/models) שדות טקסט לא תומכים ב-`null`. ערך ריק בשדה טקסט הוא `''`.

## מה הלאה

בפוסט הבא: ולידציה ב-Signal Forms. ולידטורים מובנים, ולידטורים משלכם, הצגת שגיאות, ובדיקה אסינכרונית מול השרת.
