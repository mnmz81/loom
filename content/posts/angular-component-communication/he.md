---
title: "תקשורת בין קומפוננטות ב-Angular: ‏inputs, ‏outputs, ‏model ושירות משותף"
summary: "איך מעבירים מידע בין קומפוננטות ב-Angular 22: מהורה לילד ב-input, מהילד להורה ב-output, דו-כיווני ב-model, ובין אחים דרך שירות משותף שמחזיק signals."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 19 }
---

הפוסטים הקודמים ברמה הזו הציגו כל כלי בנפרד. כאן הם מתחברים לחנות קטנה אחת: כרטיס מוצר, קטלוג ותג עגלה, וכל זוג קומפוננטות מדבר בדרך שמתאימה ליחס ביניהן.

כל דוגמה נבדקה עם Angular 22.2.

## הורה וילד: ‏input ו-output

```typescript
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-product-card',
  template: `
    <h3>{{ name() }}</h3>
    <button (click)="added.emit(name())">Add to cart</button>
  `,
})
export class ProductCard {
  readonly name = input.required<string>();
  readonly added = output<string>();
}
```

הכרטיס לא יודע מאיפה הגיע המוצר ומה קורה אחרי הלחיצה. הוא מקבל `name` מההורה ב-[input](he/posts/angular-inputs/), ומודיע על הלחיצה ב-[output](he/posts/angular-outputs-model/). ככה אפשר להשתמש בו בקטלוג, ברשימת מבצעים או בבדיקה, בלי לשנות אותו.

כשהילד גם משנה ערך שההורה מחזיק, למשל בורר כמות, ‏`model()` עם `[(value)]` מחליף את הצמד input ו-output, כמו ב[פוסט הקודם על model](he/posts/angular-outputs-model/).

## אחים: שירות שמחזיק signals

```typescript
import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<string[]>([]);
  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);

  add(product: string) {
    this._items.update((items) => [...items, product]);
  }
}
```

הקטלוג ותג העגלה הם אחים: לאף אחד מהם אין הפניה לשני. אפשר להעביר את המידע דרך ההורה המשותף, אבל כשהקומפוננטות רחוקות זו מזו בעץ זה מחייב inputs ו-outputs בכל רמה באמצע. במקום זה מחזיקים את ה-state ב[שירות](https://angular.dev/guide/di/creating-and-using-services). ‏`providedIn: 'root'` אומר ש-Angular יוצר מופע אחד לכל האפליקציה, וכל מי שמבקש אותו מקבל את אותו מופע. בפנים זה אותו דפוס מ[פוסט ה-signals](he/posts/angular-signals/): ‏signal פרטי, גרסה לקריאה בלבד עם `asReadonly`, ‏`computed` לערכים נגזרים, ומתודה אחת שמותר לה לשנות. ב-Angular 22 יש גם קיצור, `@Service()`, שמוצג ב[פוסט משלו](he/posts/angular-service-decorator/).

```typescript
import { Component, inject } from '@angular/core';
import { CartStore } from './cart-store';
import { ProductCard } from './product-card';

@Component({
  selector: 'app-catalog',
  imports: [ProductCard],
  template: `
    @for (product of products; track product) {
      <app-product-card [name]="product" (added)="cart.add($event)" />
    }
  `,
})
export class Catalog {
  protected readonly products = ['Keyboard', 'Mouse'];
  protected readonly cart = inject(CartStore);
}

@Component({
  selector: 'app-cart-badge',
  template: `<span>Cart ({{ cart.count() }})</span>`,
})
export class CartBadge {
  protected readonly cart = inject(CartStore);
}

@Component({
  selector: 'app-shop',
  imports: [Catalog, CartBadge],
  template: `
    <app-cart-badge />
    <app-catalog />
  `,
})
export class Shop {}
```

‏`inject(CartStore)` מחזיר לשתי הקומפוננטות את אותו מופע (על `inject` ב[פוסט משלו](he/posts/angular-inject/)). הקטלוג מתרגם את ה-output של הכרטיס לקריאה ל-`add`, והתג קורא את `count()` בתבנית, ולכן מתעדכן לבד. לחיצה על `Add to cart` ליד `Mouse` מחליפה את `Cart (0)` ב-`Cart (1)`, ובשירות נשאר `['Mouse']`. ‏`Shop` לא מעביר שום דבר בין השניים.

## איך בוחרים

| היחס | הכלי |
|---|---|
| הורה מעביר נתון לילד | `input()` |
| הילד מודיע להורה על אירוע | `output()` |
| הילד משנה ערך שההורה מחזיק | `model()` עם `[(value)]` |
| קומפוננטות רחוקות או אחים | שירות עם signals |
| state גדול שחלקים רבים באפליקציה משנים | store, בפוסט על [ניהול state](he/posts/angular-state-management/) |

ההתחלה היא הדרך הפשוטה ביותר שעובדת. שירות עם signals מספיק להרבה אפליקציות. ‏store שווה את ההשקעה כשהרבה פיצ'רים קוראים וכותבים לאותו state, וצריך כללים אחידים לאופן שבו הוא משתנה.

### בגרסאות קודמות

אותן דרכים היו קיימות גם קודם, עם API אחר: ‏`@Input()` ו-`@Output()` עם `EventEmitter` בין הורה לילד, ושירות עם `BehaviorSubject` של RxJS בין אחים. הצורות הישנות מופיעות בסוף הפוסטים על [signals](he/posts/angular-signals/), ‏[inputs](he/posts/angular-inputs/) ו-[outputs](he/posts/angular-outputs-model/).

## טעויות נפוצות של מתחילים

- **לחשוף מהשירות את ה-signal שאפשר לכתוב אליו.** כל קומפוננטה תוכל לשנות אותו בדרך משלה. חושפים `asReadonly()` ומתודות.
- **להעביר נתון דרך שלוש רמות של inputs ו-outputs.** כשהרמות באמצע רק מעבירות הלאה, שירות משותף פשוט יותר.
- **להגיע לילד עם [query](he/posts/angular-queries/) ולשנות לו state.** נתונים יורדים ב-input ואירועים עולים ב-output.

## מה הלאה

רמה 2 נגמרת כאן. ברמה הבאה: איך Angular יודע מתי לעדכן את המסך, ומה זה change detection.
