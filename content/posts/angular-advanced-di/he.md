---
title: "DI מתקדם ב-Angular: ‏multi, ‏provideAppInitializer, ‏environment injectors ו-injectAsync"
summary: "‏providers עם multi: true, קוד שרץ לפני שהאפליקציה עולה עם provideAppInitializer, ‏environment injector משלכם, וטעינה עצלה של שירות עם injectAsync של Angular 22."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 31 }
---

ארבעה כלים של DI שלא צריך כל יום, אבל כשצריך אין להם תחליף פשוט.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest, והפלט של `ng build` הוא מהרצה אמיתית.

## כמה ערכים ל-token אחד: ‏multi: true

בדרך כלל provider חדש ל-token דורס את הקודם. עם `multi: true` הם מצטברים, ו-`inject` מחזיר מערך:

```typescript
import { InjectionToken } from '@angular/core';

export const VALIDATORS = new InjectionToken<((value: string) => string | null)[]>('VALIDATORS');

export const validatorProviders = [
  { provide: VALIDATORS, multi: true, useValue: (v: string) => (v ? null : 'required') },
  { provide: VALIDATORS, multi: true, useValue: (v: string) => (v.length <= 5 ? null : 'too long') },
];
```

‏`inject(VALIDATORS)` מחזיר מערך של שתי הפונקציות, ועל `'too long value'` הן מחזירות `[null, 'too long']`. כל ספרייה או פיצ'ר יכולים להוסיף פונקציה בלי לדעת על האחרים. כך עובדים גם tokens של Angular עצמו, כמו `HTTP_INTERCEPTORS` ו-`APP_INITIALIZER` שבסוף הפוסט.

## קוד שרץ לפני העלייה: ‏provideAppInitializer

[`provideAppInitializer`](https://angular.dev/api/core/provideAppInitializer) מריץ פונקציה בזמן עליית האפליקציה. אם היא מחזירה Promise או Observable, האפליקציה מחכה לו לפני שהיא מסיימת לעלות:

```typescript
import { Service, provideAppInitializer, inject } from '@angular/core';

@Service()
export class Settings {
  locale = 'en';

  async load() {
    await new Promise((resolve) => setTimeout(resolve, 50));
    this.locale = 'he';
  }
}

export const settingsInitializer = provideAppInitializer(() => inject(Settings).load());
```

מוסיפים את `settingsInitializer` ל-`providers` ב-`app.config.ts`, וכל קומפוננטה רואה כבר `locale` שערכו `'he'`. הפונקציה רצה ב-injection context, ולכן `inject` מותר בה. השימוש הנפוץ הוא טעינת הגדרות או תרגומים מהשרת. כל המתנה כאן מעכבת את הרינדור הראשון, אז כדאי שתהיה קצרה.

## ‏environment injector משלכם

[`createEnvironmentInjector`](https://angular.dev/api/core/createEnvironmentInjector) יוצר injector חדש עם providers משלו, מתחת ל-injector קיים:

```typescript
import { EnvironmentInjector, InjectionToken, Service, createEnvironmentInjector, inject } from '@angular/core';

export const REPORT_LABEL = new InjectionToken<string>('REPORT_LABEL');

@Service()
export class ReportsFeature {
  private readonly parent = inject(EnvironmentInjector);
  private injector?: EnvironmentInjector;

  open() {
    this.injector ??= createEnvironmentInjector(
      [{ provide: REPORT_LABEL, useValue: 'Q3' }],
      this.parent,
      'reports',
    );
    return this.injector.get(REPORT_LABEL);
  }

  close() {
    this.injector?.destroy();
    this.injector = undefined;
  }
}
```

‏`open()` מחזיר `'Q3'`. ה-injector החדש רואה את כל מה שיש ב-root (למשל את `Settings`), אבל ה-root לא רואה את `REPORT_LABEL`. ‏`destroy()` הורס את השירותים שנוצרו בו ומריץ את פונקציות הניקוי שלהם. המחרוזת `'reports'` מופיעה בהודעות שגיאה. הראוטר עושה את זה בשבילכם: לכל route עם `providers` הוא [יוצר environment injector](https://angular.dev/guide/di/defining-dependency-providers#route-providers), כך שברוב האפליקציות לא קוראים לפונקציה הזו ישירות.

## שירות שנטען רק כשצריך: ‏injectAsync

שירות כבד שמשמש רק בלחיצה על כפתור לא צריך להיות בחבילה הראשונה. [`injectAsync`](https://angular.dev/guide/di/lazy-loading-services), חדש ב-Angular 22, טוען אותו ב-`import()` דינמי. השירות צריך להיות רשום ב-root, עם `@Service()` או `providedIn: 'root'`:

```typescript
import { Service } from '@angular/core';

@Service()
export default class ReportExporter {
  export() {
    return 'report.csv';
  }
}
```

```typescript
import { Component, injectAsync, onIdle, signal } from '@angular/core';

@Component({
  selector: 'app-report',
  template: `<button (click)="export()">Export</button> {{ file() }}`,
})
export class Report {
  private readonly exporter = injectAsync(() => import('./report-exporter'), { prefetch: onIdle });
  protected readonly file = signal('');

  async export() {
    const exporter = await this.exporter();
    this.file.set(exporter.export());
  }
}
```

‏`injectAsync` מחזיר פונקציה. הקריאה הראשונה טוענת את הקובץ ומחזירה Promise של המופע, והקריאות הבאות משתמשות באותו Promise. בגלל ש-`ReportExporter` הוא `export default`, אפשר להעביר את `import()` כמו שהוא. בלי `prefetch` הקובץ נטען רק בלחיצה, ו-`onIdle` טוען אותו מראש כשהדפדפן פנוי. ‏`ng build` מראה שהשירות יצא לקובץ נפרד:

```text
Initial chunk files | Names           |  Raw size | Estimated transfer size
chunk-7LX2AGXN.js   | -               | 105.73 kB |                31.93 kB
main-KAZJBYU6.js    | main            |  88.87 kB |                22.58 kB
styles-5INURTSO.css | styles          |   0 bytes |                 0 bytes

                    | Initial total   | 194.60 kB |                54.51 kB

Lazy chunk files    | Names           |  Raw size | Estimated transfer size
chunk-DOF22DY3.js   | report-exporter | 204 bytes |               204 bytes
```

### בגרסאות קודמות

לפני `provideAppInitializer` רשמו פונקציית אתחול דרך ה-token ‏`APP_INITIALIZER`, עם `multi: true` ו-factory שמחזיר פונקציה:

```typescript
import { APP_INITIALIZER } from '@angular/core';
import { Settings } from './config';

export const oldInitializer = {
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: (settings: Settings) => () => settings.load(),
  deps: [Settings],
};
```

‏`APP_INITIALIZER` [מסומן כ-deprecated מגרסה 19](https://angular.dev/api/core/APP_INITIALIZER), אבל הוא עדיין עובד ונפוץ בקוד קיים.

## טעויות נפוצות של מתחילים

- **לשכוח `multi: true` באחד ה-providers.** ‏Angular לא מערבב את שני הסוגים על אותו token, וזורק `Cannot mix multi providers and regular providers`.
- **לייבא את השירות של `injectAsync` גם בצורה רגילה.** ‏`import` רגיל של `ReportExporter` בקובץ אחר מכניס את הקוד שלו לחבילה הראשונה, וה-chunk הנפרד נשאר כמעט ריק.

## מה הלאה

בפוסט הבא מתחילים את הראוטר: ‏`provideRouter`, ‏`<router-outlet>`, ‏`routerLink`, הפניות ועמוד 404.
