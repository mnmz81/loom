---
title: "ניהול state ב-Angular: שירות עם signals ו-NgRx SignalStore"
summary: "שירות עם signals כברירת המחדל לניהול state, מתי הוא כבר לא מספיק, ואותו state ב-NgRx SignalStore עם withState, ‏withComputed, ‏withMethods ו-patchState, כולל בדיקה."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 76 }
---

‏state הוא כל מה שהאפליקציה זוכרת: עגלת קניות, משתמש מחובר, פילטרים. באפליקציה קטנה הוא יושב בקומפוננטה. כשכמה מסכים צריכים אותו, הוא עובר לשירות. הפוסט מראה את השירות, ואת NgRx SignalStore למקרים שבהם השירות כבר לא מספיק.

כל דוגמה נבדקה עם Angular 22.2, ‏@ngrx/signals 22.0.1 ו-Vitest.

## שירות עם signals

```typescript
import { Service, computed, signal } from '@angular/core';

export type CartItem = { id: number; name: string; price: number };

@Service()
export class Cart {
  private readonly items = signal<CartItem[]>([]);
  readonly list = this.items.asReadonly();
  readonly total = computed(() => this.items().reduce((sum, i) => sum + i.price, 0));

  add(item: CartItem) {
    this.items.update((items) => [...items, item]);
  }
  remove(id: number) {
    this.items.update((items) => items.filter((i) => i.id !== id));
  }
}
```

‏[`@Service()`](he/posts/angular-service-decorator/) נותן מופע אחד לכל האפליקציה. ה-signal הכתיב פרטי, ומבחוץ רואים רק [`asReadonly()`](he/posts/angular-signals/) ו-`computed`. כך יש מקום אחד שמשנה את העגלה, והמתודות שלו מתארות מה קרה (`add`, ‏`remove`), לא איך הנתונים זזים. בדיקה שמוסיפה שני פריטים ומוחקת אחד מקבלת `['Pen']` וסכום 30.

זו ברירת המחדל, והיא מספיקה להרבה אפליקציות: בלי ספרייה, בלי boilerplate, ו-OnPush מתעדכן לבד כי התבניות קוראות signals.

## מתי זה כבר לא מספיק

השירות לא קובע מבנה. בצוות גדול כל שירות נכתב קצת אחרת: אחד חושף signal כתיב, אחר שוכח `asReadonly`, שלישי מערבב טעינה מהשרת עם חישובים. [NgRx SignalStore](https://ngrx.io/guide/signals/signal-store) נותן לכל store אותו מבנה: state, ערכים מחושבים ומתודות, שמחוברים כ-features. לפי התיעוד שלו יש גם features מוכנים, למשל ניהול רשימות של ישויות ו-hooks למחזור החיים, ואפשר לכתוב features משותפים משלכם.

‏SignalStore מותקן כחבילה נפרדת. ‏[התיעוד](https://ngrx.io/guide/signals/install) ממליץ על `ng add @ngrx/signals@latest`; כאן היא הותקנה עם `npm install @ngrx/signals`.

## אותו state ב-SignalStore

```typescript
import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { CartItem } from './cart';

type CartState = { items: CartItem[]; coupon: string | null };

export const CartStore = signalStore(
  { providedIn: 'root' },
  withState<CartState>({ items: [], coupon: null }),
  withComputed(({ items, coupon }) => ({
    subtotal: computed(() => items().reduce((sum, i) => sum + i.price, 0)),
    discount: computed(() => (coupon() === 'LOOM10' ? 0.1 : 0)),
  })),
  withComputed(({ subtotal, discount }) => ({
    total: computed(() => subtotal() * (1 - discount())),
  })),
  withMethods((store) => ({
    add(item: CartItem) {
      patchState(store, (state) => ({ items: [...state.items, item] }));
    },
    applyCoupon(code: string) {
      patchState(store, { coupon: code });
    },
  })),
);
```

- ‏`signalStore` מחזיר מחלקה שאפשר להזריק. ‏`{ providedIn: 'root' }` רושם אותה ב-root; בלי זה מוסיפים אותה ל-`providers` של קומפוננטה או route, ואז היא חיה כל עוד הקומפוננטה חיה.
- ‏`withState` יוצר signal לכל שדה: ‏`store.items()`, ‏`store.coupon()`.
- ‏`withComputed` מקבל את מה שהוגדר לפניו. ‏`withComputed` השני משתמש ב-`subtotal` מהראשון.
- ‏`withMethods` מגדיר את הדרך היחידה לשנות state, עם `patchState`, שמקבל אובייקט חלקי או פונקציה מה-state הקודם.

## ה-state מוגן מבחוץ

‏state של SignalStore מוגן כברירת מחדל. קוד מחוץ ל-store לא יכול לקרוא ל-`patchState` עליו:

```typescript
import { inject } from '@angular/core';
import { patchState } from '@ngrx/signals';
import { CartStore } from './cart-store';

export function clearCart() {
  patchState(inject(CartStore), { items: [] });
}
```

```text
error TS2345: Argument of type '{ items: Signal<CartItem[]>; ... } & StateSource<...>' is not assignable to parameter of type 'WritableStateSource<{ items: CartItem[]; coupon: string | null; }>'.
  The types of '[STATE_SOURCE].items' are incompatible between these types.
```

(הודעת השגיאה מקוצרת.) זה אותו רעיון כמו ה-signal הפרטי בשירות, רק שהספרייה אוכפת אותו. ‏`{ protectedState: false }` מבטל את ההגנה, ו[התיעוד](https://ngrx.io/guide/signals/signal-store) ממליץ להשאיר אותה.

## שימוש ובדיקה

בקומפוננטה מזריקים את ה-store וקוראים לו כמו לשירות:

```typescript
import { Component, inject } from '@angular/core';
import { CartStore } from './cart-store';

@Component({
  selector: 'app-cart-summary',
  template: `
    <p>{{ store.items().length }} items, total {{ store.total() }}</p>
    <button (click)="store.applyCoupon('LOOM10')">Apply LOOM10</button>
  `,
})
export class CartSummary {
  protected readonly store = inject(CartStore);
}
```

והבדיקה לא צריכה שום דבר מיוחד, כי store הוא שירות רגיל:

```typescript
import { TestBed } from '@angular/core/testing';
import { CartStore } from './cart-store';

it('adds items and applies a coupon', () => {
  const store = TestBed.inject(CartStore);
  store.add({ id: 1, name: 'Book', price: 50 });
  store.add({ id: 2, name: 'Pen', price: 30 });
  store.applyCoupon('LOOM10');
  expect(store.subtotal()).toBe(80);
  expect(store.total()).toBe(72);
});
```

בדיקה נוספת של `CartSummary` עם פריט אחד במחיר 50 מצאה `1 items, total 50`, ואחרי לחיצה על הכפתור `1 items, total 45`.

## טעויות נפוצות של מתחילים

- **להתחיל עם ספרייה לפני שיש בעיה.** שירות עם signals מספיק עד שרואים שהמבנה לא אחיד או שהקוד חוזר על עצמו.
- **לשים הכול ב-store גלובלי אחד.** ‏state של מסך אחד שייך ל-store שמסופק בקומפוננטה או ב-route של אותו מסך.
- **לכבות את `protectedState` כדי לעדכן מקומפוננטה.** עדיף להוסיף מתודה ל-`withMethods`.

## מה הלאה

בפוסט הבא: ארכיטקטורה של אפליקציה גדולה. מדריך הסגנון הרשמי, תיקייה לכל feature, וקומפוננטות שמציגות לעומת קומפוננטות שמנהלות.
