---
title: "OnPush כברירת מחדל ב-Angular 22: מה משתנה בקוד קיים"
summary: "מה קורה לקומפוננטות בלי אסטרטגיה מפורשת בגרסה 22, מה ng update מוסיף (Eager ו-strictTemplates: false), מה נשבר כשה-Eager חסר, ואיך עוברים ל-OnPush קומפוננטה אחרי קומפוננטה."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 24 }
---

ה-[changelog של גרסה 22](https://github.com/angular/angular/blob/main/CHANGELOG.md#2200-2026-06-03) מנסח את השינוי במשפט אחד: קומפוננטות בלי `changeDetection` הן עכשיו OnPush כברירת מחדל, ומי שרוצה את ההתנהגות הקודמת כותב `ChangeDetectionStrategy.Eager`. הפוסט הזה עוסק במה שזה אומר לקוד שנכתב לפני כן.

כל דוגמה נבדקה עם Angular 22.2, ‏zone.js 0.16 ו-Vitest 5. השדרוג הורץ על פרויקט אמיתי שנוצר עם `ng new` בגרסה 21.

## מה `ng update` עושה

לפרויקט נוספו שלוש קומפוננטות: אחת בלי אסטרטגיה, אחת עם `Default` ואחת עם `OnPush`. כדי לדמות פרויקט ישן נמחק גם `strictTemplates` מ-`tsconfig.json` (‏`ng new` בגרסה 21 מגדיר אותו כ-`true`). אחר כך הורץ `ng update @angular/core@22 @angular/cli@22`. חלק מהפלט:

```text
** Executing migrations of package '@angular/core' **

❯ Adds `ChangeDetectionStrategy.Eager` to all components.
UPDATE src/app/app.ts (362 bytes)
UPDATE src/app/legacy-list.ts (265 bytes)
UPDATE src/app/old-list.ts (213 bytes)
  Migration completed (3 files modified).

❯ Adds 'strictTemplates: false' in tsconfig.json when not set.
UPDATE tsconfig.app.json (638 bytes)
  Migration completed (1 file modified).
```

הקומפוננטה שלא הייתה לה אסטרטגיה נראית ככה אחרי השדרוג:

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-legacy-list',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<p>{{ items.length }} items</p>`,
})
export class LegacyList {
  items: string[] = [];
}
```

- כל קומפוננטה בלי אסטרטגיה, כולל `App`, קיבלה `Eager`.
- ‏`ChangeDetectionStrategy.Default` הוחלף ב-`Eager`.
- הקומפוננטה עם `OnPush` לא השתנתה.

ב-`tsconfig.app.json` נוסף:

```json
"angularCompilerOptions": {
  "extendedDiagnostics": {
    "checks": {
      "nullishCoalescingNotNullable": "suppress",
      "optionalChainNotNullable": "suppress"
    }
  },
  "strictTemplates": false
}
```

ה-`extendedDiagnostics` מגיע ממיגרציה אחרת באותה ריצה. ב-Angular 22 ‏[`strictTemplates` הוא `true` כברירת מחדל](https://angular.dev/reference/configs/angular-compiler-options), ולכן המיגרציה כותבת `false` במפורש בפרויקט שלא הגדיר אותו. התוצאה: אחרי `ng update` האפליקציה מתנהגת בדיוק כמו קודם. ‏OnPush כברירת מחדל משפיע רק על קומפוננטות שנכתבות מעכשיו, או על קומפוננטות שמוחקים מהן את ה-`Eager`.

## מה נשבר כשה-Eager חסר

קומפוננטה בסגנון הישן, שמשנה שדה רגיל בטיימר, באפליקציה שעדיין רצה על [Zone.js](he/posts/angular-zone-js/):

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `<p>Count: {{ count }}</p>`,
})
export class Counter {
  protected count = 0;

  constructor() {
    setTimeout(() => this.count++, 50);
  }
}
```

הטסט מריץ אותה עם `provideZoneChangeDetection()`, פעם כמו שהיא ופעם עם `changeDetection: ‏ChangeDetectionStrategy.Eager`:

```text
OnPush (default): Count: 0
Eager: Count: 1
```

‏Zone.js ראה את הטיימר והריץ בדיקה בשני המקרים. עם `Eager` הקומפוננטה נבדקה. כ-OnPush היא דולגה, כי טיימר הוא לא אחד מ[הכללים של OnPush](he/posts/angular-onpush/). זה מה שיקרה לקוד שמעתיקים ממדריך ישן לפרויקט בגרסה 22. באפליקציה zoneless אותה קומפוננטה לא תתעדכן גם עם `Eager`, כי שם אף אחד לא מריץ בדיקה אחרי טיימר.

## לעבור ל-OnPush קומפוננטה אחרי קומפוננטה

ה-`Eager` שהמיגרציה הוסיפה הוא רשימת משימות. לכל קומפוננטה:

‏1. מוחקים את `changeDetection: ‏ChangeDetectionStrategy.Eager`.
‏2. מחפשים state שמשתנה מחוץ לאירועים בתבנית: השמה לשדה רגיל בתוך `setTimeout`, ‏`subscribe` או `then`. הופכים אותו ל-[signal](he/posts/angular-signals/), או מציגים observable עם `async`.
‏3. מחפשים inputs שמשנים במקום (`push`, השמה לשדה של אובייקט) ויוצרים הפניה חדשה במקום.
‏4. מריצים את הטסטים עם `await fixture.whenStable()`.

אותו Counter אחרי שלבים 1–2:

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `<p>Count: {{ count() }}</p>`,
})
export class Counter {
  protected readonly count = signal(0);

  constructor() {
    setTimeout(() => this.count.update((n) => n + 1), 50);
  }
}
```

```text
OnPush + signal, Zone.js: Count: 1
OnPush + signal, zoneless: Count: 1
```

עם signal הקומפוננטה עובדת גם עם Zone.js וגם בלעדיו, וזה בדיוק מה שצריך לפני [המעבר ל-zoneless](he/posts/angular-zoneless-migration/). כלי שמוצא עדכונים שקטים בכל האפליקציה מופיע [בפוסט שמסכם את רמה 3](he/posts/angular-reactivity-model/).

## טעויות נפוצות של מתחילים

- ‏**למחוק את כל ה-`Eager` בבת אחת אחרי השדרוג.** כל קומפוננטה שתלויה בשדות רגילים תפסיק להתעדכן, וקשה לדעת איזו.
- ‏**להעתיק קומפוננטה ממדריך ישן בלי לבדוק איך היא מעדכנת state.** בגרסה 22 היא OnPush, גם אם במדריך זה לא כתוב.
- ‏**להשאיר את `strictTemplates: ‏false` לתמיד.** המיגרציה שומרת על ההתנהגות הישנה, אבל ברירת המחדל החדשה מוצאת יותר שגיאות בתבניות.

## מה הלאה

בפוסט הבא: ‏zoneless, ברירת המחדל מגרסה 21. מה גורם לרינדור, מה כבר לא עובד, ו-`PendingTasks` ל-SSR.
