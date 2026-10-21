---
title: "guards ו-resolvers ב-Angular: ‏CanActivateFn, ‏CanMatchFn ו-ResolveFn"
summary: "הגבלת גישה ל-routes עם guards פונקציונליים, הפניה עם UrlTree ו-RedirectCommand, ‏canMatch, ‏canDeactivate וטעינת נתונים לפני הצגת העמוד עם resolver. כולל guards מבוססי מחלקות מהקוד הישן."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 36 }
---

[guard](https://angular.dev/guide/routing/route-guards) הוא פונקציה שהראוטר מריץ לפני כניסה ל-route או יציאה ממנו, ו-[resolver](https://angular.dev/guide/routing/data-resolvers) פונקציה שמביאה נתונים לפני שהעמוד מוצג. שניהם רצים ב-injection context, ולכן `inject` מותר בהם.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ‏canActivate ו-UrlTree

‏`CanActivateFn` מחזיר `true` כדי להמשיך, או `UrlTree` כדי להפנות למקום אחר. כאן עמוד שדורש משתמש מחובר:

```typescript
import { Service, inject, signal } from '@angular/core';
import { CanActivateFn, CanMatchFn, RedirectCommand, Router } from '@angular/router';

@Service()
export class Auth {
  readonly user = signal<{ name: string; admin: boolean } | null>(null);
}

export const authGuard: CanActivateFn = () => {
  const loggedIn = inject(Auth).user() !== null;
  return loggedIn || inject(Router).createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (inject(Auth).user()?.admin) return true;
  return new RedirectCommand(router.parseUrl('/login'), { skipLocationChange: true });
};

export const isAdmin: CanMatchFn = () => inject(Auth).user()?.admin === true;
```

מחברים אותם ל-routes:

```typescript
import { Routes } from '@angular/router';
import { adminGuard, authGuard, isAdmin } from './guards';
import { Editor, unsavedChanges } from './editor';
import { Profile, userName } from './resolver';
import { Account, AdminDashboard, Login, UserDashboard } from './pages';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'account', component: Account, canActivate: [authGuard] },
  { path: 'admin', component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'dashboard', component: AdminDashboard, canMatch: [isAdmin] },
  { path: 'dashboard', component: UserDashboard },
  { path: 'editor', component: Editor, canDeactivate: [unsavedChanges] },
  { path: 'users/:id', component: Profile, resolve: { userName } },
];
```

משתמש שלא מחובר שנכנס ל-`/account` מגיע ל-`/login`. הדף לא מוצג, וה-URL הופך ל-`/login`. אפשר גם להחזיר `false`, אבל אז הניווט פשוט נעצר בלי הסבר. [המדריך ממליץ](https://angular.dev/guide/routing/route-guards) להחזיר `UrlTree` או `RedirectCommand` במקום לחסום ואז לנווט ידנית.

כשיש כמה guards במערך, הם מתחילים לפי הסדר אבל לא מחכים זה לזה. אם אחד מהם לא החזיר `true`, התוצאה של הראשון במערך שלא החזיר `true` מנצחת.

> ‏guard בצד הלקוח הוא לא אבטחה. מי שרוצה לעקוף אותו יכול, ולכן ההרשאה חייבת להיבדק גם בשרת.

## ‏RedirectCommand

‏`RedirectCommand` הוא `UrlTree` עם אפשרויות ניווט. ב-`adminGuard` האפשרות `skipLocationChange: true` מציגה את `Login` בלי לשנות את שורת הכתובת: משתמש רגיל שהגיע מ-`/account` ל-`/admin` רואה את `Login` וה-URL נשאר `/account`. אפשרויות נוספות הן אותן אפשרויות של `router.navigate`, כמו `replaceUrl`. [מגרסה 22.2](https://github.com/angular/angular/blob/main/CHANGELOG.md) אפשר גם לזרוק `RedirectCommand` מתוך guard או resolver.

## ‏canMatch

‏`canActivate` שמחזיר `false` עוצר את הניווט. ‏`canMatch` שמחזיר `false` אומר שה-route "לא מתאים", והראוטר ממשיך לחפש. כאן יש שני routes עם הנתיב `dashboard`: אדמין מקבל `AdminDashboard`, וכל השאר נופלים ל-`UserDashboard`. אותו URL, קומפוננטה שונה. ‏`canMatch` בא במקום `canLoad` הישן.

## ‏canDeactivate

‏`CanDeactivateFn<T>` מקבל את הקומפוננטה שעוזבים כארגומנט ראשון:

```typescript
import { Component, signal } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

@Component({
  selector: 'app-editor',
  template: `<textarea (input)="dirty.set(true)"></textarea>`,
})
export class Editor {
  readonly dirty = signal(false);
}

export const unsavedChanges: CanDeactivateFn<Editor> = (editor) =>
  !editor.dirty() || confirm('Discard unsaved changes?');
```

אחרי הקלדה, ניווט ל-`/login` מציג שאלה. אם המשתמש מסרב, הניווט נעצר וה-URL נשאר `/editor`.

## ‏resolver

[`ResolveFn<T>`](https://angular.dev/api/router/ResolveFn) מביא נתון לפני שה-route מופעל, ושמו הוא המפתח ב-`resolve`:

```typescript
import { Component, Service, inject, input } from '@angular/core';
import { ResolveFn } from '@angular/router';

@Service()
export class Users {
  async name(id: string) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return `User #${id}`;
  }
}

export const userName: ResolveFn<string> = (route) => inject(Users).name(route.paramMap.get('id')!);

@Component({ selector: 'app-profile', template: `<h1>{{ userName() }}</h1>` })
export class Profile {
  readonly userName = input.required<string>();
}
```

‏עם `withComponentInputBinding()` ([פרמטרים ב-URL](he/posts/angular-route-params/)) התוצאה מגיעה ל-`input.required` באותו שם, ו-`/users/42` מציג `User #42` מהרנדור הראשון, בלי מצב ביניים ריק. את המחיר צריך לדעת: הניווט חסום עד שה-resolver מסתיים, ושגיאה בו מכשילה את הניווט. לכן מביאים בו רק מה שהעמוד לא יכול בלעדיו. מידע שאפשר להציג בהדרגה עדיף לטעון בקומפוננטה.

### בגרסאות קודמות

guards נכתבו כמחלקות שמממשות interface:

```typescript
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Auth } from './guards';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private auth: Auth,
    private router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    return this.auth.user() !== null || this.router.createUrlTree(['/login']);
  }
}
```

ונרשמו ב-route כמחלקה עצמה: `canActivate: [AuthGuard]`. זה עדיין עובד, אבל מגרסה 15.2 ההעברה של מחלקות ו-`InjectionToken` כ-guards ו-resolvers [מסומנת כ-deprecated](https://github.com/angular/angular/blob/main/CHANGELOG.md), והכיוון הוא פונקציות. מחלקה קיימת אפשר להמשיך להשתמש בה בתוך פונקציה: `canActivate: [() => inject(AuthGuard).canActivate()]`. גם `canLoad` ו-`CanLoadFn` deprecated, וה-API מפנה ל-`canMatch`.

## טעויות נפוצות של מתחילים

- **להחזיר `false` ולנווט ידנית אחר כך.** מחזירים `UrlTree` או `RedirectCommand` ונותנים לראוטר לבצע את ההפניה.
- **להסתמך רק על guard להרשאות.** הוא מסתיר עמודים, לא נתונים. השרת חייב לבדוק בעצמו.

## מה הלאה

בפוסט הבא: תוספות לראוטר. כותרת העמוד, ‏view transitions, שחזור גלילה וגלילה לעוגנים.
