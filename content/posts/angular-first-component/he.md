---
title: "הקומפוננטה הראשונה: ng generate ו-@Component"
summary: "יוצרים קומפוננטה עם ng generate component, עוברים על המטא-דאטה של @Component (selector, template, styles, imports) ומשתמשים בה בתוך קומפוננטה אחרת."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 4 }
---

אפליקציית Angular היא עץ של קומפוננטות. לכל קומפוננטה יש מחלקה, תבנית HTML ועיצוב, והיא מוצגת בתגית משלה. בפוסט הזה נייצר אחת, נראה מה כל שדה ב-`@Component` עושה, ונשתמש בה בתוך הקומפוננטה הראשית ([מבנה הפרויקט](he/posts/angular-project-structure/)).

כל דוגמה נבדקה עם Angular 22.2 וה-CLI שלו, ורצה בבדיקת Vitest.

## ‏ng generate component

```bash
ng generate component user-card
```

```text
CREATE src/app/user-card/user-card.css (0 bytes)
CREATE src/app/user-card/user-card.spec.ts (547 bytes)
CREATE src/app/user-card/user-card.ts (196 bytes)
CREATE src/app/user-card/user-card.html (24 bytes)
```

הקיצור `ng g c user-card` עושה אותו דבר. ה-CLI יוצר תיקייה עם ארבעה קבצים: קוד, תבנית, עיצוב ובדיקה. זה מה שבתוך `user-card.ts`:

```typescript
import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-user-card',
  styleUrl: './user-card.css',
  templateUrl: './user-card.html',
})
export class UserCard {}
```

שם המחלקה ‏(`UserCard`) וקובץ התבנית נגזרים משם הקומפוננטה שנתנו. ‏`--inline-template` ו-`--inline-style` שמים את התבנית והעיצוב בתוך ה-`.ts` (ובלי קובצי `.html` ו-`.css`), ו-`--skip-tests` מדלג על ה-`spec`. ‏`ng generate component --help` מציג את כל הדגלים.

## המטא-דאטה של @Component

האובייקט שמועבר ל-`@Component` נקרא [מטא-דאטה של הקומפוננטה](https://angular.dev/guide/components). אלה השדות שבו:

- **‏`selector`**: שם התגית שמציגה את הקומפוננטה. ה-CLI מוסיף לו את הקידומת `app-` ([מומלץ](https://angular.dev/guide/components/selectors) קידומת קצרה ועקבית, ו-`ng` שמור ל-Angular עצמו).
- **‏`template` או `templateUrl`**: ה-HTML. ‏`template` מקבל מחרוזת (בדרך כלל template literal עם backticks), ו-`templateUrl` מצביע על קובץ ביחס לתיקיית הקומפוננטה.
- **‏`styles` או `styleUrl`**: אותו דבר לעיצוב. העיצוב חל רק על התבנית של הקומפוננטה הזו; [פוסט העיצוב](he/posts/angular-styling/) מסביר איך.
- **‏`imports`**: הקומפוננטות, ה-directives וה-pipes שהתבנית משתמשת בהם.

בדוגמאות בסדרה נעדיף `template` ו-`styles` בתוך הקובץ, כדי שקומפוננטה תהיה בלוק אחד. התבנית עצמה כוללת [bindings](he/posts/angular-bindings/):

```typescript
// user-card.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-user-card',
  template: `
    <h2>{{ name }}</h2>
    <p>Joined in {{ year }}</p>
  `,
  styles: `
    h2 { color: rebeccapurple; }
  `,
})
export class UserCard {
  protected name = 'Dana';
  protected year = 2024;
}
```

שני השדות הם `protected` כי רק התבנית קוראת אותם. ‏[מדריך הסגנון](https://angular.dev/style-guide) ממליץ על זה, כי מחלקה עם חברים ציבוריים חושפת API שאפשר להגיע אליו דרך dependency injection ו-queries.

## שימוש בקומפוננטה בתוך אחרת

כדי להציג את `UserCard` בקומפוננטה אחרת, מייבאים את המחלקה ושמים אותה ב-`imports`, ואז כותבים את התגית בתבנית:

```typescript
// app.ts
import { Component } from '@angular/core';
import { UserCard } from './user-card';

@Component({
  selector: 'app-root',
  imports: [UserCard],
  template: `
    <h1>Team</h1>
    <app-user-card />
    <app-user-card />
  `,
})
export class App {}
```

כל תגית יוצרת מופע נפרד של הקומפוננטה, והתוצאה בבדיקה: שתי תגיות `app-user-card`, ובכל אחת `<h2>` עם `Dana`. התגית שמתאימה ל-`selector` נקראת ה-host element של הקומפוננטה, והתבנית מתרנדרת בתוכה.

אם שוכחים את `imports`, ה-build נכשל:

```text
✘ [ERROR] NG8001: 'app-user-card' is not a known element:
1. If 'app-user-card' is an Angular component, then verify that it is included in the '@Component.imports' of this component.
```

### בגרסאות קודמות

[עד גרסה 18](https://angular.dev/guide/components) קומפוננטה הייתה לא-standalone כברירת מחדל, ולכן קוד מאותה תקופה כולל אחד משני הדברים. הראשון: ‏`standalone: true` שנכתב במפורש (היום זו ברירת המחדל ואפשר להסיר אותו):

```typescript
@Component({
  selector: 'app-explicit',
  standalone: true,
  template: `<p>explicit</p>`,
})
export class Explicit {}
```

השני: קומפוננטה שרשומה ב-`declarations` של `NgModule`, ושמשתמשים בה דרך ייבוא המודול ולא דרך ייבוא המחלקה:

```typescript
@Component({
  selector: 'app-old-card',
  template: `<p>old card</p>`,
  standalone: false,
})
export class OldCard {}

@NgModule({ declarations: [OldCard], exports: [OldCard] })
export class OldCardModule {}

@Component({
  selector: 'app-old-host',
  imports: [OldCardModule],
  template: `<app-old-card />`,
})
export class OldHost {}
```

‏`standalone: false` נדרש היום בקומפוננטה כזו (ב-Angular 18 ומטה הוא היה ברירת המחדל, ולכן לא נכתב). בקוד ישן גם שמות הקבצים והמחלקות הם `user-card.component.ts` ו-`UserCardComponent`, ו-`ng generate component` יצר אותם כך עד גרסה 19.

## טעויות נפוצות של מתחילים

- **לשכוח `imports`.** השגיאה `NG8001` למעלה כמעט תמיד אומרת שהקומפוננטה לא ברשימת ה-`imports` של הקומפוננטה שמשתמשת בה.
- **לכתוב את שם המחלקה בתבנית.** ה-`selector` הוא `app-user-card`, ולא `<UserCard />`.
- **לשכוח `export` על המחלקה.** בלי `export class` אי אפשר לייבא אותה מקובץ אחר.

## מה הלאה

בפוסט הבא: ה-bindings, הדרך להעביר ערכים מהמחלקה אל התבנית ואירועים בחזרה אליה.
