---
title: "טפסים ב-Angular: ‏template-driven, ‏Reactive Forms או Signal Forms?"
summary: "שלוש הדרכים לבנות טופס ב-Angular 22: ‏ngModel בתבנית, ‏Reactive Forms ו-Signal Forms. אותו טופס בשלושתן, ההבדלים ביניהן ואיך לבחור."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 45 }
---

ל-Angular יש שלוש דרכים לבנות טופס, ושלושתן נמצאות בחבילה `@angular/forms`. כדי לראות את ההבדל, הפוסט בונה את אותו טופס הרשמה לניוזלטר בכל אחת מהן: שדה אימייל חובה, וכפתור שמושבת כל עוד הכתובת לא תקינה.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ‏template-driven: ‏ngModel בתבנית

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

הכול כתוב בתבנית. ‏`[(ngModel)]` מחבר את השדה ל-signal בקומפוננטה, והבדיקות הן מאפייני HTML ‏(`required`, ‏`email`) ש-`FormsModule` הופך לולידטורים. ה-directive ‏`NgModel` יוצר מאחורי הקלעים `FormControl` לכל שדה, ו-`#signupForm="ngForm"` נותן גישה למצב של הטופס כולו. לפי [התיעוד](https://angular.dev/guide/forms), זו הדרך המתאימה לטופס פשוט כמו הרשמה לרשימת תפוצה, אבל היא לא גדלה טוב לטפסים מורכבים.

## ‏Reactive Forms: מודל מפורש בקוד

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

כאן הטופס הוא עץ של אובייקטים (`FormGroup`, ‏`FormControl`) שנבנה במחלקה, והתבנית רק מתחברת אליו. הולידטורים הם פונקציות, הטיפוסים נגזרים מהערכים ההתחלתיים, והשינויים נחשפים כ-Observable ‏(`valueChanges`). ל-Reactive Forms יש [פוסט משלו](he/posts/angular-reactive-forms/) בהמשך הרמה הזו.

## ‏Signal Forms: טופס מעל signal

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

הנתונים יושבים ב-[signal](he/posts/angular-signals/) רגיל, ‏`form()` בונה ממנו עץ שדות באותה צורה, ו-`[formField]` מחבר כל שדה ל-input בשני הכיוונים. כל הבדיקות מוגדרות במקום אחד, בפונקציית ה-schema, וכל מצב (ערך, תקינות, touched) הוא signal. ‏`[formRoot]` מבטל את השליחה הרגילה של הדפדפן ומריץ את `action` רק כשהטופס תקין. ‏[Signal Forms יציבים מגרסה 22](https://angular.dev/guide/forms/signals/comparison) ומיובאים מ-`@angular/forms/signals`.

בשלוש הדוגמאות התוצאה זהה: הכפתור מושבת אחרי `bad`, נפתח אחרי `dana@example.com`, והשליחה מדפיסה `Saving dana@example.com`.

## איך לבחור

| | template-driven | Reactive Forms | Signal Forms |
|---|---|---|---|
| איפה הנתונים | שדות בקומפוננטה | ‏`FormControl` / ‏`FormGroup` | ‏signal שאתם מגדירים |
| איפה הבדיקות | מאפיינים בתבנית | רשימת ולידטורים לכל control | ‏schema אחד לפי נתיבים |
| טיפוסים | מינימליים | מפורשים (typed forms) | נגזרים מהמודל |
| שינויים נחשפים כ- | מנוהל על ידי Angular | ‏Observable | ‏signals |

לפי [מדריך ההשוואה](https://angular.dev/guide/forms/signals/comparison):

- **קוד חדש שבנוי על signals:** ‏Signal Forms. ‏[התיעוד](https://angular.dev/guide/forms/signals/overview) אומר שהם מתאימים במיוחד לאפליקציות חדשות.
- **פרויקט קיים עם Reactive Forms:** להמשיך איתם. התיעוד קורא להם "בחירה טובה" באפליקציה קיימת, ויש [מדריך הגירה](https://angular.dev/guide/forms/signals/migration) למעבר הדרגתי.
- **טופס קטן, אב טיפוס, או קוד קיים ב-ngModel:** ‏template-driven.

### בגרסאות קודמות

עד גרסה 20 היו רק שתי הגישות הראשונות. ‏Signal Forms הופיעו ב-Angular 21 [כניסיוניים](https://v21.angular.dev/guide/forms/signals/overview), וה-API השתנה בתקופה הזו: ב-21.0 ה-directive נקרא `Field` והתבנית השתמשה ב-`[field]`, ומ-21.1 הוא נקרא `FormField` עם `[formField]`. מדריכים מתקופת 21 עלולים להראות את השם הישן. גם `ngModel` נקשר במדריכים ישנים לשדה רגיל ולא ל-signal, למשל `email = ''`, וזה עדיין עובד.

## טעויות נפוצות של מתחילים

- **לשכוח לייבא את המודול או את ה-directive.** בלי `FormsModule`, ‏`ReactiveFormsModule` או `FormField` ב-`imports`, ה-build נכשל:

```text
✘ [ERROR] NG8002: Can't bind to 'formField' since it isn't a known property of 'input'.
```

- **‏`ngModel` בתוך `<form>` בלי `name`.** ‏`NgForm` רושם כל שדה לפי השם שלו, ובלעדיו יש שגיאה בזמן ריצה: `NG01352: If ngModel is used within a form tag, either the name attribute must be set or the form control must be defined as 'standalone' in ngModelOptions.`

## מה הלאה

בפוסט הבא: היסודות של Signal Forms. מודל, ‏`form()`, חיבור שדות עם `[formField]`, קריאת מצב ושליחה.
