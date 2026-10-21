---
title: "dependency injection ב-Angular: ‏inject() ו-injection context"
summary: "מה זה dependency injection, איך קומפוננטות מקבלות שירות עם inject(), איפה מותר לקרוא ל-inject, ואיך runInInjectionContext פותר את השגיאה NG0203."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 28 }
---

קומפוננטה לא אמורה ליצור בעצמה את מה שהיא צריכה. היא מבקשת, ו-Angular נותן לה מופע מוכן. השיטה הזו נקראת [dependency injection](https://angular.dev/guide/di) ‏(DI), והיא הדרך הרגילה לשתף נתונים ולוגיקה בין קומפוננטות.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## שירות ראשון

שירות הוא מחלקה רגילה שמחזיקה מצב או לוגיקה. הנה עגלת קניות:

```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Cart {
  readonly items = signal<string[]>([]);

  add(item: string) {
    this.items.update((items) => [...items, item]);
  }
}
```

‏`@Injectable({ providedIn: 'root' })` אומר ל-Angular שהמחלקה זמינה להזרקה בכל האפליקציה, ושיש ממנה מופע אחד בלבד. ב-Angular 22 יש לזה כתיב קצר יותר, `@Service()`, והוא הנושא של הפוסט הבא. ‏`items` הוא [signal](he/posts/angular-signals/), ולכן כל תבנית שקוראת אותו מתעדכנת כשהעגלה משתנה.

## ‏inject() בקומפוננטה

שתי קומפוננטות שלא מכירות זו את זו מבקשות את אותה עגלה:

```typescript
import { Component, inject } from '@angular/core';
import { Cart } from './cart';

@Component({
  selector: 'app-product',
  template: `<button (click)="cart.add('Book')">Add a book</button>`,
})
export class Product {
  protected readonly cart = inject(Cart);
}

@Component({
  selector: 'app-cart-badge',
  template: `<p>Items in cart: {{ cart.items().length }}</p>`,
})
export class CartBadge {
  protected readonly cart = inject(Cart);
}

@Component({
  selector: 'app-shop',
  imports: [Product, CartBadge],
  template: `<app-product /><app-cart-badge />`,
})
export class Shop {}
```

‏[`inject(Cart)`](https://angular.dev/api/core/inject) מחזיר את המופע ש-Angular יצר, ושתי הקומפוננטות מקבלות את אותו אובייקט. לחיצה על הכפתור ב-`Product` משנה את `Items in cart: 0` ל-`Items in cart: 1` ב-`CartBadge`, בלי input, ‏output או הורה משותף שמעביר נתונים. ‏`Cart` משמש כאן כ-token: המפתח ש-Angular מחפש. כש-Angular יוצר את `Product`, הוא מוצא את המופע של `Cart` ומעביר אותו.

## איפה מותר לקרוא ל-inject

‏`inject` עובד רק ב-[injection context](https://angular.dev/guide/di/dependency-injection-context), כלומר בזמן ש-Angular יוצר משהו:

- ה-constructor של מחלקה ש-Angular יוצר (קומפוננטה, דירקטיבה, שירות) ואתחול השדות שלה;
- פונקציית `factory` של `InjectionToken` או של provider;
- פונקציות ש-Angular מריץ בתוך context, כמו guard של הראוטר.

קריאה מתוך מתודה שרצה בלחיצה כבר לא נמצאת ב-context:

```typescript
import { Component, inject, Injector, runInInjectionContext } from '@angular/core';
import { Cart } from './cart';

@Component({ selector: 'app-checkout', template: `` })
export class Checkout {
  private readonly injector = inject(Injector);

  broken() {
    return inject(Cart); // runs on click, not while Angular creates the class
  }

  works() {
    return runInInjectionContext(this.injector, () => inject(Cart));
  }
}
```

‏`broken()` זורקת (השגיאה מהרצת הבדיקה, ושם המחלקה כולל `_` שהוסיף ה-bundler):

```text
NG0203: The `_Cart` token injection failed. `inject()` function must be called from an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`. Find more at https://v22.angular.dev/errors/NG0203
```

‏`works()` מקבלת את ה-`Injector` בזמן היצירה, ואחר כך [`runInInjectionContext`](https://angular.dev/api/core/runInInjectionContext) מריץ את הפונקציה בתוך ה-context שלו, כך ש-`inject` מצליח ומחזיר את אותה עגלה. בדרך כלל הפתרון הפשוט יותר הוא להזריק בשדה, כמו `Product`, ולהשתמש בשדה במתודה. ‏`inject` עובד רק בקריאה סינכרונית: אחרי `await` ה-context כבר לא קיים.

### בגרסאות קודמות

לפני `inject()`, תלויות הגיעו כפרמטרים של ה-constructor:

```typescript
import { Component, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OldCart {
  items: string[] = [];
}

@Component({
  selector: 'app-old-badge',
  template: `<p>Items in cart: {{ cart.items.length }}</p>`,
})
export class OldCartBadge {
  constructor(protected cart: OldCart) {}
}
```

‏`protected cart` ב-constructor הוא [parameter property](he/posts/typescript-classes/) של TypeScript: הוא יוצר שדה ומציב בו את הערך. ‏Angular קורא את טיפוס הפרמטר ומזריק לפיו. הסגנון הזה עדיין עובד ונפוץ בקוד קיים, ול-Angular יש [מיגרציה](https://angular.dev/reference/migrations/inject-function) שממירה אותו ל-`inject()`. הדקורטור `@Service()` מהפוסט הבא לא תומך בו בכלל.

## טעויות נפוצות של מתחילים

- **ליצור שירות עם `new`.** ‏`new Cart()` נותן עגלה פרטית שאף קומפוננטה אחרת לא רואה, ומאבד את ההחלפה ב-provider אחר בבדיקות.
- **לקרוא ל-`inject` בתוך מתודה או אחרי `await`.** מזריקים בשדה ומשתמשים בשדה.

## מה הלאה

בפוסט הבא: ‏`@Service()` ו-`@Injectable` לעומק, מה ההבדל ביניהם ומתי בוחרים כל אחד.
