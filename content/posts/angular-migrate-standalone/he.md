---
title: "מעבר מ-NgModule ל-standalone עם המיגרציה של Angular"
summary: "המיגרציה ng generate @angular/core:standalone על אפליקציית NgModule אמיתית: שלושת השלבים, מה כל אחד שינה, איפה ה-build נשבר ומה תיקנו ידנית."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 81 }
---

מגרסה 19 קומפוננטות הן standalone כברירת מחדל, אבל הרבה פרויקטים עדיין בנויים על NgModule. ל-Angular יש מיגרציה שעושה את רוב המעבר. הפוסט מריץ אותה על אפליקציה קטנה ומראה גם את מה שהיא לא סידרה.

כל דוגמה נבדקה עם Angular 22.2.

## האפליקציה לפני

קומפוננטת שורש, מודול שורש, ומודול נוסף עם קומפוננטה ו-pipe:

```typescript
// main.ts
platformBrowser().bootstrapModule(AppModule).catch((err) => console.error(err));

// app.module.ts
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, GreetingModule],
  bootstrap: [AppComponent],
})
export class AppModule {}

// greeting/greeting.module.ts
@NgModule({
  declarations: [GreetingComponent, ShoutPipe],
  imports: [CommonModule],
  exports: [GreetingComponent],
})
export class GreetingModule {}

// greeting/greeting.component.ts
@Component({
  selector: 'app-greeting',
  standalone: false,
  template: `<p>Hello, {{ name | shout }}</p>`,
})
export class GreetingComponent {
  @Input() name = '';
}
```

(שורות ה-import הושמטו.) ‏`AppComponent` מציג `<app-greeting name="Loom" />`, ו-`ShoutPipe` מחזיר את הטקסט באותיות גדולות עם סימן קריאה.

לפי [מדריך המיגרציה](https://angular.dev/reference/migrations/standalone), לפני שמתחילים צריך פרויקט שעובר build בלי שגיאות וענף git נקי. מריצים את שלושת השלבים לפי הסדר, ובודקים build אחרי כל אחד.

## שלב 1: הצהרות ל-standalone

```bash
ng generate @angular/core:standalone --mode=convert-to-standalone
```

```text
UPDATE src/app/greeting/greeting.component.ts (272 bytes)
UPDATE src/app/greeting/shout.pipe.ts (202 bytes)
UPDATE src/app/greeting/greeting.module.ts (330 bytes)
```

```typescript
@Component({
  selector: 'app-greeting',
  template: `<p>Hello, {{ name | shout }}</p>`,
  imports: [ShoutPipe],
})
export class GreetingComponent {
  @Input() name = '';
}
```

‏`standalone: false` נמחק, וה-pipe שהתבנית משתמשת בו נכנס ל-`imports`. ב-`GreetingModule` ההצהרות עברו מ-`declarations` ל-`imports`. ‏`AppComponent` לא השתנה: השלב הזה מדלג על מודול שמאתחל קומפוננטה (`bootstrap`).

## שלב 2: מחיקת מודולים מיותרים

```bash
ng generate @angular/core:standalone --mode=prune-ng-modules
```

```text
DELETE src/app/greeting/greeting.module.ts
UPDATE src/app/app.module.ts (281 bytes)
```

‏`GreetingModule` נמחק, והמיגרציה הוציאה אותו גם מ-`imports` של `AppModule`. אבל היא לא הכניסה במקומו את `GreetingComponent`, וה-build נשבר:

```text
✘ [ERROR] NG8001: 'app-greeting' is not a known element:
1. If 'app-greeting' is an Angular component, then verify that it is part of this module.
```

התיקון הידני: להוסיף `GreetingComponent` ל-`imports` של `AppModule`. זו הסיבה לבדוק build אחרי כל שלב, ולא רק בסוף.

## שלב 3: אתחול בלי מודול

```bash
ng generate @angular/core:standalone --mode=standalone-bootstrap
```

```text
DELETE src/app/app.module.ts
UPDATE src/main.ts (333 bytes)
UPDATE src/app/app.component.ts (262 bytes)
```

‏`AppModule` נמחק, ל-`AppComponent` נוסף `imports: [GreetingComponent]`, ו-`main.ts` עבר ל-`bootstrapApplication`:

```typescript
import { platformBrowser, BrowserModule, bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [importProvidersFrom(BrowserModule)],
}).catch((err) => console.error(err));
```

המיגרציה העבירה את `imports` של המודול כמו שהם, דרך `importProvidersFrom`. ‏`BrowserModule` לא נדרש עם `bootstrapApplication`, ו-`platformBrowser` כבר לא בשימוש, כך שאחרי ניקוי נשאר:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent).catch((err) => console.error(err));
```

ה-build עבר, אבל הבדיקות לא: ה-spec עדיין ייבא את `AppModule` שנמחק.

```text
✘ [ERROR] TS2307: Cannot find module './app.module' or its corresponding type declarations. [plugin angular-compiler]
```

אחרי שה-spec עבר ליצור את `AppComponent` ישירות (`TestBed.createComponent(AppComponent)`), גם הבדיקה עברה. המדריך מזהיר מזה: בדיקות לא עוברות קומפילציית AOT, ולכן מה שהמיגרציה כותבת בהן לא תמיד נכון.

## אפשרויות שימושיות

- ‏`--path=src/app/orders` מגביל את המיגרציה לתיקייה, כדי לעבור בהדרגה בפרויקט גדול.
- ‏`--dry-run` (אפשרות של כל `ng generate`) מציג אילו קבצים ישתנו בלי לכתוב אותם.

אחרי המעבר הקוד עדיין משתמש ב-`@Input` וב-`constructor` להזרקה. את זה מעבירות מיגרציות אחרות, בפוסט הבא.

## טעויות נפוצות של מתחילים

- **להריץ את שלושת השלבים ברצף ולבדוק רק בסוף.** כשה-build נשבר, כבר לא ברור איזה שלב שבר אותו.
- **להשאיר את הקוד שהמיגרציה כתבה כמו שהוא.** ‏`importProvidersFrom(BrowserModule)` ו-imports שלא בשימוש עובדים, אבל הם רעש שכדאי לנקות.
- **לשכוח את הבדיקות.** קבצי spec שמייבאים מודול שנמחק נשברים, ואת זה מתקנים ידנית.

## מה הלאה

בפוסט הבא: מיגרציות ל-signals. ‏`@Input`, ‏`@Output`, ‏`@ViewChild`, הזרקה בבנאי ו-`*ngIf`, כל אחד עם הסכמה שלו.
