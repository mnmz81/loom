---
title: "@Service() ו-@Injectable: איך מגדירים שירות ב-Angular"
summary: "הדקורטור @Service() של Angular 22: מופע יחיד לכל האפליקציה, factory להחלפת מימוש, autoProvided: false לשירות לכל קומפוננטה, ומתי עדיין צריך @Injectable."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 29 }
---

בפוסט הקודם השירות `Cart` סומן ב-`@Injectable({ providedIn: 'root' })`. מגרסה 22 הדרך הרגילה לכתוב שירות כזה היא `@Service()`, ובה נשתמש מכאן והלאה בסדרה. כאן נראה מה הדקורטור עושה, אילו אפשרויות יש לו, ומתי עדיין צריך את `@Injectable`.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## מה ‏@Service() עושה

‏[`@Service()`](https://angular.dev/api/core/Service) נוסף ב-Angular 22. לפי [המדריך](https://angular.dev/guide/di/creating-and-using-services), שירות שמסומן בו נרשם ב-root injector, כלומר:

- יש ממנו מופע אחד, משותף לכל האפליקציה;
- לא צריך לרשום אותו באף מערך `providers`;
- אם אף קוד לא מזריק אותו, ה-bundler משמיט אותו מה-build של production ‏(tree-shaking).

הוא שווה ערך ל-`@Injectable({ providedIn: 'root' })`, רק קצר יותר. תלויות של השירות עצמו מגיעות רק דרך `inject()` בשדות.

## להחליף מימוש עם factory

לפעמים המחלקה שמזריקים היא ממשק, והמימוש תלוי בהגדרה. ‏`factory` מחליט מה יוחזר:

```typescript
import { InjectionToken, Service, inject } from '@angular/core';

export const ANALYTICS_ENABLED = new InjectionToken<boolean>('ANALYTICS_ENABLED', {
  factory: () => false,
});

@Service()
export class ConsoleAnalytics {
  track(event: string) {
    return `sent: ${event}`;
  }
}

@Service({
  factory: () => (inject(ANALYTICS_ENABLED) ? inject(ConsoleAnalytics) : new NoopAnalytics()),
})
export class Analytics {
  track(event: string) {
    return `skipped: ${event}`;
  }
}

class NoopAnalytics extends Analytics {}
```

קומפוננטה שמזריקה `Analytics` מקבלת כברירת מחדל `NoopAnalytics`, ו-`track('x')` מחזיר `skipped: x`. כש-`ANALYTICS_ENABLED` מקבל `true` (בפוסט הבא נראה איך נותנים ל-token ערך), היא מקבלת את המופע המשותף של `ConsoleAnalytics`, ו-`track('x')` מחזיר `sent: x`. ה-factory רץ ב-injection context, ולכן `inject` מותר בתוכו.

## שירות לכל קומפוננטה: ‏autoProvided: false

לפעמים כל קומפוננטה צריכה עותק משלה. כאן לכל עורך יש טיוטה נפרדת:

```typescript
import { Component, Service, inject, signal } from '@angular/core';

@Service({ autoProvided: false })
export class Draft {
  readonly text = signal('');
}

@Component({
  selector: 'app-editor',
  providers: [Draft],
  template: `<input #box (input)="draft.text.set(box.value)" /> {{ draft.text() }}`,
})
export class Editor {
  protected readonly draft = inject(Draft);
}

@Component({
  selector: 'app-editors',
  imports: [Editor],
  template: `<app-editor /><app-editor />`,
})
export class Editors {}
```

‏`autoProvided: false` מבטל את הרישום ב-root, ו-`providers: [Draft]` יוצר מופע חדש לכל `app-editor`. הקלדה בעורך הראשון לא משנה את השני. בלי `providers`, ההזרקה נכשלת (שם המחלקה מהבדיקה):

```text
NG0201: No provider found for `_Draft`. Find more at https://v22.angular.dev/errors/NG0201
```

## מתי עדיין צריך ‏@Injectable

‏`@Service()` תומך רק ב-`inject()`. ‏constructor עם פרמטרים לא עובר קומפילציה:

```text
✘ [ERROR] NG2028: @Service class cannot use constructor dependency injection. Use the `inject` function instead. [plugin angular-compiler]
```

לפי המדריך, בוחרים ב-`@Injectable` כשצריך:

- הזרקה דרך ה-constructor, למשל בקוד קיים;
- את האפשרויות `useClass`, ‏`useValue`, ‏`useExisting` או `useFactory` בתוך הדקורטור;
- היקף שאינו root, כמו `providedIn: 'platform'`, שמשותף לכמה אפליקציות באותו עמוד.

‏`@Injectable` לא מסומן כ-deprecated, והוא עדיין מופיע בכל קוד שנכתב לפני גרסה 22.

### בגרסאות קודמות

אותם שני שירותים עם `@Injectable`:

```typescript
import { Injectable, inject, signal } from '@angular/core';
import { ANALYTICS_ENABLED, ConsoleAnalytics } from './analytics';

@Injectable({
  providedIn: 'root',
  useFactory: () => (inject(ANALYTICS_ENABLED) ? inject(ConsoleAnalytics) : new OldNoopAnalytics()),
})
export class OldAnalytics {
  track(event: string) {
    return `skipped: ${event}`;
  }
}

class OldNoopAnalytics extends OldAnalytics {}

@Injectable()
export class OldDraft {
  readonly text = signal('');
}
```

‏`providedIn: 'root'` מקביל ל-`@Service()`, ו-`useFactory` מקביל ל-`factory`. ‏`@Injectable()` בלי `providedIn` מקביל ל-`autoProvided: false`: צריך לרשום את השירות ב-`providers`.

## טעויות נפוצות של מתחילים

- **לרשום ב-`providers` של קומפוננטה שירות שכבר נמצא ב-root.** הקומפוננטה מקבלת מופע חדש משלה, ושינויים בו לא נראים בשאר האפליקציה.
- **לשכוח את `providers` אחרי `autoProvided: false`.** התוצאה היא NG0201 בזמן ריצה, לא שגיאת קומפילציה.

## מה הלאה

בפוסט הבא: ‏providers לעומק. ‏`useClass`, ‏`useValue` ו-`useFactory`, ‏`InjectionToken`, וההיררכיה של ה-injectors.
