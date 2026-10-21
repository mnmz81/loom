---
title: "שדרוג Angular עם ng update: גרסה ראשית, מיגרציות ו-deprecations"
summary: "שדרוג אמיתי מ-Angular 21 ל-22 עם ng update: מה הפקודה מעדכנת, אילו מיגרציות רצו ומה הן שינו בקוד (ChangeDetectionStrategy.Eager), ה-Update Guide ומדיניות ה-deprecation."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 80 }
---

‏`ng update` מעדכן את חבילות Angular ומריץ סקריפטים שמתאימים את הקוד לגרסה החדשה. הפוסט עוקב אחרי שדרוג אמיתי מגרסה 21 לגרסה 22.

כל דוגמה נבדקה עם Angular 22.2: אפליקציה שנוצרה עם Angular CLI 21.2 ושודרגה ל-22.2.3.

## מה אפשר לעדכן

בלי שמות חבילות, הפקודה רק בודקת ולא משנה דבר:

```bash
ng update
```

```text
    We analyzed your package.json, there are some packages to update:
    
      Name                       Version                  Command to update
     ------------------------------------------------------------------------
      @angular/cli               21.2.27 -> 22.2.3        ng update @angular/cli
      @angular/core              21.2.25 -> 22.2.3        ng update @angular/core
    
    There might be additional packages which don't provide 'ng update' capabilities that are outdated.
```

היא מציגה רק חבילות שתומכות ב-`ng update`, כמו חבילות Angular או Angular Material. את השאר מעדכנים עם מנהל החבילות.

## השדרוג עצמו

[מדיניות הגרסאות](https://angular.dev/reference/releases#breaking-change-policy-and-update-paths) ממליצה לעלות גרסה ראשית אחת בכל פעם: מ-20 ל-22 עוברים דרך 21. מעדכנים את `core` ואת `cli` באותה פקודה:

```bash
ng update @angular/core@22 @angular/cli@22
```

```text
The installed Angular CLI version is outdated.
Installing a temporary Angular CLI versioned 22 to perform the update.
Updating package.json with dependency @angular/core to version 22.2.3...
Updating package.json with dependency typescript to version 6.0.3...
** Executing migrations of package '@angular/core' **

❯ Adds `ChangeDetectionStrategy.Eager` to all components.
UPDATE src/app/app.ts (362 bytes)
  Migration completed (1 file modified).

❯ Disables the 'nullishCoalescingNotNullable & optionalChainNotNullable extended diagnostics.
UPDATE tsconfig.app.json (624 bytes)
  Migration completed (1 file modified).
```

הפלט מקוצר: הושמטו שורות של חבילות נוספות ושש מיגרציות שדיווחו `No changes made`. הסדר הוא:

1. התקנה זמנית של CLI 22, שמבצע את השדרוג.
2. עדכון `package.json` והתקנה. גם TypeScript עלתה מ-5.9 ל-6.0, כי Angular 22 דורש אותה.
3. מיגרציות: סקריפטים שכל חבילה מגדירה למעבר לגרסה שלה, והם עורכים את הקוד.

לפי [התיעוד](https://angular.dev/cli/update), ‏`ng update` לא רץ כשיש ב-git קבצים ששונו ולא נשמרו (‏`--allow-dirty` עוקף את זה), כך שכל השינויים שלו מופיעים ב-diff נקי. ‏`--create-commits` ‏(`-C`) יוצר commit נפרד לכל מיגרציה.

## מה המיגרציה שינתה בקוד

כך נראית קומפוננטת השורש אחרי השדרוג:

```typescript
import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('old21');
}
```

בגרסה 22 ‏[OnPush הפך לברירת המחדל](he/posts/angular-onpush-default-v22/). קומפוננטה בלי `changeDetection` נבדקה בגרסה 21 בכל סבב, והמיגרציה כותבת לה `Eager` במפורש כדי שההתנהגות לא תשתנה. קומפוננטה אחרת בפרויקט, שכבר הייתה עם `ChangeDetectionStrategy.OnPush`, לא נגעה. את `Eager` מסירים אחר כך קומפוננטה אחרי קומפוננטה, כשבודקים שהיא מתעדכנת נכון ([הפוסט על Eager](he/posts/angular-eager-strategy/)).

שינוי שני: ב-`tsconfig.app.json` נוספה הגדרה שמכבה שתי בדיקות מסוג extended diagnostics, `nullishCoalescingNotNullable` ו-`optionalChainNotNullable`. אחרי השדרוג ה-build והבדיקות עברו בלי שינוי נוסף.

מה לא התעדכן: `vitest` ו-`jsdom` נשארו בגרסאות הקודמות, כי אין להן תמיכה ב-`ng update`. פרויקט חדש בגרסה 22 מקבל Vitest 5, והשדרוג השאיר Vitest 4.

## ה-Update Guide ומיגרציות אופציונליות

ב-[Update Guide](https://angular.dev/update-guide) בוחרים גרסת מקור, גרסת יעד ומורכבות האפליקציה, ומקבלים רשימה של צעדים, כולל צעדים ידניים שאין להם מיגרציה. כדאי לעבור עליה לפני השדרוג.

בסוף הריצה ה-CLI מציג מיגרציות שלא רצות לבד:

```text
** Optional migrations of package '@angular/cli' **

This package has 2 optional migrations that can be executed.
❯ Migrate projects using legacy Karma unit-test builder to the new unit-test builder with Vitest.
  ng update @angular/cli --name migrate-karma-to-vitest

❯ Migrate application projects to the new build system.
  ng update @angular/cli --name use-application-builder
```

‏`--name` מריץ מיגרציה אחת לפי שם, ו-`--migrate-only` עם `--from` ו-`--to` מריץ שוב מיגרציות של חבילה בלי לשנות את הגרסה המותקנת.

## ‏deprecations

לפי [מדיניות ה-deprecation](https://angular.dev/reference/releases#deprecation-policy), API שסומן deprecated נשאר לפחות גרסה ראשית אחת, כלומר כ-12 חודשים, והסרה קורית רק בגרסה ראשית. לכן מתקנים אזהרות deprecation בגרסה הנוכחית, לפני השדרוג הבא. קצב הגרסאות וחלונות התמיכה מוסברים ב[פוסט הראשון בסדרה](he/posts/angular-what-is-angular/).

## טעויות נפוצות של מתחילים

- **לקפוץ כמה גרסאות ראשיות בבת אחת.** המיגרציות נכתבו למעבר מגרסה אחת לבאה אחריה.
- **להריץ עם `--allow-dirty` על עבודה שלא נשמרה.** השינויים של המיגרציות מתערבבים בשלכם, וקשה לבדוק מה הן עשו.
- **למחוק את כל ה-`Eager` מיד אחרי השדרוג.** קומפוננטה שמשנה שדות רגילים, בלי signals, עלולה להפסיק להתעדכן על המסך.

## מה הלאה

בפוסט הבא: מעבר מ-NgModule לקומפוננטות standalone עם המיגרציה `ng generate @angular/core:standalone`.
