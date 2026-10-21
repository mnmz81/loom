---
title: "routes מקוננים ב-Angular: ‏children, ‏outlet פנימי וניווט יחסי"
summary: "‏routes בתוך routes: ‏children ו-router-outlet בתוך קומפוננטה, ‏route ילד ברירת מחדל, קומפוננטת layout על נתיב ריק, עמוד 404 בלי ה-layout, וקישורים יחסיים עם ../."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 33 }
---

בעמוד הגדרות יש כותרת ותפריט קבועים, ורק החלק שמתחתיהם מתחלף בין "פרופיל" ל"אבטחה". את זה עושים עם routes מקוננים: לכל route יכולים להיות `children`, והקומפוננטה שלו מציגה אותם ב-`<router-outlet>` משלה.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ‏children ו-outlet בתוך קומפוננטה

שלוש קומפוננטות. ל-`Settings` יש `<router-outlet />` משלה:

```typescript
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-settings',
  imports: [RouterLink, RouterOutlet],
  template: `
    <h1>Settings</h1>
    <a routerLink="profile">Profile</a> <a routerLink="security">Security</a>
    <router-outlet />
  `,
})
export class Settings {}

@Component({ selector: 'app-profile', template: `<h2>Profile</h2>` })
export class Profile {}

@Component({
  selector: 'app-security',
  imports: [RouterLink],
  template: `
    <h2>Security</h2>
    <a routerLink="../profile">Back to profile</a>
    <button (click)="done()">Done</button>
  `,
})
export class Security {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  done() {
    this.router.navigate(['../..'], { relativeTo: this.route });
  }
}
```

ובקובץ ה-routes:

```typescript
import { Routes } from '@angular/router';
import { Home, NotFound, Shell } from './shell';
import { Profile, Security, Settings } from './settings';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', component: Home },
      {
        path: 'settings',
        component: Settings,
        children: [
          { path: '', redirectTo: 'profile', pathMatch: 'full' },
          { path: 'profile', component: Profile },
          { path: 'security', component: Security },
        ],
      },
    ],
  },
  { path: '**', component: NotFound },
];
```

ב-`/settings/security`, ה-outlet של האפליקציה מציג את `Settings`, וה-outlet של `Settings` מציג את `Security`. ה-URL של ילד הוא הנתיב של ההורה ועוד הנתיב שלו. ילד עם `path: ''` הוא ברירת המחדל: כאן `/settings` מפנה ל-`/settings/profile`, כך שהחלק התחתון אף פעם לא ריק. ([outlets מקוננים](https://angular.dev/guide/routing/show-routes-with-outlets))

## ‏layout על נתיב ריק

ה-route העליון הוא `path: ''` עם `Shell`. נתיב ריק לא מוסיף כלום ל-URL, ולכן `Home` נמצא ב-`/` ו-`Settings` ב-`/settings`, אבל שניהם מוצגים בתוך ה-layout:

```typescript
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterOutlet],
  template: `
    <header><a routerLink="/">Loom</a> <a routerLink="/settings">Settings</a></header>
    <main><router-outlet /></main>
  `,
})
export class Shell {}

@Component({ selector: 'app-home', template: `<h1>Home</h1>` })
export class Home {}

@Component({ selector: 'app-not-found', template: `<h1>Page not found</h1>` })
export class NotFound {}
```

## עמוד 404 בלי ה-layout

ה-`**` נמצא מחוץ ל-`Shell`, ברמה העליונה. ‏`/missing` לא מתאים לאף ילד של `Shell`, ולכן הראוטר ממשיך ל-`**` ומציג רק `Page not found`, בלי ה-header. אם רוצים 404 בתוך ה-layout, מעבירים את `**` לסוף ה-`children` של `Shell`.

## ניווט יחסי

‏`routerLink` בלי `/` בהתחלה יחסי ל-route של הקומפוננטה שבה הוא כתוב ([ניווט ל-routes](https://angular.dev/guide/routing/navigate-to-routes)):

- `routerLink="security"` ב-`Settings` מייצר `href="/settings/security"`.
- `routerLink="../profile"` ב-`Security` עולה רמה אחת, ל-`settings`, ומשם ל-`profile`: ‏`href="/settings/profile"`.
- בקוד, `router.navigate` צריך `relativeTo` כדי לדעת ממה הנתיב יחסי. ‏`['../..']` מ-`Security` עולה שתי רמות, ל-route של `Shell`, כלומר ל-`/`.

בלי `relativeTo`, ‏`navigate` מתייחס לנתיב כאילו הוא מתחיל מהשורש.

קישורים יחסיים שומרים על קומפוננטה עצמאית: אם `settings` יעבור לנתיב אחר, הקישורים בתוכו ימשיכו לעבוד בלי שינוי.

## טעויות נפוצות של מתחילים

- **לשכוח את `<router-outlet />` בקומפוננטת ההורה.** ה-URL משתנה, אבל הילד לא מוצג בשום מקום.
- **לכתוב `routerLink="/profile"` כשהכוונה ל-`/settings/profile`.** ‏`/` בהתחלה הופך את הקישור למוחלט.

## מה הלאה

בפוסט הבא: פרמטרים ב-URL. ‏`users/:id`, ‏query params, וקבלה שלהם כ-`input()` עם `withComponentInputBinding`.
