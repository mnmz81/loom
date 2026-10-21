---
title: "טיפול בשגיאות ב-Angular: ‏ErrorHandler, ‏resource ו-@boundary"
summary: "לאן שגיאות הולכות באפליקציית Angular: ‏ErrorHandler משלכם, ‏provideBrowserGlobalErrorListeners, שגיאה כמצב ב-resource וב-HTTP, והבלוק @boundary (developer preview ב-22.2)."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 56 }
---

שגיאה שאף אחד לא תפס לא מפילה אפליקציית Angular. היא מגיעה ל-`ErrorHandler`, שכברירת מחדל רק כותב אותה ל-console, והמסך נשאר במצב שבו היה. הפוסט מראה איפה לתפוס שגיאות: במרכז, בנתונים, ובתבנית.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ‏ErrorHandler משלכם

```typescript
import { ErrorDetails, ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class ReportingErrorHandler implements ErrorHandler {
  readonly reported: unknown[] = [];

  handleError(error: unknown) {
    this.reported.push(error);
    console.error('Reported:', error);
  }

  onViewError(error: Error, details: ErrorDetails) {
    console.warn('Caught by @boundary in', details.boundary?.type.name, error.message);
  }
}
```

```typescript
import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { ReportingErrorHandler } from './reporting-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: ReportingErrorHandler },
  ],
};
```

‏`handleError` מקבל כל שגיאה שלא נתפסה. כאן היא נשמרת במערך; באפליקציה אמיתית שולחים אותה לשירות ניטור. ‏`{ provide: ErrorHandler, useClass: ... }` מחליף את ברירת המחדל (על providers יש [פוסט משלו](he/posts/angular-providers/)). ‏`onViewError` אופציונלי, והוא שייך ל-`@boundary` שבהמשך.

‏[`provideBrowserGlobalErrorListeners`](https://angular.dev/best-practices/error-handling) מאזין לאירועי `error` ו-`unhandledrejection` של `window` ומעביר אותם ל-`ErrorHandler`. ‏`ng new` כבר מוסיף אותו ל-`app.config.ts`.

## אילו שגיאות מגיעות ל-ErrorHandler

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-save-button',
  template: `
    <button (click)="save()">Save</button>
    <button (click)="later()">Save later</button>
  `,
})
export class SaveButton {
  save() {
    throw new Error('Save failed');
  }

  later() {
    setTimeout(() => {
      throw new Error('Background save failed');
    });
  }
}
```

- ‏`save()` רץ מתוך listener ש-Angular קורא לו, ולכן Angular תופס את השגיאה ומעביר אותה ל-`handleError`. כך גם בקונסטרקטורים ובמתודות של מחזור החיים.
- ה-callback של `setTimeout` רץ מחוץ ל-Angular. השגיאה מגיעה לאירוע `error` של `window`, ומשם ל-`handleError` רק בזכות `provideBrowserGlobalErrorListeners`.
- שגיאה מ-API שהקוד שלכם קורא לו ישירות היא באחריותכם: `try`/`catch` או `catchError`.

בבדיקות, TestBed זורק שגיאות כאלה מחדש כדי שהבדיקה תיכשל. ‏`rethrowApplicationErrors: false` ב-`configureTestingModule` מעביר אותן ל-`ErrorHandler` במקום.

## ‏resource ו-HTTP: שגיאה כמצב

‏`resource` לא מעביר שגיאות ל-`ErrorHandler`. הוא שומר אותן ב-`error()` וב-`status()`, והתבנית מחליטה מה להציג:

```typescript
import { Component, resource } from '@angular/core';

@Component({
  selector: 'app-profile',
  template: `
    @if (user.error(); as error) {
      <p>Couldn't load the profile: {{ error.message }}</p>
      <button (click)="user.reload()">Retry</button>
    } @else if (user.hasValue()) {
      <p>{{ user.value().name }}</p>
    }
  `,
})
export class Profile {
  protected readonly user = resource({
    loader: async (): Promise<{ name: string }> => {
      throw new Error('Server unavailable');
    },
  });
}
```

מוצג `Couldn't load the profile: Server unavailable`, ו-`handleError` לא נקרא בכלל. ‏`resource` מוסבר ב[פוסט משלו](he/posts/angular-resource/), ושגיאות HTTP, כולל `catchError` ו-retry, ב[פוסט על שגיאות HTTP](he/posts/angular-http-errors/).

## ‏@boundary

‏`@boundary` הוא בלוק תבנית שנוסף ב-22.2, ו-[התיעוד](https://angular.dev/guide/templates/error-boundaries) מסמן אותו כ-developer preview: ה-API עוד יכול להשתנות. הוא תופס שגיאות של קומפוננטות ו-directives שבתוכו, ברינדור הראשון או ב-change detection, ומציג במקומן את `@error`:

```typescript
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-price',
  template: `<p>{{ formatted() }}</p>`,
})
export class Price {
  readonly amount = input.required<number>();
  protected readonly formatted = computed(() => {
    if (this.amount() < 0) throw new Error(`Invalid amount: ${this.amount()}`);
    return `₪${this.amount().toFixed(2)}`;
  });
}
```

```typescript
import { Component, signal } from '@angular/core';
import { Price } from './price';

@Component({
  selector: 'app-cart',
  imports: [Price],
  template: `
    @boundary {
      <app-price [amount]="total()" />
    } @error {
      <p>Couldn't show the price: {{ $error.message }}</p>
      <button (click)="total.set(0); $reset()">Reset</button>
    }
    <app-price [amount]="10" />
  `,
})
export class Cart {
  protected readonly total = signal(-5);
}
```

- מוצג `Couldn't show the price: Invalid amount: -5`, והמחיר השני, מחוץ לבלוק, מוצג כרגיל.
- ‏`$error` היא השגיאה שנתפסה. ‏`$reset()` מרנדר מחדש את התוכן המקורי, וכאן אחרי איפוס הסכום מוצג `₪0.00`.
- בבדיקה שלי השגיאה הגיעה ל-`onViewError` של ה-`ErrorHandler` ולא ל-`handleError`.
- אפשר כמה בלוקי `@error` עם `when`, למשל `@error (let err; when isNetworkError(err))`. ‏Angular בוחר את הראשון שמתאים, ו-`@error` בלי `when` תופס את השאר.

## טעויות נפוצות של מתחילים

- **להסתמך על `ErrorHandler` להודעות למשתמש.** התיעוד מתאר אותו כמנגנון לדיווח על שגיאות, לא להצגה. הודעה למשתמש שייכת למקום שבו השגיאה קרתה.
- **להסיר את `provideBrowserGlobalErrorListeners`.** שגיאות ב-`setTimeout` וב-promise שנדחה בלי `catch` מפסיקות להגיע ל-`ErrorHandler`.
- **לעטוף `<ng-content>` ב-`@boundary`.** שגיאות של תוכן מוקרן שייכות לתבנית שהכריזה עליו, ולא נתפסות שם. עוטפים את הקומפוננטה בתבנית ההורה.

## מה הלאה

בפוסט הבא: בדיקות לקומפוננטות עם TestBed ו-Vitest.
