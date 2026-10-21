---
title: "‏SSR ו-hydration ב-Angular: רינדור בשרת בלי לרנדר פעמיים"
summary: "‏ng add @angular/ssr, ‏RenderMode.Server, ‏provideClientHydration ומה הוא כולל ב-v22, למה שינוי DOM ישיר שובר hydration, ‏afterNextRender לקוד דפדפן, ו-PendingTasks."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 65 }
---

באפליקציה רגילה השרת שולח `index.html` כמעט ריק, והדף מופיע רק אחרי שה-JavaScript נטען ורץ. ב-SSR ‏(server-side rendering) ‏Angular מרנדר את העמוד בשרת ושולח HTML מלא. ‏hydration הוא השלב שבו Angular בדפדפן מאמץ את ה-DOM הקיים ומחבר אליו אירועים, במקום למחוק אותו ולבנות מחדש.

כל דוגמה נבדקה עם Angular 22.2 ו-`@angular/ssr` 22.2.3: ‏`ng build`, שרת Node שרץ, ו-`curl` והקונסול של הדפדפן.

## הוספת SSR

בפרויקט חדש: `ng new --ssr`. בפרויקט קיים, לפי [מדריך ה-SSR](https://angular.dev/guide/ssr):

```bash
ng add @angular/ssr
```

```text
CREATE src/main.server.ts (292 bytes)
CREATE src/app/app.config.server.ts (426 bytes)
CREATE src/app/app.routes.server.ts (166 bytes)
CREATE src/server.ts (1609 bytes)
UPDATE angular.json (2147 bytes)
UPDATE tsconfig.app.json (416 bytes)
UPDATE package.json (1021 bytes)
UPDATE src/app/app.config.ts (406 bytes)
```

‏`server.ts` הוא שרת Express, ו-`app.config.server.ts` מוסיף את `provideServerRendering` לקונפיגורציה של הדפדפן. ‏`app.routes.server.ts` קובע איך כל נתיב מרונדר. ברירת המחדל היא `RenderMode.Prerender` לכל הנתיבים, כלומר HTML סטטי בזמן ה-build (על זה בפוסט [SSG](he/posts/angular-ssg/)). לרינדור בכל בקשה:

```typescript
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
```

אחרי `ng build` מריצים `node dist/<project>/server/server.mjs`. ‏`ng serve` מרנדר בשרת גם בפיתוח.

## ‏hydration

‏`ng add` הוסיף שורה אחת ל-`app.config.ts`:

```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
  ],
};
```

ב-Angular 22, ‏[`provideClientHydration()`](https://angular.dev/guide/hydration) כולל שימוש חוזר ב-DOM, העברה של תשובות `HttpClient` מהשרת לדפדפן (כדי שהבקשה לא תישלח שוב), ‏[incremental hydration](he/posts/angular-incremental-hydration/), ואיתו event replay: לחיצות שקרו לפני שה-hydration הסתיים נשמרות ומופעלות אחריו. כך נראה ה-HTML שהשרת החזיר לקומפוננטה עם כפתור:

```text
<app-root ng-version="22.2.3" ngh="0" ng-server-context="ssr">
<app-counter ngh="0">
<button type="button" jsaction="click:;">Clicked 0 times</button>
```

‏`ngh` הוא המידע ש-hydration משתמש בו כדי להתאים את ה-DOM לקומפוננטות, ו-`jsaction` מסמן אירועים ש-event replay תופס. במצב פיתוח הקונסול מאשר: "Angular hydrated 4 component(s) and 15 node(s), 0 component(s) were skipped".

## מה שובר hydration

‏hydration מצפה שה-DOM בדפדפן יהיה בדיוק מה שהתבנית הייתה מייצרת. הקומפוננטה הזו מוסיפה אלמנט ישירות ל-DOM:

```typescript
import { Component, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'app-badge-dom',
  template: `<span>New</span>`,
})
export class BadgeDom {
  constructor() {
    const host = inject(ElementRef).nativeElement as HTMLElement;
    const icon = host.ownerDocument.createElement('i');
    icon.textContent = '★';
    host.appendChild(icon);
  }
}
```

בשרת יצא `<app-badge-dom><i>★</i><span>New</span></app-badge-dom>`, ובדפדפן התקבלה השגיאה `NG0500: During hydration Angular expected <span> but found <i>.` הפתרון הוא להכניס את ה-`<i>` לתבנית. לפי המדריך, גם HTML לא תקין (`<div>` בתוך `<p>`, טבלה בלי `<tbody>`) ו-`innerHTML` גורמים לאותה שגיאה. כשאין ברירה, למשל עם ספריית גרפים שמציירת לבד, אפשר לשים `ngSkipHydration` על תגית הקומפוננטה: היא תרונדר מחדש בדפדפן, בלי היתרונות של hydration.

## קוד שרץ רק בדפדפן

בשרת אין `window`,‏ `document` גלובלי או `localStorage`. ‏`signal(localStorage.getItem('theme'))` בשדה של קומפוננטה הפיל את הרינדור בשרת עם `ReferenceError: localStorage is not defined`. ‏[`afterNextRender`](https://angular.dev/guide/ssr) רץ רק בדפדפן, אחרי הרינדור:

```typescript
import { afterNextRender, Component, signal } from '@angular/core';

@Component({
  selector: 'app-theme-label',
  template: `<p>Theme: {{ theme() }}</p>`,
})
export class ThemeLabel {
  protected readonly theme = signal('light');

  constructor() {
    afterNextRender(() => {
      this.theme.set(localStorage.getItem('theme') ?? 'light');
    });
  }
}
```

השרת שולח `Theme: light`, וה-hydration מוצא בדפדפן את אותו טקסט. רק אחר כך `afterNextRender` קורא את `localStorage`, ובבדיקה הטקסט התחלף ל-`Theme: dark`. ‏`afterNextRender` מוסבר בפוסט על [lifecycle](he/posts/angular-lifecycle/). המדריך ממליץ להעדיף providers נפרדים לשרת ולדפדפן על פני בדיקות `isPlatformBrowser`, ובמיוחד לא להשתמש ב-`isPlatformBrowser` בתוך `@if`: תוכן שונה בשרת ובדפדפן שובר את ה-hydration וגורם לקפיצות בעמוד.

## ‏PendingTasks: מתי השרת מסיים

השרת שולח את ה-HTML כשהאפליקציה יציבה. בלי Zone.js ‏Angular לא יודע על `setTimeout` או `fetch` שלכם, ולכן מחכה רק למשימות שהוא מכיר, כמו בקשות `HttpClient` ([‏zoneless](he/posts/angular-zoneless/)). ‏[`PendingTasks`](https://angular.dev/guide/zoneless) מוסיף משימה משלכם:

```typescript
import { Component, inject, PendingTasks, signal } from '@angular/core';

function loadQuote(): Promise<string> {
  return new Promise((resolve) => setTimeout(() => resolve('Simplicity is prerequisite for reliability.'), 50));
}

@Component({
  selector: 'app-quote',
  template: `<blockquote>{{ quote() ?? 'Loading…' }}</blockquote>`,
})
export class Quote {
  protected readonly quote = signal<string | undefined>(undefined);

  constructor() {
    inject(PendingTasks).run(async () => {
      this.quote.set(await loadQuote());
    });
  }
}
```

עם `run` השרת החזיר את הציטוט. אותה קומפוננטה בלי `PendingTasks` החזירה `Loading…`, כי ה-HTML נשלח לפני שה-Promise הסתיים. ‏`run` מסומן כ-developer preview. ה-API היציב הוא `add()`, שמחזיר פונקציה שקוראים לה בסוף. בדפדפן הקונסטרקטור רץ שוב והנתון נטען מחדש. לנתונים מ-HTTP עדיף `HttpClient`, שהתשובה שלו מועברת מהשרת.

### בגרסאות קודמות

עד גרסה 16 SSR הגיע מהחבילה `@nguniversal/express-engine` ‏(Angular Universal). ‏`@angular/ssr` החליף אותה מגרסה 17. בקוד מלפני גרסה 22 מופיע לעתים קרובות `withEventReplay()`:

```typescript
provideClientHydration(withEventReplay());
```

ב-22 ה-incremental hydration שמופעל כברירת מחדל כולל event replay, והמדריך אומר שאפשר למחוק את `withEventReplay()`.

## טעויות נפוצות של מתחילים

- **שינוי DOM ישיר** (`appendChild`, ‏`innerHTML`, ספריות צד שלישי) בקומפוננטה שעוברת hydration. התוצאה היא `NG0500`.
- **גישה ל-`window` או `localStorage` בקונסטרקטור או בשדה.** בשרת זה `ReferenceError`. מעבירים ל-`afterNextRender`.
- **לשכוח את `allowedHosts`.** שרת ה-production דחה בקשה ל-`localhost` עם `Header "host" with value "localhost:4383" is not allowed` וסטטוס 400. מוסיפים את הדומיינים ל-`security.allowedHosts` ב-`angular.json` או למשתנה הסביבה `NG_ALLOWED_HOSTS` ([אבטחה](https://angular.dev/best-practices/security)).

## מה הלאה

בפוסט הבא: incremental hydration, ‏`@defer` עם טריגרים של `hydrate on`, ‏`hydrate never`, ובמה זה שונה מ-`@defer` רגיל.
