---
title: "ניתוב ב-Angular: ‏Routes, ‏router-outlet ו-routerLink"
summary: "הראוטר של Angular: הגדרת routes עם provideRouter, ‏<router-outlet>, קישורים עם routerLink ו-routerLinkActive, הפניות עם redirectTo ועמוד 404 עם **."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 32 }
---

אפליקציית Angular היא עמוד HTML אחד. [הראוטר](https://angular.dev/guide/routing) מחליף את התוכן לפי ה-URL בלי לטעון את העמוד מחדש, והכתובת בשורת הדפדפן עדיין משתנה, כך שכפתור "אחורה" וסימניות עובדים.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ‏Routes ו-provideRouter

‏route מחבר נתיב לקומפוננטה. שלושה עמודים פשוטים:

```typescript
import { Component } from '@angular/core';

@Component({ selector: 'app-home', template: `<h1>Home</h1>` })
export class Home {}

@Component({ selector: 'app-about', template: `<h1>About</h1>` })
export class About {}

@Component({ selector: 'app-not-found', template: `<h1>Page not found</h1>` })
export class NotFound {}
```

ב-`app.routes.ts`, שכבר קיים בפרויקט ש-`ng new` יצר:

```typescript
import { Routes } from '@angular/router';
import { About, Home, NotFound } from './pages';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'about', component: About },
  { path: 'info', redirectTo: 'about' },
  { path: '**', component: NotFound },
];
```

‏`path` נכתב בלי `/` בהתחלה. ‏[`provideRouter`](https://angular.dev/api/router/provideRouter) ב-`app.config.ts` מעביר את המערך לראוטר:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)],
};
```

## ‏router-outlet ו-routerLink

‏`<router-outlet />` מסמן איפה תוצג הקומפוננטה של ה-route הנוכחי. ‏`routerLink` הופך קישור לניווט פנימי:

```typescript
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav>
      <a routerLink="/home" routerLinkActive="active" ariaCurrentWhenActive="page">Home</a>
      <a routerLink="/about" routerLinkActive="active" ariaCurrentWhenActive="page">About</a>
    </nav>
    <router-outlet />
  `,
})
export class App {}
```

‏`routerLink` מייצר `href="/about"` אמיתי, כך שאפשר לפתוח את הקישור בלשונית חדשה. לחיצה רגילה מנווטת בלי טעינה מחדש, ו-`About` מופיע מתחת ל-`nav`. ‏`<a href="/about">` רגיל היה טוען את כל האפליקציה מחדש.

‏[`routerLinkActive`](https://angular.dev/api/router/RouterLinkActive) מוסיף את המחלקה `active` לקישור של העמוד הנוכחי, ו-`ariaCurrentWhenActive="page"` מוסיף לו `aria-current="page"`, כדי שגם קורא מסך ידע איפה המשתמש נמצא. ‏`routerLinkActive` לבד לא מוסיף את `aria-current`. כברירת מחדל קישור נחשב פעיל גם כשה-URL הנוכחי הוא נתיב-בן שלו (`/about/team`), ו-`[routerLinkActiveOptions]="{ exact: true }"` מגביל אותו להתאמה מדויקת.

## הפניות ועמוד 404

הראוטר עובר על המערך לפי הסדר, וה-route הראשון שמתאים מנצח:

- `redirectTo` מחליף את ה-URL. ‏`/info` הופך ל-`/about`, כך שקישורים ישנים ממשיכים לעבוד.
- `pathMatch: 'full'` חובה ב-redirect של נתיב ריק. ברירת המחדל, `'prefix'`, בודקת אם הנתיב הוא תחילת ה-URL, ונתיב ריק הוא תחילה של כל URL. [בלי `'full'`](https://angular.dev/guide/routing/redirecting-routes) כל ה-URLs היו מופנים.
- `**` מתאים לכל URL, ולכן הוא אחרון. ‏`/nope/deep` מציג `Page not found`, וה-URL נשאר כמו שהוא.

### בגרסאות קודמות

באפליקציות עם NgModule, הראוטר נרשם ב-`RouterModule.forRoot` בתוך `AppModule`:

```typescript
import { Component, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes';

@Component({
  selector: 'app-root',
  standalone: false,
  template: `<a routerLink="/home" routerLinkActive="active">Home</a> <router-outlet></router-outlet>`,
})
export class AppComponent {}

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, RouterModule.forRoot(routes)],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

מערך ה-routes זהה. ‏`RouterModule` מביא את `routerLink` ואת `router-outlet` לכל הקומפוננטות של המודול, במקום `imports` בכל קומפוננטה. ‏`<router-outlet></router-outlet>` עם תגית סוגרת מופיע בקוד ישן, כי תגיות שסוגרות את עצמן נתמכות בקומפוננטות רק מגרסה 15.1.

## טעויות נפוצות של מתחילים

- **לשים את `**` באמצע המערך.** כל route שאחריו לא יותאם לעולם.
- **לשכוח `pathMatch: 'full'` ב-redirect של `''`.** כל URL מופנה, לא רק `/`.

## מה הלאה

בפוסט הבא: ‏routes מקוננים. ‏`children`, ‏outlet בתוך קומפוננטה, וניווט יחסי.
