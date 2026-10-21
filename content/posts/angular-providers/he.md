---
title: "providers ב-Angular: ‏useClass, ‏useValue, ‏useFactory ו-InjectionToken"
summary: "איך אומרים ל-Angular מה להזריק: providers ב-app.config.ts, ‏useClass, ‏useValue, ‏useFactory ו-useExisting, ‏InjectionToken, היררכיית ה-injectors ו-optional, ‏self ו-skipSelf."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 30 }
---

provider הוא הוראה ל-Angular: כשמבקשים את ה-token הזה, תן את הערך הזה. ‏`@Service()` מהפוסט הקודם יוצר provider כזה לבד. כאן כותבים אותם בעצמנו.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ‏providers ב-app.config.ts

ב-`app.config.ts` של פרויקט חדש כבר יש מערך `providers`. כל מה שנרשם בו זמין בכל האפליקציה:

```typescript
import { ApplicationConfig, InjectionToken, inject } from '@angular/core';

export abstract class Logger {
  abstract log(message: string): string;
}

export class ConsoleLogger extends Logger {
  log(message: string) {
    return `[console] ${message}`;
  }
}

export const API_URL = new InjectionToken<string>('API_URL');
export const USERS_URL = new InjectionToken<string>('USERS_URL');

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: Logger, useClass: ConsoleLogger },
    { provide: API_URL, useValue: 'https://api.example.com' },
    { provide: USERS_URL, useFactory: () => `${inject(API_URL)}/users` },
  ],
};
```

‏`provide` הוא ה-token, והמפתח השני קובע את הערך ([סוגי providers](https://angular.dev/guide/di/defining-dependency-providers)):

- `useClass`: ‏Angular יוצר מופע של המחלקה. ‏`inject(Logger)` מחזיר `ConsoleLogger`, ובבדיקה אפשר להחליף אותו במחלקה אחרת בלי לגעת בקוד שמשתמש בו.
- `useValue`: ערך מוכן, מכל סוג.
- `useFactory`: פונקציה שמחשבת את הערך. היא רצה ב-injection context, ולכן `inject` מותר בה. ‏`inject(USERS_URL)` מחזיר `https://api.example.com/users`.
- `useExisting`: כינוי. ‏`{ provide: OldLogger, useExisting: Logger }` גורם לשני ה-tokens להחזיר אותו מופע.

## ‏InjectionToken

‏token של מחלקה הוא המחלקה עצמה. למחרוזת, למספר או לממשק אין ייצוג בזמן ריצה, ולכן יוצרים להם [`InjectionToken`](https://angular.dev/api/core/InjectionToken). הטיפוס הגנרי (`<string>`) קובע מה `inject` יחזיר. המחרוזת שמועברת ל-constructor משמשת רק להודעות שגיאה: ‏Angular משווה tokens לפי האובייקט, כך ששני tokens עם אותו תיאור הם שני tokens שונים.

ל-token אפשר לתת גם `factory`, כמו `ANALYTICS_ENABLED` בפוסט הקודם. ‏token כזה נרשם ב-root לבד, וה-factory נותן ערך ברירת מחדל ש-provider יכול לדרוס.

## היררכיית ה-injectors

ל-Angular אין injector אחד אלא [עץ](https://angular.dev/guide/di/hierarchical-dependency-injection):

- **element injectors**: לכל קומפוננטה או דירקטיבה שיש לה `providers`. כך `Draft` בפוסט הקודם קיבל מופע נפרד לכל עורך.
- **environment injectors**: ה-root, שנבנה מ-`app.config.ts` ומשירותי `@Service()`, ומעליו ה-platform injector.

כש-`inject(X)` נקרא, ‏Angular מחפש קודם ב-element injector של הקומפוננטה ועולה בעץ הקומפוננטות. אם לא מצא, הוא עובר ל-environment injectors. אם גם שם אין, נזרקת NG0201. ה-provider הראשון שנמצא מנצח, ולכן provider בקומפוננטה מסתיר את זה שב-root.

## לשנות את החיפוש: ‏optional, ‏self ו-skipSelf

הארגומנט השני של `inject` משנה את סדר החיפוש:

```typescript
import { Component, Service, inject } from '@angular/core';

@Service({ autoProvided: false })
export class Theme {
  name = 'light';
}

@Component({
  selector: 'app-panel',
  providers: [{ provide: Theme, useValue: { name: 'dark' } }],
  template: `own: {{ own.name }}, parent: {{ parent?.name ?? 'none' }}`,
})
export class Panel {
  protected readonly own = inject(Theme, { self: true });
  protected readonly parent = inject(Theme, { skipSelf: true, optional: true });
}
```

- `self: true` מחפש רק ב-injector של הקומפוננטה עצמה, ומוצא את `dark`.
- `skipSelf: true` מתחיל מההורה ומדלג על ה-provider המקומי.
- `optional: true` מחזיר `null` במקום לזרוק כשלא נמצא כלום.

לבד, `app-panel` מציג `own: dark, parent: none`. בתוך קומפוננטה עם `providers: [Theme]` הוא מציג `own: dark, parent: light`. יש גם `host: true`, שעוצר את החיפוש בקומפוננטה המארחת.

### בגרסאות קודמות

לפני `inject()`, אותן אפשרויות נכתבו כדקורטורים על פרמטרים של ה-constructor, ו-`useFactory` קיבל את התלויות דרך `deps`:

```typescript
import { Component, Inject, Optional, SkipSelf } from '@angular/core';
import { API_URL, USERS_URL } from './logger';
import { Theme } from './modifiers';

export const oldProviders = [
  { provide: USERS_URL, useFactory: (api: string) => `${api}/users`, deps: [API_URL] },
];

@Component({ selector: 'app-old-panel', template: `{{ url }} {{ parent?.name ?? 'none' }}` })
export class OldPanel {
  constructor(
    @Inject(USERS_URL) protected url: string,
    @Optional() @SkipSelf() protected parent: Theme | null,
  ) {}
}
```

‏`@Inject(TOKEN)` נדרש כי טיפוס הפרמטר (`string`) לא מספיק כדי לזהות את ה-token. ‏`deps` מפרט את ה-tokens לפי סדר הפרמטרים של ה-factory. ‏`@Self()` ו-`@Host()` עובדים באותה צורה.

## טעויות נפוצות של מתחילים

- **להשתמש בממשק כ-token.** ‏`inject(MyInterface)` לא מתקמפל, כי ממשקים נמחקים בקומפילציה. צריך `InjectionToken` או מחלקה מופשטת, כמו `Logger`.
- **ליצור את אותו `InjectionToken` פעמיים.** כל `new InjectionToken` הוא token חדש, גם עם אותו תיאור. מייצאים אותו מקובץ אחד ומייבאים.

## מה הלאה

בפוסט הבא: ‏DI מתקדם. ‏providers עם `multi: true`, פונקציות שרצות בעליית האפליקציה, ‏environment injectors משלכם, ו-`injectAsync` לטעינה עצלה של שירות.
