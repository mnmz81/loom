---
title: "@defer ב-Angular: לטעון חלק מהתבנית רק כשצריך"
summary: "איך @defer מעביר קומפוננטות ל-chunk נפרד: ‏@placeholder, ‏@loading ו-@error, ה-triggers ‏on viewport, ‏on idle, ‏on interaction, ‏on hover, ‏on timer ו-when, ‏prefetch, ובדיקה עם DeferBlockBehavior."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 54 }
---

‏`@defer` עוטף חלק מהתבנית ש-Angular טוען רק כשמתקיים תנאי: כשהחלק נגלל לתצוגה, כשהדפדפן פנוי או אחרי לחיצה. הקומפוננטות שבתוכו עוברות ל-chunk נפרד, כך שה-bundle הראשוני קטן יותר. הבלוק קיים מגרסה 17, ובניגוד ל-`import()` מ[הפוסט הקודם](he/posts/angular-dynamic-components/) הוא לא דורש קוד.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## בלוק @defer ראשון

```typescript
import { Component } from '@angular/core';
import { Comments } from './comments';

@Component({
  selector: 'app-article',
  imports: [Comments],
  template: `
    <article>Long article text…</article>
    @defer (on viewport) {
      <app-comments />
    } @placeholder {
      <p>Comments</p>
    } @loading (after 100ms; minimum 500ms) {
      <p>Loading comments…</p>
    } @error {
      <p>Couldn't load comments.</p>
    }
  `,
})
export class Article {}
```

‏`ng build` מוציא את `Comments` ל-chunk משלו:

```text
Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-V3HDUI2H.js   | comments      | 302 bytes |               302 bytes
```

לפי [התיעוד](https://angular.dev/guide/templates/defer):

- ‏`@placeholder` מוצג עד שה-trigger מופעל. ‏`on viewport` עוקב אחרי ה-placeholder, ולכן צריך להיות לו אלמנט שורש אחד.
- ‏`@loading` מחליף את ה-placeholder בזמן הטעינה. ‏`after 100ms` מציג אותו רק אם הטעינה לוקחת יותר מ-100ms, ו-`minimum 500ms` משאיר אותו לפחות חצי שנייה, כדי שלא יהבהב.
- ‏`@error` מוצג אם הטעינה נכשלה.

שלושת הבלוקים אופציונליים, והתלויות שלהם נטענות מיד, לא בעצלות.

## ‏triggers

| trigger | מתי הבלוק נטען |
|---|---|
| `on idle` | כשהדפדפן פנוי (`requestIdleCallback`). ברירת המחדל כשלא כותבים trigger |
| `on viewport` | כשהאלמנט נכנס לתצוגה (`IntersectionObserver`) |
| `on interaction` | בלחיצה או בהקשה על מקש |
| `on hover` | במעבר עכבר או בפוקוס |
| `on immediate` | מיד אחרי שהתוכן שלא נדחה מרונדר |
| `on timer(5s)` | אחרי זמן קבוע |
| `when cond` | כשהביטוי נהיה truthy, פעם אחת בלבד |

```typescript
import { Component, signal } from '@angular/core';
import { Comments } from './comments';

@Component({
  selector: 'app-triggers',
  imports: [Comments],
  template: `
    <button #more>More</button>
    @defer (on interaction(more); on timer(5s)) {
      <app-comments />
    }

    <label><input type="checkbox" (change)="ready.set(true)" /> Show</label>
    @defer (when ready()) {
      <app-comments />
    }

    @defer (on interaction; prefetch on idle) {
      <app-comments />
    } @placeholder {
      <button>Load comments</button>
    }
  `,
})
export class Triggers {
  protected readonly ready = signal(false);
}
```

- כמה triggers מופרדים ב-`;` מתנהגים כמו "או": הבלוק הראשון נטען בלחיצה על `#more` או אחרי חמש שניות, מה שקורה קודם.
- ‏`interaction`, ‏`hover` ו-`viewport` מקבלים template reference כמו `(more)`. בלי reference הם עוקבים אחרי ה-placeholder.
- ‏`prefetch on idle` מוריד את ה-JavaScript כשהדפדפן פנוי, אבל מציג את התוכן רק בלחיצה. כך הלחיצה לא מחכה לרשת.

## מתי @defer לא דוחה כלום

התיעוד מציב שני תנאים: הקומפוננטה צריכה להיות standalone, ואסור שתופיע באותו קובץ מחוץ לבלוקי `@defer` (גם לא ב-`viewChild`). כשהוספתי `<app-comments />` מחוץ לבלוק ב-`Article`, ה-build עבר בלי שום אזהרה, אבל שורת ה-`Lazy chunk files` נעלמה: ‏`Comments` חזר ל-bundle הראשי.

גם `ng serve` עם HMR טוען את כל ה-chunks מיד ומתעלם מה-triggers. כדי לראות את ההתנהגות האמיתית מריצים `ng serve --no-hmr`.

## בדיקת המצבים

‏`DeferBlockBehavior.Manual` נותן לבדיקה להעביר את הבלוק בין המצבים בעצמה:

```typescript
import { TestBed } from '@angular/core/testing';
import { DeferBlockBehavior, DeferBlockState } from '@angular/core/testing';
import { Article } from './article';

it('shows each defer state', async () => {
  TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual });
  const fixture = TestBed.createComponent(Article);
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).toContain('Comments');

  const [block] = await fixture.getDeferBlocks();
  await block.render(DeferBlockState.Loading);
  expect(fixture.nativeElement.textContent).toContain('Loading comments…');
  await block.render(DeferBlockState.Complete);
  expect(fixture.nativeElement.textContent).toContain('42 comments');
});
```

בדיקות קומפוננטות מוסברות לעומק בהמשך הרמה.

## טעויות נפוצות של מתחילים

- **להשתמש בקומפוננטה גם מחוץ לבלוק באותו קובץ.** היא נטענת מיד, בלי שגיאה ובלי אזהרה. בודקים ב-`ng build` שה-chunk קיים.
- **לדחות תוכן שבראש העמוד.** התיעוד ממליץ לא לדחות את מה שנראה מיד בטעינה, כדי למנוע קפיצות ב-layout.
- **לייבא דרך קובץ `index.ts`.** ‏barrel file יכול להשאיר את הקומפוננטה ב-bundle הראשי; מייבאים ישירות מהקובץ שלה.

## מה הלאה

בפוסט הבא: אנימציות עם `animate.enter` ו-`animate.leave`, ומה קרה לחבילה `@angular/animations`.
