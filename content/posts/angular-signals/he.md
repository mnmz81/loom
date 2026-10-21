---
title: "signals ב-Angular: ‏signal, ‏computed ו-asReadonly"
summary: "איך מחזיקים state ב-Angular עם signal: קריאה עם (), ‏set ו-update, ערכים נגזרים עם computed, חשיפה לקריאה בלבד עם asReadonly, ולמה push למערך לא מעדכן את המסך."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 12 }
---

‏signal הוא עטיפה לערך, שמודיעה למי שקורא אותו כשהערך משתנה. ‏Angular משתמש במידע הזה כדי לדעת אילו קומפוננטות לרנדר מחדש, ולכן ב-Angular 22 ה-state של קומפוננטה נשמר ב-signals. ב[פוסט הראשון](he/posts/angular-what-is-angular/) הופיע מונה אחד; כאן ה-API כולו.

כל דוגמה נבדקה עם Angular 22.2. קטעי TypeScript בלי קומפוננטה הורצו ב-Node.js 24 עם החבילה `@angular/core`.

## יצירה, קריאה וכתיבה

‏`signal()` מקבל ערך התחלתי ומחזיר [WritableSignal](https://angular.dev/guide/signals#writable-signals). קוראים את הערך בקריאה לפונקציה, וכותבים עם `set` (ערך חדש) או `update` (ערך חדש שמחושב מהקודם):

```typescript
// count.ts
import { signal } from '@angular/core';

const count = signal(0);
console.log(count());

count.set(5);
count.update((n) => n + 1);
console.log(count());
```

```text
0
6
```

הקריאה `count()` היא מה שמאפשר ל-Angular לעקוב. כל קוד שקורא signal בתוך הקשר ריאקטיבי (תבנית, ‏`computed`, ‏`effect`) נרשם כצרכן שלו, ויודע כשהערך מתחלף.

## ‏computed: ערך שנגזר מ-signals אחרים

```typescript
// total.ts
import { computed, signal } from '@angular/core';

const price = signal(40);
const quantity = signal(2);
const total = computed(() => {
  console.log('computing');
  return price() * quantity();
});

console.log('nothing computed yet');
console.log(total());
console.log(total());
quantity.set(3);
console.log(total());
```

```text
nothing computed yet
computing
80
80
computing
120
```

‏[`computed`](https://angular.dev/guide/signals#computed-signals) מקבל פונקציה ומחזיר signal לקריאה בלבד. הפלט מראה את שתי התכונות שלו: הוא עצל, כלומר הפונקציה לא רצה עד הקריאה הראשונה, והוא שומר את התוצאה, כך שהקריאה השנייה לא חישבה שוב. החישוב רץ שוב רק אחרי ש-`quantity` השתנה, ולכן אפשר לשים ב-computed גם חישוב יקר, כמו סינון של מערך ארוך.

התלויות נקבעות מחדש בכל ריצה, לפי ה-signals שנקראו בפועל: אם `if` דילג על קריאה של signal מסוים, שינוי שלו לא יפעיל חישוב. ול-computed אין `set`, כך שניסיון לכתוב אליו הוא שגיאת קומפילציה.

## ‏signals בתבנית

```typescript
import { Component, computed, signal } from '@angular/core';

@Component({
  selector: 'app-cart',
  template: `
    <button (click)="add()">Add item</button>
    <p>{{ items().length }} items, total {{ total() }}</p>
  `,
})
export class Cart {
  protected readonly items = signal<number[]>([]);
  protected readonly total = computed(() => this.items().reduce((sum, price) => sum + price, 0));

  protected add() {
    this.items.update((list) => [...list, 25]);
  }
}
```

התבנית קוראת את `items()` ואת `total()`, ולכן Angular רושם אותם כתלויות של הקומפוננטה. כשהכפתור מעדכן את `items`, ‏Angular [מסמן את הקומפוננטה לבדיקה](https://angular.dev/guide/signals#reading-signals-in-onpush-components) ומרנדר אותה מחדש, גם ב-OnPush, שהוא ברירת המחדל מגרסה 22. אחרי שתי לחיצות מוצג `2 items, total 50`. התבנית יכולה לגשת לשדות `protected`, וכך הם לא חשופים מחוץ לקומפוננטה.

## חשיפה לקריאה בלבד עם asReadonly

```typescript
// counter-store.ts
import { signal } from '@angular/core';

export class CounterStore {
  private readonly _count = signal(0);
  readonly count = this._count.asReadonly();

  increment() {
    this._count.update((n) => n + 1);
  }
}

const store = new CounterStore();
store.increment();
console.log(store.count()); // 1
// store.count.set(5);
```

‏[`asReadonly()`](https://angular.dev/guide/signals#converting-writable-signals-to-readonly) מחזיר signal שמשקף את המקורי, בלי `set` ו-`update`. מי שמחזיק `CounterStore` קורא את `count`, ומשנה אותו רק דרך `increment`. אם מורידים את ההערה מהשורה האחרונה:

```text
counter-store.ts(15,13): error TS2339: Property 'set' does not exist on type 'Signal<number>'.
```

ההגנה היא על ה-signal ולא על התוכן שלו: אם הערך הוא אובייקט, עדיין אפשר לשנות את השדות שלו. בפוסט על [תקשורת בין קומפוננטות](he/posts/angular-component-communication/) מחלקה כזו הופכת לשירות שכמה קומפוננטות חולקות.

## מתי signal נחשב "השתנה"

```typescript
// equality.ts
import { computed, signal } from '@angular/core';

const tags = signal(['angular']);
const tagCount = computed(() => tags().length);
console.log(tagCount());

tags().push('signals'); // mutates the array, the signal doesn't know
console.log(tagCount());

tags.update((list) => [...list, 'rxjs']); // new array, new reference
console.log(tagCount());

const user = signal({ id: 1, name: 'Dana' }, { equal: (a, b) => a.id === b.id });
const greeting = computed(() => `Hi ${user().name}`);
console.log(greeting());
user.set({ id: 1, name: 'Dana Levi' }); // same id: treated as no change
console.log(greeting());
```

```text
1
1
3
Hi Dana
Hi Dana
```

כברירת מחדל signal משווה ערך חדש לקודם עם [`Object.is`](https://angular.dev/guide/signals#signal-equality-functions), כלומר לפי הפניה (reference). זה מסביר את שתי השורות הראשונות: ‏`push` שינה את המערך, אבל ההפניה נשארה אותה הפניה וה-signal לא הודיע, ולכן `tagCount` החזיר את הערך השמור. ‏`update` עם מערך חדש כן הודיע, והחישוב ראה את שלושת האיברים.

האפשרות `equal` מחליפה את ההשוואה. כאן שני משתמשים עם אותו `id` נחשבים שווים, ולכן `set` לא שינה את הערך ו-`greeting` נשאר כמו שהיה.

### בגרסאות קודמות

‏Signals נוספו בגרסה 16, וה-API הבסיסי [הוכרז כיציב בגרסה 17](https://github.com/angular/angular/blob/main/CHANGELOG.md). לפני כן state היה שדה רגיל (`count = 0`) ו-Zone.js בדק את כל העץ אחרי כל אירוע, כמו ב[פוסט הראשון](he/posts/angular-what-is-angular/). ‏state משותף נשמר לרוב ב-`BehaviorSubject` של RxJS בתוך שירות:

```typescript
import { Component, Injectable, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly items$ = new BehaviorSubject<number[]>([]);
  readonly total$ = this.items$.pipe(map((items) => items.reduce((sum, price) => sum + price, 0)));

  add(price: number) {
    this.items$.next([...this.items$.value, price]);
  }
}

@Component({
  selector: 'app-cart',
  imports: [AsyncPipe],
  template: `
    <button (click)="cart.add(25)">Add item</button>
    <p>Total {{ cart.total$ | async }}</p>
  `,
})
export class CartComponent {
  protected readonly cart = inject(CartService);
}
```

‏`total$` הוא Observable, והתבנית פותחת אותו עם ה-pipe ‏`async`. הקוד הזה עדיין עובד, אבל ל-state סינכרוני signal פשוט יותר: אין subscribe, ואין `| async` בתבנית. המעבר בין השניים (`toSignal`, ‏`toObservable`) מוסבר בפוסט על [RxJS ו-signals](he/posts/angular-rxjs-interop/).

## טעויות נפוצות של מתחילים

- **לשכוח את הסוגריים בתבנית.** ‏`{{ count }}` במקום `{{ count() }}`. ה-build מזהיר: `NG8109: count is a function and should be invoked: count()`.
- **לשנות מערך או אובייקט במקום.** ‏`push` או השמה לשדה לא מודיעים לאף אחד. מחליפים את הערך עם `update` ועותק חדש.
- **להחזיק עותק של ערך נגזר ב-signal נפרד.** סכום, סינון או שם מלא הם `computed`, לא signal שמעדכנים ביד.

## מה הלאה

בפוסט הבא: ‏`effect`, שמריץ קוד בכל פעם ש-signal משתנה, ומתי לא צריך אותו.
