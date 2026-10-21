---
title: "טעינה עצלה ב-Angular: ‏loadComponent ו-loadChildren"
summary: "איך מפצלים אפליקציית Angular לפי routes: ‏loadComponent לקומפוננטה אחת, ‏loadChildren לקובץ routes שלם, מה רואים בפלט של ng build, וטעינה מראש עם withPreloading."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 35 }
---

כש-route מפנה ל-`component`, הקומפוננטה נכנסת לחבילה הראשונה שהדפדפן מוריד, גם אם המשתמש אף פעם לא יגיע לעמוד שלה. [טעינה עצלה](https://angular.dev/guide/routing/loading-strategies) מוציאה עמודים לקבצים נפרדים שנטענים רק בניווט אליהם.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest, והפלט של `ng build` הוא מהרצה אמיתית.

## ‏loadComponent

קומפוננטה עם `export default`:

```typescript
import { Component } from '@angular/core';

@Component({ selector: 'app-admin', template: `<h1>Admin</h1>` })
export default class Admin {}
```

ב-route מחליפים את `component` ב-`loadComponent`, פונקציה שמחזירה `import()` דינמי:

```typescript
import { Routes } from '@angular/router';
import { Home } from './home';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'admin', loadComponent: () => import('./admin/admin') },
  { path: 'shop', loadChildren: () => import('./shop/shop.routes').then((m) => m.SHOP_ROUTES) },
];
```

הראוטר מזהה את ה-`default` ומשתמש בו. עם export רגיל כותבים `import('./admin/admin').then((m) => m.Admin)`. הקובץ נטען בניווט הראשון ל-`/admin`, ובניווטים הבאים הוא כבר בזיכרון.

## ‏loadChildren

‏`shop` בקובץ ה-routes למעלה טוען קבוצה שלמה של routes. קובץ ה-routes של החנות מגדיר נתיבים יחסיים ל-`shop`:

```typescript
import { Routes } from '@angular/router';
import { ProductList } from './product-list';
import { ProductDetails } from './product-details';

export const SHOP_ROUTES: Routes = [
  { path: '', component: ProductList },
  { path: ':id', component: ProductDetails },
];
```

‏`/shop` מציג את `ProductList` ו-`/shop/41` את `ProductDetails`. כל מה שהקובץ הזה מייבא, כולל שתי הקומפוננטות, יוצא יחד לקובץ נפרד. כך מפצלים אפליקציה לפי אזורים: לכל אזור קובץ routes משלו, וקובץ ה-routes הראשי מכיר רק את נקודת הכניסה.

## מה רואים ב-build

‏`ng build` מפריד בין קבצים שנטענים בהתחלה לקבצים עצלים:

```text
Initial chunk files | Names         |  Raw size | Estimated transfer size
chunk-FDWX6F6V.js   | -             | 103.92 kB |                31.27 kB
main-A34LOHPF.js    | main          |  90.59 kB |                23.01 kB
styles-5INURTSO.css | styles        |   0 bytes |                 0 bytes

                    | Initial total | 194.51 kB |                54.27 kB

Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-BH4NR5GD.js   | shop-routes   | 679 bytes |               679 bytes
chunk-QCPCTACV.js   | admin         | 293 bytes |               293 bytes
```

הקומפוננטות כאן זעירות, אז החיסכון קטן. באפליקציה אמיתית אזור ניהול עם טבלאות וגרפים יכול להיות מאות KB, וכל משתמש שלא נכנס אליו לא מוריד אותם. השם בעמודה `Names` מגיע משם הקובץ המיובא.

## לטעון מראש: ‏withPreloading

החיסרון: הניווט הראשון לעמוד עצל מחכה להורדה. ‏[`withPreloading(PreloadAllModules)`](https://angular.dev/api/router/withPreloading) מוריד את כל הקבצים העצלים ברקע אחרי שהאפליקציה עלתה: ‏`provideRouter(routes, withPreloading(PreloadAllModules))`. החבילה הראשונה נשארת קטנה, והניווט מרגיש מיידי. אפשר גם לכתוב אסטרטגיה משלכם שבוחרת אילו routes לטעון מראש.

### בגרסאות קודמות

לפני routes של קומפוננטות standalone, ‏`loadChildren` טען NgModule שרשם את ה-routes עם `RouterModule.forChild`:

```typescript
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SHOP_ROUTES } from './shop.routes';

@NgModule({
  imports: [RouterModule.forChild(SHOP_ROUTES)],
})
export class ShopModule {}
```

וה-route היה `loadChildren: () => import('./shop/shop.module').then((m) => m.ShopModule)`. זה עדיין עובד. בקוד ישן עוד יותר מופיעה מחרוזת: `loadChildren: './shop/shop.module#ShopModule'`. הכתיב הזה [סומן כ-deprecated בגרסה 8](https://github.com/angular/angular/blob/cf420194ed91076afb66d9179245b9dbaabc4fd4/aio/content/guide/deprecations.md), והטיפוס של `loadChildren` בגרסה 22 כבר לא מקבל מחרוזת.

## טעויות נפוצות של מתחילים

- **לייבא את הקומפוננטה העצלה גם בצורה רגילה.** ‏`import` רגיל של `Admin` בקובץ אחר שמשתמש בה מעביר את הקוד שלה לחבילה הראשונה, והקובץ העצל נשאר כמעט ריק. בודקים בפלט של `ng build`.
- **לכתוב `path: 'shop/...'` בתוך `SHOP_ROUTES`.** הנתיבים שם יחסיים ל-`shop`, ו-`shop` נוסף פעמיים.

## מה הלאה

בפוסט הבא: ‏guards ו-resolvers. מי מורשה להיכנס ל-route, ואיך טוענים נתונים לפני שהעמוד מוצג.
