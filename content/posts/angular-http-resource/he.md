---
title: "httpResource ב-Angular: בקשת GET ריאקטיבית עם אימות"
summary: "‏httpResource() ב-Angular 22: כתובת שנבנית מ-signals, בקשה עם params, ‏defaultValue, אימות התשובה עם parse, והשוואה ל-HttpClient עם toSignal ו-switchMap."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 42 }
---

‏[`httpResource()`](https://angular.dev/guide/http/http-resource) הוא [resource](he/posts/angular-resource/) שבנוי על `HttpClient`: מקבלים פונקציה שמחזירה כתובת, וכל פעם שה-signals שבה משתנים יוצאת בקשה חדשה. כי הוא עובר דרך `HttpClient`, ה-[interceptors](he/posts/angular-interceptors/) והבדיקות עם `HttpTestingController` עובדים כרגיל. הוא יציב מגרסה 22.

כל דוגמה נבדקה עם Angular 22.2, בבדיקות Vitest עם `HttpTestingController`.

## חיפוש: כתובת מ-signal

```typescript
// user-search.ts
import { Component, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-user-search',
  template: `
    <input #box (input)="query.set(box.value)" aria-label="Search users" />
    @if (users.isLoading()) {
      <p>Searching…</p>
    }
    <ul>
      @for (user of users.value(); track user.id) {
        <li>{{ user.name }}</li>
      }
    </ul>
  `,
})
export class UserSearch {
  readonly query = signal('');
  protected readonly users = httpResource<User[]>(
    () => (this.query() ? { url: '/api/users', params: { q: this.query() } } : undefined),
    { defaultValue: [] },
  );
}
```

- הפונקציה יכולה להחזיר מחרוזת (`` `/api/users/${id}` ``) או אובייקט בקשה עם `url`, ‏`params`, ‏`headers` ועוד. כאן היא מחזירה `{ url, params }`, והבקשה יוצאת ל-`/api/users?q=ad`.
- כשהשדה ריק הפונקציה מחזירה `undefined`: אין בקשה, והסטטוס `idle`.
- ‏`defaultValue: []` הוא הערך בזמן `idle` ו-`loading`, ולכן `value()` הוא תמיד מערך ואין צורך לבדוק `undefined` ב-`@for`.
- כל הקשה משנה את `query` ושולחת בקשה, והבקשה הקודמת מבוטלת (בבדיקה: ‏`cancelled: true`). להמתנה עד שמפסיקים להקליד צריך `debounceTime`, בפוסט על RxJS.

## אימות התשובה עם parse

```typescript
// user-detail.ts
import { Component, input } from '@angular/core';
import { httpResource } from '@angular/common/http';

interface User {
  id: number;
  name: string;
}

function parseUser(raw: unknown): User {
  const u = raw as Partial<User>;
  if (typeof u?.id !== 'number' || typeof u.name !== 'string') {
    throw new Error('Invalid user from server');
  }
  return { id: u.id, name: u.name };
}

@Component({
  selector: 'app-user-detail',
  template: `
    @if (user.hasValue()) {
      <h2>{{ user.value().name }}</h2>
    } @else if (user.error(); as err) {
      <p role="alert">{{ err.message }}</p>
    }
  `,
})
export class UserDetail {
  readonly id = input.required<number>();
  protected readonly user = httpResource(() => `/api/users/${this.id()}`, { parse: parseUser });
}
```

‏`get<T>` של `HttpClient` רק מניח את הטיפוס. ‏`parse` מקבל את ה-JSON כ-`unknown` ומחזיר ערך מהטיפוס הנכון, וממנו נקבע הטיפוס של `value()`. אם הוא זורק, ה-resource עובר ל-`error`: בבדיקה, תשובה `{ "id": "7", "title": "x" }` הציגה `Invalid user from server`. ‏[לפי המדריך](https://angular.dev/guide/http/http-resource) אפשר להעביר גם `schema.parse` של zod (ראו [אימות נתונים בזמן ריצה](he/posts/typescript-runtime-validation/)). ה-`id` מגיע מ-[input](he/posts/angular-inputs/), וכשהוא משתנה יוצאת בקשה חדשה.

לתשובות שאינן JSON יש גרסאות נפרדות: ‏`httpResource.text()`, ‏`.blob()` ו-`.arrayBuffer()`. מעבר ל-signals של כל resource, יש ל-`httpResource` גם `headers()` ו-`statusCode()` של התשובה.

## השוואה: HttpClient עם toSignal

```typescript
// user-search-rx.ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-user-search-rx',
  template: `@for (user of users(); track user.id) { <li>{{ user.name }}</li> }`,
})
export class UserSearchRx {
  private readonly http = inject(HttpClient);
  readonly query = signal('');
  protected readonly users = toSignal(
    toObservable(this.query).pipe(
      switchMap((q) => (q ? this.http.get<User[]>('/api/users', { params: { q } }) : of([]))),
    ),
    { initialValue: [] },
  );
}
```

אותו חיפוש בלי `httpResource`: הופכים את ה-signal ל-Observable, ‏`switchMap` מבטל את הבקשה הקודמת, ו-`toSignal` מחזיר signal. התוצאה זהה, אבל אין `isLoading()` ואין `error()`, ושגיאה תיזרק מה-signal בקריאה הבאה. היתרון של הגרסה הזו הוא שאפשר להכניס לשרשרת כל אופרטור של RxJS, למשל `debounceTime`.

## טעויות נפוצות של מתחילים

- **לשלוח POST או PUT עם httpResource.** ‏[המדריך](https://angular.dev/guide/http/http-resource) אומר להימנע מזה; לשמירה משתמשים ב-`HttpClient`.
- **לבנות query string בתוך הכתובת.** ‏`params` באובייקט הבקשה מקודד את הערכים.
- **להחזיר `''` במקום `undefined`.** רק `undefined` עוצר את הבקשה.

## מה הלאה

בפוסט הבא: ה-RxJS שצריך ב-Angular: ‏Observable, ‏`pipe`, ‏`map`, ‏`switchMap`, ‏`debounceTime` ו-Subject.
