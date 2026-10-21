---
title: "פרמטרים ב-URL ב-Angular: ‏:id, ‏query params ו-withComponentInputBinding"
summary: "‏path params ו-query params בראוטר של Angular, קבלה שלהם כ-input() עם withComponentInputBinding, ‏ActivatedRoute עם toSignal, וברירת המחדל החדשה של paramsInheritanceStrategy בגרסה 22."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 34 }
---

עמוד משתמש אחד מציג כל משתמש לפי ה-URL: ‏`/users/42`, ‏`/users/7`. החלק המשתנה הוא פרמטר, ו-Angular יכול להעביר אותו ישר ל-`input()` של הקומפוננטה.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ‏:id ו-withComponentInputBinding

נקודתיים ב-`path` מגדירות פרמטר. ‏[`withComponentInputBinding()`](https://angular.dev/api/router/withComponentInputBinding) אומר לראוטר להעביר פרמטרים ל-inputs באותו שם:

```typescript
import { ApplicationConfig } from '@angular/core';
import { Routes, provideRouter, withComponentInputBinding } from '@angular/router';
import { User, UserPosts } from './user';

const routes: Routes = [
  { path: 'users/:id', component: User, children: [{ path: 'posts', component: UserPosts }] },
];

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withComponentInputBinding())],
};
```

```typescript
import { Component, input } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-user',
  imports: [RouterLink, RouterOutlet],
  template: `
    <h1>User {{ id() }}</h1>
    <p>Tab: {{ tab() ?? 'overview' }}</p>
    <a [routerLink]="['/users', 7]" [queryParams]="{ tab: 'posts' }">User 7, posts</a>
    <router-outlet />
  `,
})
export class User {
  readonly id = input<string>();
  readonly tab = input<string>();
}

@Component({ selector: 'app-user-posts', template: `<p>Posts of user {{ id() }}</p>` })
export class UserPosts {
  readonly id = input<string>();
}
```

ב-`/users/42` מוצג `User 42` ו-`Tab: overview`. פרמטרים מגיעים תמיד כמחרוזות, גם כשנראים כמו מספר, ולכן `input<string>()`. אם צריך מספר, ממירים עם `transform: numberAttribute` (על transforms ב-[פוסט ה-inputs](he/posts/angular-inputs/)).

## ‏query params

הכל אחרי `?` ב-URL. ‏`[routerLink]` מקבל מערך של קטעי נתיב, ו-`[queryParams]` מוסיף query params. הקישור למעלה מייצר `href="/users/7?tab=posts"`, ולחיצה עליו מציגה `User 7` ו-`Tab: posts`.

‏`withComponentInputBinding` מעביר ל-inputs גם query params, ‏`data` סטטי של ה-route ונתונים מ-resolvers. כשאין ערך בשם של input, הוא מקבל `undefined`. כך `tab` לא נשאר עם ערך ישן כשה-query param נעלם מה-URL, וזו הסיבה ל-`??` בתבנית.

## ‏ActivatedRoute ו-toSignal

הדרך השנייה היא [`ActivatedRoute`](https://angular.dev/guide/routing/read-route-state), שמחזיק את מצב ה-route כ-Observables. ‏[`toSignal`](he/posts/angular-rxjs-interop/) הופך אותו ל-signal:

```typescript
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({ selector: 'app-user-card', template: `<p>Card {{ id() }}</p>` })
export class UserCard {
  private readonly route = inject(ActivatedRoute);
  protected readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))));
}
```

ניווט מ-`/u/5` ל-`/u/6` משנה את הטקסט מ-`Card 5` ל-`Card 6`. הראוטר משתמש מחדש באותו מופע של הקומפוננטה כשרק הפרמטר משתנה, ולכן צריך מקור שמתעדכן ולא קריאה חד-פעמית. משתמשים ב-`ActivatedRoute` כשצריך את ה-route עצמו, למשל בשירות או כשהקומפוננטה לא מוצגת ישירות על ידי הראוטר.

## ‏route ילד מקבל את הפרמטרים של ההורה

‏`UserPosts` הוא ילד של `users/:id`, ובכל זאת `/users/42/posts` מציג `Posts of user 42`. זו [`paramsInheritanceStrategy`](https://angular.dev/guide/routing/customizing-route-behavior#control-parameter-inheritance): מגרסה 22 ברירת המחדל היא `'always'`, ו-route יורש את הפרמטרים, ה-`data` והנתונים מ-resolvers של כל ההורים שלו.

עד גרסה 22 ברירת המחדל הייתה `'emptyOnly'`: ילד ירש רק כשהנתיב שלו ריק או כשלהורה אין קומפוננטה. עם `withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' })` אותו URL מציג `Posts of user` בלי מספר. אפליקציה שמשודרגת לגרסה 22 עלולה לראות פתאום ערכים ב-inputs שהיו `undefined`.

### בגרסאות קודמות

בלי `withComponentInputBinding` ‏(נוסף בגרסה 16), נרשמים ל-`paramMap` ב-`ngOnInit`:

```typescript
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({ selector: 'app-old-user', template: `<h1>User {{ id }}</h1>` })
export class OldUser implements OnInit {
  id: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => (this.id = params.get('id')));
  }
}
```

ב-Angular 22 הקוד הזה מציג את ה-id הראשון, אבל ניווט מ-`/u/5` ל-`/u/6` משאיר `User 5`: הקומפוננטה היא OnPush כברירת מחדל, ושינוי של שדה רגיל מתוך subscription לא מסמן אותה לבדיקה ([OnPush כברירת מחדל](he/posts/angular-onpush-default-v22/)). גרסה נפוצה עוד יותר, `route.snapshot.paramMap.get('id')`, קוראת את הערך פעם אחת ולא מתעדכנת אף פעם.

## טעויות נפוצות של מתחילים

- **להתייחס לפרמטר כמספר.** הערך הוא `'42'` ולא `42`. ממירים במפורש, או עם `numberAttribute`.
- **לשכוח את `withComponentInputBinding()`.** בלי השורה הזו ה-inputs נשארים `undefined`, בלי שגיאה.

## מה הלאה

בפוסט הבא: טעינה עצלה של routes עם `loadComponent` ו-`loadChildren`, ואיך היא נראית בפלט של `ng build`.
