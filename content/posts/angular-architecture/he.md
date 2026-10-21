---
title: "ארכיטקטורה של אפליקציית Angular: מדריך הסגנון, ‏features ואיפה ה-state"
summary: "מה מדריך הסגנון הרשמי אומר על שמות קבצים ומבנה תיקיות, תיקייה לכל feature, קומפוננטה שמציגה לעומת קומפוננטה שמנהלת, ואיפה לשים state: קומפוננטה, route או root."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 77 }
---

באפליקציה של עשרה מסכים כמעט כל מבנה עובד. במאה מסכים ובכמה צוותים, המבנה קובע כמה קשה למצוא קוד, לשנות אותו ולמחוק אותו. הפוסט עובר על מה ש-[מדריך הסגנון](https://angular.dev/style-guide) הרשמי ממליץ, ועל חלוקה ל-features שבנויה עליו.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## שמות קבצים

לפי המדריך, מפרידים מילים במקף, קובץ הבדיקה הוא אותו שם עם `.spec.ts`, ושם הקובץ הוא שם הדבר שבתוכו. ‏`ng generate` בגרסה 22 כבר כותב כך:

```text
$ ng g c features/orders/order-list --dry-run
CREATE src/app/features/orders/order-list/order-list.css (0 bytes)
CREATE src/app/features/orders/order-list/order-list.spec.ts (554 bytes)
CREATE src/app/features/orders/order-list/order-list.ts (200 bytes)
CREATE src/app/features/orders/order-list/order-list.html (25 bytes)

$ ng g s features/orders/orders --dry-run
CREATE src/app/features/orders/orders.spec.ts (320 bytes)
CREATE src/app/features/orders/orders.ts (77 bytes)
```

בלי `.component` ובלי `.service` בשם, והשירות שנוצר מסומן ב-`@Service()`. המדריך גם ממליץ להימנע משמות כלליים כמו `utils.ts` או `helpers.ts`.

## תיקייה לכל feature

המדריך ממליץ לארגן לפי תחום ולא לפי סוג קוד: לא תיקיות `components/` ו-`services/`, אלא תיקייה לכל feature, עם הבדיקות ליד הקוד. הדוגמה כאן היא feature של הזמנות:

```text
src/app/
  app.routes.ts
  orders/
    orders.routes.ts
    orders-page.ts
    order-list.ts
    orders-store.ts
    orders-page.spec.ts
```

כל מה שקשור להזמנות נמצא במקום אחד. מחיקת ה-feature היא מחיקת תיקייה, ושינוי בו לא נוגע בקבצים של features אחרים. המדריך מוסיף: כשתיקייה גדלה מדי, מפצלים אותה לתת-תיקיות.

## קומפוננטה שמציגה וקומפוננטה שמנהלת

חלוקה נפוצה (לא מונח של המדריך) היא בין קומפוננטה שרק מציגה לבין קומפוננטה שמחברת אותה לנתונים:

```typescript
// order-list.ts: displays only
@Component({
  selector: 'app-order-list',
  template: `
    @for (order of orders(); track order.id) {
      <p>
        {{ order.title }}
        @if (!order.done) {
          <button (click)="done.emit(order.id)">Done</button>
        }
      </p>
    }
  `,
})
export class OrderList {
  readonly orders = input.required<Order[]>();
  readonly done = output<number>();
}

// orders-page.ts: connects the list to the store
@Component({
  selector: 'app-orders-page',
  imports: [OrderList],
  template: `<app-order-list [orders]="store.all()" (done)="store.markDone($event)" />`,
})
export class OrdersPage {
  protected readonly store = inject(OrdersStore);
}
```

(שורות ה-import הושמטו.) ‏`OrderList` לא יודעת מאיפה ההזמנות באות: היא מקבלת [input](he/posts/angular-inputs/) ושולחת [output](he/posts/angular-outputs-model/). אפשר להשתמש בה במסך אחר ולבדוק אותה בלי שום שירות. ‏`OrdersPage` היא היחידה שמכירה את ה-store. זה מתאים לכלל של המדריך: קוד של קומפוננטה עוסק בממשק, ולוגיקה שלא קשורה אליו עוברת לפונקציות או מחלקות נפרדות.

## איפה ה-state

שלוש רמות, מהצרה לרחבה:

- **בקומפוננטה:** ‏signal בתוך הקומפוננטה, למשל האם תפריט פתוח.
- **ב-feature:** ‏store שמסופק ב-route של ה-feature, ונמחק כשעוזבים אותו.
- **ב-root:** מה שכל האפליקציה צריכה, כמו המשתמש המחובר. ‏[`@Service()`](he/posts/angular-service-decorator/) בלי אפשרויות.

ה-store של ההזמנות הוא ברמה האמצעית:

```typescript
// orders-store.ts
@Service({ autoProvided: false })
export class OrdersStore {
  private readonly orders = signal<Order[]>([
    { id: 1, title: 'Keyboard', done: false },
    { id: 2, title: 'Mouse', done: true },
  ]);
  readonly all = this.orders.asReadonly();

  markDone(id: number) {
    this.orders.update((list) => list.map((o) => (o.id === id ? { ...o, done: true } : o)));
  }
}

// orders.routes.ts
export const ORDERS_ROUTES: Routes = [
  { path: '', component: OrdersPage, providers: [OrdersStore] },
];

// app.routes.ts
export const routes: Routes = [
  { path: 'orders', loadChildren: () => import('./orders/orders.routes').then((m) => m.ORDERS_ROUTES) },
];
```

‏`autoProvided: false` מונע רישום ב-root, ו-`providers` של ה-route יוצר מופע לאזור הזה. בגלל `loadChildren`, כל ה-feature, כולל ה-store, נבנה כ-chunk עצל נפרד (`orders-routes`, ‏1.58 kB). בדיקה עם `RouterTestingHarness` נכנסת ל-`/orders`, לוחצת על Done ובודקת שהכפתור נעלם. כשה-state של feature גדל, אותו store יכול להפוך ל-[SignalStore](he/posts/angular-state-management/) בלי לשנות את הקומפוננטות.

## עוד כמה כללים מהמדריך

- להזריק עם `inject()` ולא בבנאי.
- שדות שהתבנית קוראת: `protected`. שדות ש-Angular מאתחל (`input`, ‏`output`, ‏queries): ‏`readonly`.
- ‏binding ל-`class` ול-`style` במקום `NgClass` ו-`NgStyle`.
- שם של event handler מתאר את הפעולה (`saveUserData()`), לא את האירוע (`handleClick()`).
- תבנית פשוטה: לוגיקה מורכבת עוברת ל-`computed` במחלקה.

### בגרסאות קודמות

לפני גרסה 20, ‏`ng generate` הוסיף את הסוג לשם הקובץ, ומבנה לפי סוג קוד היה נפוץ:

```text
src/app/
  components/
    order-list/order-list.component.ts
  services/
    orders.service.ts
  orders/
    orders.module.ts
```

בסכמה של `ng generate component` בגרסה 19 ל-`type` יש ברירת מחדל `Component`, ובגרסה 20 כבר אין. היום `--type=component` מחזיר את הסיומת למי שרוצה להישאר עקבי עם קוד קיים. ‏feature שלם היה מקבל NgModule משלו; היום ה-route וה-`providers` שלו עושים את העבודה.

## טעויות נפוצות של מתחילים

- **תיקייה `shared/` שכולם זורקים אליה הכול.** משהו שמשמש feature אחד נשאר בתוך ה-feature.
- **קומפוננטת תצוגה שמזריקה שירות.** ברגע שהיא מזריקה, אי אפשר להשתמש בה בלי השירות הזה.
- **כל state ב-root.** ‏state של מסך אחד שנשאר בזיכרון אחרי שעוזבים אותו מחזיר נתונים ישנים בכניסה הבאה.

## מה הלאה

בפוסט הבא: Nx עם Angular. ‏monorepo עם כמה אפליקציות וספריות, ‏`nx affected`, וכלל lint שאוכף גבולות בין features.
