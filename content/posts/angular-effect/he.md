---
title: "effect ב-Angular: קוד שרץ כש-signal משתנה, ומתי לא להשתמש בו"
summary: "effect מסנכרן signals עם APIs שלא מכירים signals, כמו localStorage. מתי הוא רץ, למה ערך נגזר שייך ל-computed, ‏untracked, ניקוי עם onCleanup והקשר הזרקה."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 13 }
---

‏[`computed`](he/posts/angular-signals/) מחשב ערך מ-signals. לפעמים צריך במקום ערך פעולה: לכתוב ל-localStorage, לשלוח לוג, לעדכן ספרייה שמציירת גרף. בשביל זה יש [`effect`](https://angular.dev/guide/signals/effect): פונקציה שרצה פעם אחת אחרי שנוצרה, ושוב בכל פעם שמשתנה signal שהיא קראה.

כל דוגמה נבדקה עם Angular 22.2.

## סנכרון עם localStorage

```typescript
import { Component, effect, signal } from '@angular/core';

@Component({
  selector: 'app-theme-toggle',
  template: `<button (click)="toggle()">Theme: {{ theme() }}</button>`,
})
export class ThemeToggle {
  protected readonly theme = signal(localStorage.getItem('theme') ?? 'light');

  constructor() {
    effect(() => {
      localStorage.setItem('theme', this.theme());
    });
  }

  protected toggle() {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }
}
```

ה-effect קורא את `theme()`, ולכן תלוי בו. בכל לחיצה הערך החדש נשמר, ובטעינה הבאה ה-signal מתחיל ממנו.

‏effect לא רץ באותו רגע שבו ה-signal משתנה. ‏Angular [מתזמן אותו כחלק מ-change detection](https://angular.dev/guide/signals/effect#execution-of-effects): ‏effect שנוצר בקומפוננטה (view effect) רץ לפני שהקומפוננטה נבדקת, ו-effect של שירות ברמת root רץ לפני כל הקומפוננטות. בבדיקה של הקוד הזה, מיד אחרי הלחיצה `localStorage` עדיין החזיק `light`, והערך `dark` הגיע רק כשהמסך התעדכן. ‏effect של קומפוננטה [נהרס יחד איתה](https://angular.dev/guide/signals/effect#destroying-effects), כך שאין מה לבטל ביד.

## כשצריך ערך, לא פעולה

```typescript
import { Component, effect, signal } from '@angular/core';

@Component({
  selector: 'app-full-name',
  template: `<p>{{ fullName() }}</p>`,
})
export class FullName {
  readonly firstName = signal('Dana');
  readonly lastName = signal('Levi');
  readonly fullName = signal(''); // a copy that an effect keeps in sync

  constructor() {
    effect(() => {
      this.fullName.set(`${this.firstName()} ${this.lastName()}`);
    });
  }
}
```

הקוד מציג את השם הנכון, אבל [התיעוד](https://angular.dev/guide/signals/effect#use-cases-for-effects) מגדיר את effect כ-API האחרון שכדאי לפנות אליו. בבדיקה, מיד אחרי `firstName.set('Noa')` הפונקציה `fullName()` עדיין החזירה `Dana Levi`, עד שה-effect רץ. לפי התיעוד, העברת state בין signals עם effect עלולה לגרום גם לשגיאות `ExpressionChangedAfterItHasBeenChecked`, ללולאות עדכון אינסופיות ולסבבי change detection מיותרים.

התיקון הוא שורה אחת:

```typescript
readonly fullName = computed(() => `${this.firstName()} ${this.lastName()}`);
```

ערך שנגזר מ-signals אחרים הוא `computed`. אם צריך גם לכתוב אליו, יש [`linkedSignal`](he/posts/angular-linked-signal/).

## ‏untracked: לקרוא בלי להירשם

```typescript
import { Component, effect, signal, untracked } from '@angular/core';

@Component({
  selector: 'app-user-log',
  template: `<button (click)="clicks.update((n) => n + 1)">Click</button>`,
})
export class UserLog {
  readonly user = signal('dana');
  readonly clicks = signal(0);

  constructor() {
    effect(() => {
      console.log(`User: ${this.user()}, clicks so far: ${untracked(this.clicks)}`);
    });
  }
}
```

‏effect נרשם לכל signal שהוא קורא. כאן הלוג צריך לרוץ רק כשהמשתמש מתחלף, ומספר הלחיצות הוא מידע נלווה. ‏[`untracked`](https://angular.dev/guide/signals#reading-without-tracking-dependencies) קורא את `clicks` בלי ליצור תלות: שתי לחיצות לא הדפיסו כלום, והחלפת המשתמש ל-`noa` הדפיסה `User: noa, clicks so far: 2`. אפשר להעביר ל-untracked גם פונקציה שלמה, למשל קריאה לשירות שקורא signals משלו.

## ניקוי עם onCleanup

```typescript
import { Component, effect, signal } from '@angular/core';

@Component({
  selector: 'app-draft',
  template: `<textarea #box [value]="text()" (input)="text.set(box.value)"></textarea>`,
})
export class Draft {
  protected readonly text = signal(localStorage.getItem('draft') ?? '');

  constructor() {
    effect((onCleanup) => {
      const value = this.text();
      const timer = setTimeout(() => localStorage.setItem('draft', value), 500);
      onCleanup(() => clearTimeout(timer));
    });
  }
}
```

הפונקציה של effect מקבלת [`onCleanup`](https://angular.dev/guide/signals/effect#effect-cleanup-functions). ‏Angular מריץ את מה שנרשם בו לפני הריצה הבאה של ה-effect, או כשה-effect נהרס. כאן כל הקשה מבטלת את הטיימר הקודם, ולכן הטיוטה נשמרת רק אחרי חצי שנייה בלי הקלדה. בבדיקה הוקלדו `h`, ‏`hi` ו-`hi!` בהפרש של 100ms, ו-`setItem` נקרא פעם אחת, עם `hi!`.

## הקשר הזרקה

‏effect נקשר ל-`DestroyRef` של המקום שבו נוצר, ולכן הוא צריך [injection context](https://angular.dev/guide/signals/effect#injection-context): בנאי או אתחול של שדה. קריאה מתוך מתודה רגילה, למשל אחרי לחיצה, נכשלת:

```text
NG0203: effect() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`.
```

הפתרון הוא לשמור `Injector` מראש ולהעביר אותו ב-options (על `inject` ב[פוסט משלו](he/posts/angular-inject/)):

```typescript
import { Component, Injector, effect, inject, signal } from '@angular/core';

@Component({
  selector: 'app-logger',
  template: `<button (click)="startLogging()">Start logging</button>`,
})
export class Logger {
  readonly count = signal(0);
  private readonly injector = inject(Injector);

  startLogging() {
    effect(() => console.log(`count: ${this.count()}`), { injector: this.injector });
  }
}
```

### בגרסאות קודמות

עד גרסה 19, effect שהופעל מחוץ ל-change detection רץ כ-microtask, וכתיבה ל-signal מתוך effect הייתה חסומה אלא אם העבירו `allowSignalWrites: true`:

```typescript
import { Component, effect, signal } from '@angular/core';

@Component({
  selector: 'app-full-name-old',
  template: `<p>{{ fullName() }}</p>`,
})
export class FullNameOld {
  readonly firstName = signal('Dana');
  readonly fullName = signal('');

  constructor() {
    effect(() => this.fullName.set(this.firstName()), { allowSignalWrites: true });
  }
}
```

[גרסה 19](https://github.com/angular/angular/blob/main/CHANGELOG.md) העבירה את effect לתוך change detection והפכה את הדגל ל-no-op. ‏[`CreateEffectOptions`](https://angular.dev/api/core/CreateEffectOptions) עדיין מקבל אותו, ומסמן אותו כ-deprecated. מי שרואה אותו בקוד יכול למחוק אותו, ובדרך כלל גם להחליף את ה-effect כולו ב-`computed`.

## טעויות נפוצות של מתחילים

- **להעתיק signal ל-signal עם effect.** זה `computed`, או `linkedSignal` אם צריך גם לכתוב.
- **לקרוא signal אחרי `await`.** [הקשר ריאקטיבי](https://angular.dev/guide/signals#reactive-context-and-async-operations) קיים רק בקוד סינכרוני, ו-signal שנקרא אחרי `await` לא נרשם כתלות. קוראים אותו לפני.
- **לגעת ב-DOM מתוך effect.** ‏effect רץ לפני ש-Angular מעדכן את ה-DOM. לעבודה עם ה-DOM יש [`afterRenderEffect`](https://angular.dev/guide/signals/effect#side-effects-on-dom-elements) ו-`afterNextRender`, שמופיע בפוסט על [מחזור החיים של קומפוננטה](he/posts/angular-lifecycle/).

## מה הלאה

בפוסט הבא: ‏`linkedSignal`, ‏signal שאפשר לכתוב אליו ושמתאפס כשהמקור שלו משתנה.
