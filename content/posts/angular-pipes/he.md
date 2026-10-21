---
title: "Pipes: ‏date, ‏currency ועוד, ואיך כותבים pipe משלכם"
summary: "ה-pipes המובנים (date, ‏currency, ‏number, ‏json, ‏async ועוד), פרמטרים ושרשור, ‏pipe מותאם עם @Pipe, והבדל בין pure ל-impure. ובגרסאות קודמות: pipes ב-NgModule."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 10 }
---

‏[Pipe](https://angular.dev/guide/templates/pipes) הוא פונקציה שמשנה ערך לצורך תצוגה, ואותה כותבים בתבנית אחרי `|`. הערך נשאר כמו שהוא במחלקה, ורק מה שמוצג משתנה.

## ה-pipes המובנים

קומפוננטה אחת עם כמה מהם:

```typescript
// builtin.ts
import { Component } from '@angular/core';
import {
  AsyncPipe,
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
  JsonPipe,
  PercentPipe,
  SlicePipe,
  TitleCasePipe,
  UpperCasePipe,
} from '@angular/common';

@Component({
  selector: 'app-builtin',
  imports: [
    AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe, JsonPipe,
    PercentPipe, SlicePipe, TitleCasePipe, UpperCasePipe,
  ],
  template: `
    <p>{{ price | currency }} | {{ price | currency: 'EUR' : 'symbol' : '1.0-0' }}</p>
    <p>{{ day | date: 'yyyy-MM-dd' : 'UTC' }} | {{ day | date: 'fullDate' : 'UTC' }}</p>
    <p>{{ ratio | percent }} | {{ pi | number: '1.1-3' }}</p>
    <p>{{ title | titlecase }} | {{ title | uppercase | slice: 0 : 5 }}</p>
    <pre>{{ user | json }}</pre>
    <p>{{ greeting | async }}</p>
  `,
})
export class BuiltIn {
  protected readonly price = 1234.5;
  protected readonly day = new Date(Date.UTC(2026, 9, 20));
  protected readonly ratio = 0.256;
  protected readonly pi = Math.PI;
  protected readonly title = 'angular pipes';
  protected readonly user = { name: 'Dana', tags: ['a', 'b'] };
  protected readonly greeting = Promise.resolve('hello');
}
```

```text
$1,234.50 | €1,235
2026-10-20 | Tuesday, October 20, 2026
26% | 3.142
Angular Pipes | ANGUL
{ "name": "Dana", "tags": [ "a", "b" ] }
hello
```

כל דוגמה נבדקה עם Angular 22.2 בבדיקת Vitest, והפלט מוצג עם רווחים מכווצים. מה שחשוב לדעת:

- **כל pipe מיובא.** ‏Pipes הם קלאסים מ-`@angular/common` שמופיעים ב-`imports` של הקומפוננטה, כמו קומפוננטות. ‏[הרשימה המלאה](https://angular.dev/guide/templates/pipes) כוללת גם `lowercase`, ‏`keyvalue`, ‏`i18nPlural` ועוד.
- **פרמטרים אחרי `:`.** ‏`currency: 'EUR' : 'symbol' : '1.0-0'` הוא מטבע, תצוגה וגודל ספרות (בלי אגורות). ‏`date: 'yyyy-MM-dd' : 'UTC'` הוא תבנית ואזור זמן. השני מבטל תלות באזור הזמן של המחשב, ולכן הפלט למעלה יציב.
- **שרשור משמאל לימין.** ‏`title | uppercase | slice: 0 : 5` הופך לאותיות גדולות ואז חותך את חמש הראשונות.
- **הפורמט תלוי ב-locale.** ברירת המחדל היא `en-US` (`$1,234.50`). שפה אחרת מגדירים דרך ה-locale של האפליקציה, ראו [i18n](he/posts/angular-i18n/).
- **‏`json` לדיבוג.** מדפיס אובייקט כ-JSON. ‏`async` קורא ערך מ-Promise או מ-Observable, ו-`greeting` כאן הוא Promise.

## ‏pipe מותאם

מחלקה עם `@Pipe`, שם, ומתודה `transform`. הפרמטר הראשון הוא הערך, והשאר הם הפרמטרים שאחרי `:`:

```typescript
// custom.ts
import { Component, Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(name: string, max = 2): string {
    return name
      .split(' ')
      .slice(0, max)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }
}

@Pipe({ name: 'join' })
export class JoinPipe implements PipeTransform {
  transform(items: string[]): string {
    return items.join(', ');
  }
}

@Pipe({ name: 'joinImpure', pure: false })
export class JoinImpurePipe implements PipeTransform {
  transform(items: string[]): string {
    return items.join(', ');
  }
}

@Component({
  selector: 'app-custom',
  imports: [InitialsPipe, JoinPipe, JoinImpurePipe],
  template: `
    <p>{{ 'Dana Levi Cohen' | initials }} | {{ 'Dana Levi Cohen' | initials: 3 }}</p>
    <p>{{ names | join }} | {{ names | joinImpure }}</p>
    <button (click)="add()">Add</button>
  `,
})
export class Custom {
  protected readonly names = ['Dana'];

  protected add() {
    this.names.push('Avi');
  }
}
```

השורה הראשונה מציגה `DL | DLC`: ‏`initials` עם ברירת המחדל `max = 2`, ועם `initials: 3`. לפי [מוסכמות השמות בתיעוד](https://angular.dev/guide/templates/pipes), ה-`name` כתוב ב-camelCase בלי מקפים, ושם המחלקה הוא אותו שם ב-PascalCase עם `Pipe` בסוף. ‏`implements PipeTransform` גורם ל-TypeScript לוודא שחתימת `transform` נכונה. אם שוכחים לייבא את ה-pipe, ה-build נכשל:

```text
✘ [ERROR] NG8004: No pipe found with name 'initials'.
```

## ‏pure מול impure

כברירת מחדל כל pipe הוא **pure**: ‏Angular מריץ אותו רק כשהערך שמועבר אליו (או הפרמטרים) מתחלף: ערך פרימיטיבי אחר או הפניה אחרת לאובייקט או למערך. מערך שמוסיפים לו איבר במקום (`push`) הוא אותה הפניה, ולכן ה-pure pipe לא מתעדכן. בבדיקה, אחרי לחיצה על `Add`:

```text
Dana | Dana, Avi
```

‏`join` (pure) עדיין מציג `Dana`, ו-`joinImpure` (עם `pure: false`) מציג `Dana, Avi`. [התיעוד](https://angular.dev/guide/templates/pipes) מזהיר שה-pipe impure עלול לפגוע משמעותית בביצועים, ומציע לתת לו שם שמכיל `Impure`. הפתרון המועדף: ליצור מערך חדש (`this.names = [...this.names, 'Avi']`) ולהישאר עם pipe רגיל.

### בגרסאות קודמות

לפני גרסה 19 pipe לא היה standalone כברירת מחדל, וה-pipe נרשם ב-`declarations` של NgModule, ומי שרצה להשתמש בו ייבא את המודול:

```typescript
@Pipe({ name: 'shout', standalone: false })
class ShoutPipe implements PipeTransform {
  transform(value: string): string {
    return value.toUpperCase() + '!';
  }
}

@Component({ selector: 'app-shout', template: `{{ 'hey' | shout }}`, standalone: false })
class ShoutComponent {}

@NgModule({ declarations: [ShoutPipe, ShoutComponent], exports: [ShoutComponent] })
class ShoutModule {}
```

הקוד הזה עובד גם ב-22.2 (הבדיקה הציגה `HEY!`), אבל היום `standalone: false` צריך להיכתב במפורש. בקוד מגרסאות 14 עד 18 מופיע לפעמים `standalone: true` בכל pipe, וניתן להסיר אותו.

## טעויות נפוצות של מתחילים

- **לשנות מערך במקום ולצפות שה-pipe יתעדכן.** יוצרים מערך חדש במקום `push`, או עוברים ל-signal.
- **להשתמש ב-impure pipe כברירת מחדל.** הוא עלול לפגוע בביצועים. מסננים וממיינים ב-`computed` במחלקה.
- **לצפות לפורמט של ישראל בלי להגדיר locale.** `date` ו-`currency` משתמשים ב-`en-US` אלא אם מגדירים אחרת.

## מה הלאה

בפוסט הבא, האחרון ברמה הזו: הקרנת תוכן עם `<ng-content>`, כדי שקומפוננטה תקבל תוכן מבחוץ.
