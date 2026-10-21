---
title: "PWA ב-Angular: ‏service worker, ‏ngsw-config.json ו-SwUpdate"
summary: "איך הופכים אפליקציית Angular ל-PWA: מה ng add @angular/pwa משנה, אסטרטגיות cache ב-ngsw-config.json, הודעה על גרסה חדשה עם SwUpdate, ובדיקה בלי רשת על build של production."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 69 }
---

PWA ‏(Progressive Web App) היא אפליקציית ווב שאפשר להתקין ושממשיכה לעבוד בלי רשת. את העבודה בלי רשת עושה service worker, סקריפט שהדפדפן מריץ בין האפליקציה לרשת. ה-service worker של Angular שומר את קובצי האפליקציה ב-cache לפי קובץ הגדרות, ומגיש אותם משם.

כל דוגמה נבדקה עם Angular 22.2.

## ‏ng add @angular/pwa

```text
CREATE ngsw-config.json (639 bytes)
CREATE public/manifest.webmanifest (1229 bytes)
CREATE public/icons/icon-128x128.png (2875 bytes)
CREATE public/icons/icon-512x512.png (16332 bytes)
UPDATE angular.json (1969 bytes)
UPDATE package.json (829 bytes)
UPDATE src/app/app.config.ts (538 bytes)
UPDATE src/index.html (432 bytes)
```

(מתוך שמונה האייקונים השארנו שניים.) הפקודה מתקינה את `@angular/service-worker`, מוסיפה ל-configuration ‏`production` את `"serviceWorker": "ngsw-config.json"`, מקשרת את ה-manifest ב-`index.html`, ורושמת את ה-worker ב-`app.config.ts`:

```typescript
provideServiceWorker('ngsw-worker.js', {
  enabled: !isDevMode(),
  registrationStrategy: 'registerWhenStable:30000',
}),
```

`enabled: !isDevMode()` אומר שב-`ng serve` הרגיל אין service worker. ‏`registerWhenStable:30000` רושם אותו כשאין יותר משימות אסינכרוניות פתוחות, ולא יאוחר מ-30 שניות.

## ‏ngsw-config.json

```json
{
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.csr.html", "/index.html", "/manifest.webmanifest", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": ["/**/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)"]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api",
      "urls": ["/api/**"],
      "cacheConfig": { "strategy": "freshness", "maxSize": 50, "maxAge": "1d", "timeout": "3s" }
    }
  ]
}
```

ה-`assetGroups` הם ש-`ng add` יצר, ואת `dataGroups` הוספנו. לפי [תיעוד ההגדרות](https://angular.dev/ecosystem/service-workers/config):

- `installMode: "prefetch"` מוריד מראש את כל הקבצים ברשימה, ולכן האפליקציה עובדת בלי רשת כבר מהביקור הראשון. ‏`lazy` שומר קובץ רק כשמבקשים אותו.
- `dataGroups` מיועדים לבקשות API. ‏`freshness` פונה קודם לרשת, ונופל ל-cache רק אחרי ה-`timeout`. ‏`performance`, ברירת המחדל, עונה מה-cache בלי לפנות לרשת, והתשובה עלולה להיות ישנה עד `maxAge`.

ב-build הקובץ הזה הופך ל-`ngsw.json`, עם hash לכל קובץ. כך ה-worker יודע אם יצאה גרסה חדשה.

## גרסה חדשה עם SwUpdate

כשיוצאת גרסה חדשה, ה-worker מוריד אותה ברקע, אבל הלשונית הפתוחה ממשיכה עם הישנה. ‏[`SwUpdate`](https://angular.dev/ecosystem/service-workers/communications) מודיע כשהגרסה החדשה מוכנה:

```typescript
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs';

@Component({
  selector: 'app-update-banner',
  template: `
    @if (ready()) {
      <p>A new version is available.</p>
      <button (click)="reload()">Reload</button>
    }
  `,
})
export class UpdateBanner {
  private readonly updates = inject(SwUpdate);

  protected readonly ready = toSignal(
    this.updates.versionUpdates.pipe(
      filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'),
      map(() => true),
    ),
    { initialValue: false },
  );

  protected reload() {
    document.location.reload();
  }
}
```

`versionUpdates` פולט כמה סוגי אירועים, ו-`VERSION_READY` הוא הרגע שבו אפשר לטעון מחדש. ‏`toSignal` מ-[RxJS interop](he/posts/angular-rxjs-interop/) הופך את ה-Observable ל-signal. טסט עם `SwUpdate` מדומה וידא שההודעה מופיעה רק אחרי `VERSION_READY`, ולא אחרי `VERSION_DETECTED`. יש גם `activateUpdate()`, שמעביר את הלשונית לגרסה החדשה בלי טעינה מחדש, אבל התיעוד מזהיר שזה עלול לשבור את האפליקציה, כי קבצים שנטענים בהמשך כבר שייכים לגרסה אחרת.

## בדיקה בלי רשת

ה-worker לא רץ ב-`ng serve` הרגיל, ולכן בודקים על build של production ([התיעוד](https://angular.dev/ecosystem/service-workers/getting-started)):

```bash
ng build
npx http-server -p 8080 -c-1 dist/<project-name>/browser
```

ב-build מופיעים שלושה קבצים חדשים ליד האפליקציה:

```text
dist/ng-template/browser/ngsw-worker.js
dist/ng-template/browser/ngsw.json
dist/ng-template/browser/safety-worker.js
```

פותחים את `http://localhost:8080`, ב-DevTools בוחרים ב-Network את **Offline**, וטוענים מחדש. האפליקציה עולה, ו-Network מראה שהבקשות הגיעו מה-ServiceWorker. דפדפנים רושמים service worker רק ב-HTTPS, או ב-localhost לפיתוח ([התיעוד](https://angular.dev/ecosystem/service-workers)).

### בגרסאות קודמות

באפליקציות עם NgModule רושמים את ה-worker דרך `ServiceWorkerModule`, וקוד ישן מאזין ל-`updates.available`, שכבר לא קיים ב-`SwUpdate` של Angular 22:

```typescript
@NgModule({
  imports: [
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
})
export class AppModule {}
```

## טעויות נפוצות של מתחילים

- **לבדוק עם `ng serve` ולחשוב שה-worker לא עובד.** ‏`enabled: !isDevMode()` מכבה אותו ב-development.
- **לשים API שמשתנה ב-`performance`.** המשתמש יקבל תשובה מה-cache עד `maxAge`. לנתונים שחייבים להיות עדכניים משתמשים ב-`freshness`.
- **`activateUpdate()` בלי טעינה מחדש.** קבצים חדשים נטענים לצד קוד ישן. בטוח יותר לטעון מחדש.

## מה הלאה

בפוסט הבא: חישובים כבדים ב-Web Worker, כדי שהממשק לא ייתקע.
