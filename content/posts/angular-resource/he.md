---
title: "resource ו-rxResource ב-Angular: טעינת נתונים אסינכרונית עם signals"
summary: "‏resource() ו-rxResource() ב-Angular 22: ‏params ו-loader, ‏status, ‏value, ‏hasValue ו-error, ביטול עם abortSignal, ‏reload, ושרשור resources עם chain."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 41 }
---

בפוסט הקודם ניהלנו טעינה ושגיאה בשלושה signals ידניים. ‏[`resource()`](https://angular.dev/guide/signals/resource) עושה את זה בשבילכם: מקבל signals שקובעים מה לטעון ופונקציה אסינכרונית שטוענת, ומחזיר את התוצאה, הסטטוס והשגיאה כ-signals. ‏`resource` ו-`rxResource` יציבים מגרסה 22.

כל דוגמה נבדקה עם Angular 22.2 ו-RxJS 7.8, בבדיקות Vitest עם `fetch` מדומה ו-`HttpTestingController`.

## ‏params ו-loader

```typescript
// user-card.ts
import { Component, resource, signal } from '@angular/core';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-user-card',
  template: `
    <button (click)="id.set(id() + 1)">Next user</button>
    <button (click)="user.reload()">Reload</button>
    @if (user.hasValue()) {
      <p>{{ user.value().name }}</p>
    } @else if (user.error()) {
      <p role="alert">{{ user.error()?.message }}</p>
    }
    <small>{{ user.status() }}</small>
  `,
})
export class UserCard {
  protected readonly id = signal(1);
  protected readonly user = resource({
    params: () => ({ id: this.id() }),
    loader: async ({ params, abortSignal }) => {
      const res = await fetch(`/api/users/${params.id}`, { signal: abortSignal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as User;
    },
  });
}
```

- ‏`params` עובד כמו [computed](he/posts/angular-signals/): קורא signals ומחזיר ערך. בכל פעם שהערך משתנה, ‏`loader` רץ שוב.
- ‏`loader` מקבל את `params`, ‏`abortSignal` ו-`previous` (הסטטוס הקודם), ומחזיר Promise.
- אם `params` מחזיר `undefined`, ה-loader לא רץ והסטטוס הוא `idle`. כך מחכים לערך שעוד אין, למשל שדה חיפוש ריק.

## ‏status, ‏value ו-hasValue

| ‏`status()` | מתי | ‏`value()` |
|---|---|---|
| `idle` | ‏`params` החזיר `undefined` | `undefined` |
| `loading` | ‏`params` השתנה וה-loader רץ | `undefined` |
| `reloading` | קראו ל-`reload()` | הערך הקודם |
| `resolved` | ה-loader הצליח | התוצאה |
| `error` | ה-loader זרק | זורק שגיאה |
| `local` | הערך נקבע עם `set()` או `update()` | הערך שנקבע |

‏`isLoading()` הוא `true` ב-`loading` וב-`reloading`, ו-`error()` מחזיר את השגיאה האחרונה. בבדיקה, קריאה ל-`value()` במצב `error` אכן זרקה. לכן התבנית שואלת קודם `hasValue()`: הוא `false` בשגיאה, ובתוך ה-`@if` הוא מצמצם את הטיפוס כך ש-`value()` כבר לא כולל `undefined`.

## ביטול ו-reload

כש-`id` משתנה בזמן שהטעינה הקודמת עוד רצה, ‏resource מבטל אותה דרך `abortSignal`. בבדיקה, שתי לחיצות מהירות על "Next user" השאירו את ה-`abortSignal` של הבקשה הראשונה עם `aborted: true`. מעבירים אותו ל-`fetch`, וכך התשובה הישנה לא דורסת את החדשה.

‏`user.reload()` מריץ את ה-loader שוב עם אותם `params`, ובזמן הזה `value()` נשאר הערך הקודם (`reloading`), כך שהמסך לא מהבהב. ‏`user.set(...)` מחליף את הערך מקומית ומעביר את הסטטוס ל-`local`.

## ‏rxResource ו-HttpClient

```typescript
// user-card-rx.ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-user-card-rx',
  template: `<p>{{ user.value()?.name ?? '…' }}</p>`,
})
export class UserCardRx {
  private readonly http = inject(HttpClient);
  readonly id = signal(1);
  protected readonly user = rxResource({
    params: () => ({ id: this.id() }),
    stream: ({ params }) => this.http.get<User>(`/api/users/${params.id}`),
  });
}
```

‏`rxResource` זהה, אבל במקום `loader` שמחזיר Promise יש `stream` שמחזיר Observable, וזה מתאים ל-[HttpClient](he/posts/angular-http-client/). כשה-`id` משתנה, ‏rxResource מבטל את ה-subscription הקודם, ו-`HttpTestingController` מראה שהבקשה הקודמת בוטלה (`cancelled: true`). לבקשת GET פשוטה יש קיצור, ‏`httpResource`, בפוסט הבא.

## שרשור עם chain

```typescript
// team-name.ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';

interface User { id: number; teamId: number; }
interface Team { name: string; }

@Component({
  selector: 'app-team',
  template: `<p>{{ team.status() }} {{ team.value()?.name }}</p>`,
})
export class TeamName {
  private readonly http = inject(HttpClient);
  readonly userId = signal(1);
  readonly user = rxResource({
    params: () => this.userId(),
    stream: ({ params }) => this.http.get<User>(`/api/users/${params}`),
  });
  readonly team = rxResource({
    params: ({ chain }) => chain(this.user)?.teamId,
    stream: ({ params }) => this.http.get<Team>(`/api/teams/${params}`),
  });
}
```

‏`chain(this.user)` מחזיר את הערך של `user` רק כשהוא `resolved` או `local`. בכל מצב אחר הוא מעביר את הסטטוס הלאה: כל עוד `user` נטען, ‏`team` נמצא ב-`loading` ולא שולח בקשה, ושגיאה ב-`user` נהפכת לשגיאה ב-`team`. ‏`?.` נדרש כי הטיפוס של `user` כולל `undefined`. ‏[המדריך](https://angular.dev/guide/signals/resource) ממליץ על `chain` רק כשה-resource השני עושה טעינה משלו שתלויה בראשון; לחישוב סינכרוני מספיק `computed`.

### בגרסאות קודמות

‏`resource` הופיע בגרסה 19 ו[סומן כ-experimental](https://v21.angular.dev/api/core/resource) עד גרסה 21, ושמות האפשרויות השתנו בדרך. ב-[גרסה 19](https://v19.angular.dev/guide/signals/resource) האפשרות נקראה `request` וה-loader קיבל `({ request })`, ול-`rxResource` הייתה אפשרות `loader` שמחזירה Observable. בגרסה 20 ‏`request` נהיה `params` ו-`loader` של `rxResource` נהיה `stream`. במדריך ישן עם `request:` מדובר באותו רעיון בשמות הקודמים.

## טעויות נפוצות של מתחילים

- **לקרוא `value()` בלי לבדוק.** במצב `error` הוא זורק; בודקים `hasValue()` לפני.
- **להשתמש ב-resource לשמירה (POST, ‏PUT).** ‏[ה-API](https://angular.dev/api/core/resource) מזהיר ש-resource מבטל טעינה כשה-params משתנים, וזה עלול לקטוע פעולה שמשנה נתונים. לשמירה קוראים ל-`HttpClient` ישירות.
- **לשכוח את `abortSignal`.** בלעדיו ה-`fetch` הישן ממשיך לרוץ ברקע גם אחרי שבוטל.

## מה הלאה

בפוסט הבא: ‏`httpResource()`, ‏resource שבנוי על `HttpClient`, עם כתובת ריאקטיבית ואימות התשובה עם `parse`.
