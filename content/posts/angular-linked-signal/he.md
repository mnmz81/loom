---
title: "linkedSignal ב-Angular: ‏state שמתאפס כשהמקור משתנה"
summary: "linkedSignal הוא signal שאפשר לכתוב אליו ושמחושב מחדש כשהמקור משתנה: בחירה שמתאפסת כשהרשימה מתחלפת, הצורה עם source ו-previous, ולמה לא לעשות את זה עם effect."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 14 }
---

‏[`computed`](he/posts/angular-signals/) נגזר מ-signals אחרים, אבל אי אפשר לכתוב אליו. ל-signal רגיל אפשר לכתוב, אבל הוא לא יודע מתי המקור שלו השתנה. ‏[`linkedSignal`](https://angular.dev/guide/signals/linked-signal) משלב את השניים: ערך שהמשתמש משנה, ושמחושב מחדש כשהמקור משתנה.

כל דוגמה נבדקה עם Angular 22.2. קטעי TypeScript בלי קומפוננטה הורצו ב-Node.js 24.

## הבעיה: בחירה שלא יודעת שהרשימה התחלפה

```typescript
// sizes-stale.ts
import { signal } from '@angular/core';

const sizes = signal(['S', 'M', 'L']);
const selected = signal(sizes()[0]);

selected.set('L');
sizes.set(['XS', 'S']);
console.log(selected()); // L
```

```text
L
```

המשתמש בחר `L`, ואז הרשימה הוחלפה במידות ילדים. ‏`selected` נשאר `L`, מידה שכבר לא קיימת.

## הצורה הקצרה

```typescript
// sizes-linked.ts
import { linkedSignal, signal } from '@angular/core';

const sizes = signal(['S', 'M', 'L']);
const selected = linkedSignal(() => sizes()[0]);

selected.set('L');
console.log(selected()); // L
sizes.set(['XS', 'S']);
console.log(selected()); // XS
```

```text
L
XS
```

‏`linkedSignal` מקבל פונקציית חישוב, כמו `computed`. כל עוד הרשימה לא משתנה הוא מתנהג כמו signal רגיל, ו-`set` שומר את הבחירה. כשמשתנה signal שהחישוב קרא, הערך חוזר לתוצאת החישוב: המידה הראשונה ברשימה החדשה.

## ‏source ו-computation: לשמור בחירה שעדיין תקפה

```typescript
// sizes-previous.ts
import { linkedSignal, signal } from '@angular/core';

const sizes = signal(['S', 'M', 'L']);
const selected = linkedSignal<string[], string>({
  source: sizes,
  computation: (list, previous) =>
    previous && list.includes(previous.value) ? previous.value : list[0],
});

selected.set('M');
sizes.set(['S', 'M']);
console.log(selected()); // M
sizes.set(['XL', 'XXL']);
console.log(selected()); // XL
```

```text
M
XL
```

בצורה המלאה מעבירים אובייקט. ‏`source` הוא ה-signal שעוקבים אחריו, ו-`computation` מקבל את הערך החדש שלו ואת `previous`, שיש בו `previous.source` (הערך הקודם של המקור) ו-`previous.value` (הערך הקודם של ה-linkedSignal). כאן הבחירה נשמרת אם היא עדיין ברשימה, ואחרת חוזרת לראשונה. בריצה הראשונה אין ערך קודם, ולכן `previous` אופציונלי בטיפוס ומופיעה הבדיקה `previous &&`. כשמשתמשים ב-`previous` [כותבים את הטיפוסים הגנריים במפורש](https://angular.dev/guide/signals/linked-signal#accounting-for-previous-state): הראשון הוא טיפוס המקור, השני טיפוס התוצאה.

## בתוך קומפוננטה

```typescript
import { Component, linkedSignal, signal } from '@angular/core';

@Component({
  selector: 'app-size-picker',
  template: `
    @for (size of sizes(); track size) {
      <button (click)="selected.set(size)">{{ size }}</button>
    }
    <p>Selected: {{ selected() }}</p>
    <button (click)="sizes.set(['XS', 'S'])">Kids sizes</button>
  `,
})
export class SizePicker {
  readonly sizes = signal(['S', 'M', 'L']);
  readonly selected = linkedSignal(() => this.sizes()[0]);
}
```

אחרי לחיצה על `L` ואז על `Kids sizes` מוצג `Selected: XS`. המקור יכול להיות כל signal, גם `computed` או input של קומפוננטה (הנושא של [הפוסט הבא](he/posts/angular-inputs/)), למשל בחירה שמתאפסת כשההורה מעביר רשימה חדשה. מגרסה 22.1 אפשר גם [להעביר פונקציית `set`](https://angular.dev/guide/signals/linked-signal#customizing-the-set-operation) שכותבת חזרה ל-signal המקור, במקום לשמור את הערך ב-linkedSignal עצמו.

### בגרסאות קודמות

‏`linkedSignal` נוסף בגרסה 19 והוכרז כיציב [בגרסה 20](https://github.com/angular/angular/blob/main/CHANGELOG.md). לפני כן הפתרון המקובל היה signal רגיל ו-effect שמאפס אותו (לפני גרסה 19 גם עם `allowSignalWrites: true`):

```typescript
import { Component, effect, signal } from '@angular/core';

@Component({
  selector: 'app-size-picker-old',
  template: `<p>Selected: {{ selected() }}</p>`,
})
export class SizePickerOld {
  readonly sizes = signal(['S', 'M', 'L']);
  readonly selected = signal('S');

  constructor() {
    effect(() => this.selected.set(this.sizes()[0]));
  }
}
```

זה הדפוס ש[הפוסט על effect](he/posts/angular-effect/) ממליץ להימנע ממנו. בבדיקה, אחרי `selected.set('L')` ו-`sizes.set(['XS', 'S'])` הגרסה עם effect עדיין החזירה `L`, עד ה-change detection הבא. ‏`linkedSignal` החזיר `XS` כבר בקריאה הראשונה, כי הוא מחושב כשקוראים אותו ולא מחכה לתזמון.

## טעויות נפוצות של מתחילים

- **להשתמש ב-linkedSignal כשאף אחד לא כותב לערך.** אם אין `set`, זה `computed`.
- **לשכוח שכל signal שהחישוב קורא מאפס את הערך.** [לפי התיעוד](https://angular.dev/guide/signals/linked-signal#accounting-for-previous-state) זה נכון גם בצורה עם `source`. ‏signal שרק עוזר לחישוב קוראים עם `untracked`.

## מה הלאה

בפוסט הבא: ‏inputs, הדרך שבה קומפוננטה מקבלת נתונים מההורה שלה, עם `input()`.
