---
title: "HttpClient ב-Angular: ‏GET, ‏POST, טיפוסים ו-toSignal"
summary: "קריאות לשרת עם HttpClient ב-Angular 22: ‏provideHttpClient, ‏get ו-post עם טיפוס, params ו-headers, ‏toSignal מול subscribe, ובדיקה עם HttpTestingController בלי שרת אמיתי."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 38 }
---

‏`HttpClient` הוא השירות של Angular לקריאות HTTP. כל מתודה שלו מחזירה Observable, ואת כל הקוד שלו אפשר לבדוק בלי שרת.

כל דוגמה נבדקה עם Angular 22.2 ו-RxJS 7.8, בבדיקות Vitest עם `HttpTestingController` במקום שרת.

## הגדרה: provideHttpClient

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
```

לפי [מדריך ההגדרה](https://angular.dev/guide/http/setup), מגרסה 21 אפשר להזריק את `HttpClient` גם בלי השורה הזו. ‏`provideHttpClient` הוא המקום שבו מוסיפים לו יכולות, למשל interceptors, הנושא של הפוסט הבא.

הבקשות נשלחות עם `fetch` של הדפדפן. ‏`provideHttpClient(withXhr())` מחליף ל-`XMLHttpRequest`, וזה נחוץ רק כשרוצים [לדווח התקדמות של העלאת קובץ](https://angular.dev/api/common/http/withXhr).

## שירות עם בקשות טיפוסיות

```typescript
// user-api.ts
import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface User {
  id: number;
  name: string;
}

@Service()
export class UserApi {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<User[]>('/api/users');
  }

  search(q: string, page: number) {
    return this.http.get<User[]>('/api/users', {
      params: { q, page },
      headers: { 'X-Client': 'loom' },
    });
  }

  create(name: string) {
    return this.http.post<User>('/api/users', { name });
  }
}
```

- ‏`inject(HttpClient)` מביא את השירות ([inject](he/posts/angular-inject/)), ו-`@Service()` רושם את המחלקה ב-DI ([‏@Service](he/posts/angular-service-decorator/)).
- ‏`get<User[]>` אומר ל-TypeScript מה יחזור. ‏`post` שולח את הארגומנט השני כגוף JSON.
- ‏`params` נהפך ל-query string ו-`headers` לכותרות. הבקשה של `search('ada', 2)` יוצאת לכתובת:

```text
/api/users?q=ada&page=2
```

הטיפוס הוא הנחה, לא בדיקה. [התיעוד](https://angular.dev/guide/http/making-requests) אומר במפורש ש-`HttpClient` לא מוודא שהתשובה מתאימה לו: אם השרת מחזיר `[{ "id": "1", "title": "x" }]`, ‏`users[0].name` יהיה `undefined` בלי שום שגיאה. לבדיקה בזמן ריצה ראו [אימות נתונים בזמן ריצה](he/posts/typescript-runtime-validation/).

## בקומפוננטה: toSignal או subscribe

```typescript
// users.ts
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { User, UserApi } from './user-api';

@Component({
  selector: 'app-users',
  template: `
    <ul>
      @for (user of users(); track user.id) {
        <li>{{ user.name }}</li>
      }
    </ul>
    <button (click)="add()">Add Grace</button>
    <p>Added: {{ added()?.name }}</p>
  `,
})
export class Users {
  private readonly api = inject(UserApi);
  protected readonly users = toSignal(this.api.list(), { initialValue: [] });
  protected readonly added = signal<User | undefined>(undefined);

  protected add() {
    this.api.create('Grace').subscribe((user) => this.added.set(user));
  }
}
```

ה-Observable של `HttpClient` הוא "קר": שום בקשה לא יוצאת עד שמישהו עושה לו subscribe, וביטול ה-subscription מבטל בקשה שעוד לא חזרה.

- **קריאה להצגה:** ‏`toSignal` נרשם מיד, מחזיר signal שהתבנית קוראת, ומבטל את הרישום כשהקומפוננטה נהרסת. ‏`initialValue` הוא הערך עד שהתשובה מגיעה. הפוסט [RxJS ו-signals](he/posts/angular-rxjs-interop/) מרחיב.
- **פעולה בתגובה לאירוע:** ‏`subscribe` ידני מתאים ל-POST בלחיצה. בקשת HTTP מסתיימת אחרי תשובה אחת, ולכן אין כאן דליפה.

## בדיקה בלי שרת

```typescript
// users.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Users } from './users';

describe('Users', () => {
  it('loads the list, then posts a new user', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Users);

    http.expectOne('/api/users').flush([{ id: 1, name: 'Ada' }]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('li').textContent).toBe('Ada');

    fixture.nativeElement.querySelector('button').click();
    const req = http.expectOne({ method: 'POST', url: '/api/users' });
    expect(req.request.body).toEqual({ name: 'Grace' });
    req.flush({ id: 2, name: 'Grace' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('p').textContent).toBe('Added: Grace');
    http.verify();
  });
});
```

‏`provideHttpClientTesting()` מחליף את השליחה לרשת בבקר בדיקות, ולכן הוא בא אחרי `provideHttpClient()`. ‏`expectOne` מוודא שיצאה בדיוק בקשה אחת כזו, ‏`flush` עונה עליה, ו-`verify` נכשל אם נשארה בקשה בלי תשובה ([מדריך הבדיקות](https://angular.dev/guide/http/testing)).

### בגרסאות קודמות

```typescript
import { NgModule } from '@angular/core';
import { HttpClientModule, provideHttpClient, withFetch } from '@angular/common/http';

// Apps built on NgModules imported HttpClientModule
@NgModule({
  imports: [HttpClientModule],
})
export class AppModule {}

// Before Angular 22, provideHttpClient used XMLHttpRequest unless you added withFetch()
export const providers = [provideHttpClient(withFetch())];
```

‏`HttpClientModule` [מסומן כ-deprecated](https://angular.dev/api/common/http/HttpClientModule), ובמקומו משתמשים ב-`provideHttpClient()`. ‏`withFetch()` מסומן כ-deprecated מאז ש-`fetch` נהיה ברירת המחדל בגרסה 22. ‏`ng update` לגרסה 22 מוסיף `withXhr()` לכל קריאה ל-`provideHttpClient()` שאין בה `withFetch()` או `withXhr()`, כדי לשמור על ההתנהגות הישנה; ‏`withFetch()` קיים נשאר במקומו.

## טעויות נפוצות של מתחילים

- **לקרוא ל-`get` בלי subscribe** (או `toSignal`, או `async`) ולחכות לבקשה. היא לא תצא.
- **לסמוך על `get<T>`.** הטיפוס לא בודק כלום. נתונים שמגיעים מבחוץ צריך לאמת.
- **לשרשר query string ידנית** (`'/api/users?q=' + q`). ‏`params` מקודד את הערכים בשבילכם.

## מה הלאה

בפוסט הבא: interceptors, פונקציות שעוטפות כל בקשה, למשל כדי להוסיף כותרת הרשאה או לרשום לוג.
