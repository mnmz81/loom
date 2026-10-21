---
title: "‏Incremental hydration ב-Angular: ‏@defer עם hydrate on ו-hydrate never"
summary: "‏Incremental hydration מאפשר ל-Angular לטעון ולחבר חלקים בעמוד רק כשצריך: טריגרים של hydrate on, ‏hydrate never לתוכן סטטי, ובמה זה שונה מ-@defer רגיל. פעיל כברירת מחדל ב-v22."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 66 }
---

אחרי [SSR ו-hydration](he/posts/angular-ssr-hydration/), הדפדפן עדיין מוריד ומריץ את הקוד של כל הקומפוננטות בעמוד כדי לחבר אותן. ב-[incremental hydration](https://angular.dev/guide/incremental-hydration) אתם מחליטים אילו חלקים נשארים "יבשים" (HTML בלי קוד) עד שמשהו מצדיק להפעיל אותם.

כל דוגמה נבדקה עם Angular 22.2: ‏`ng build`, שרת Node ו-`curl`, ודפדפן אמיתי.

## הפעלה

ב-Angular 22 אין מה להפעיל: ‏[`provideClientHydration()`](https://angular.dev/api/platform-browser/provideClientHydration) כבר כולל incremental hydration, ואיתו event replay. כדי לכבות אותו יש `withNoIncrementalHydration()`.

## ‏`hydrate on` ו-`hydrate never`

הכלי הוא `@defer` ([פוסט 54](he/posts/angular-defer/)) עם טריגר `hydrate`. בעמוד הזה, התגובות מתחברות רק כשהמשתמש נוגע בהן, והפוטר לעולם לא:

```typescript
import { Component } from '@angular/core';
import { Comments } from './comments';
import { FooterLinks } from './footer-links';

@Component({
  selector: 'app-article',
  imports: [Comments, FooterLinks],
  template: `
    <h1>Incremental hydration</h1>
    @defer (on viewport; hydrate on interaction) {
      <app-comments />
    } @placeholder {
      <p>Comments are loading…</p>
    }
    @defer (hydrate never) {
      <app-footer-links />
    } @placeholder {
      <footer>…</footer>
    }
  `,
})
export class Article {}
```

השרת מרנדר את התוכן האמיתי של שני הבלוקים, לא את ה-`@placeholder`, והדפדפן מקבל HTML מלא:

```text
<app-comments jsaction="click:;keydown:;" ngb="d0" ngh="0">
<h2>Comments (2)</h2>
<button type="button" jsaction="click:;" ngb="d0">Like (0)</button>
</app-comments>
...
<app-footer-links>
<footer><a href="/about">About</a> · <a href="/privacy">Privacy</a></footer>
</app-footer-links>
```

בדפדפן, אחרי טעינת העמוד לא נטען אף chunk של הקומפוננטות. לחיצה על "Like" טענה את ה-chunk של `comments`, חיברה את הקומפוננטה, וה-click שנתפס הופעל: הכפתור הראה `Like (1)`. ה-chunk של `footer-links` לא נטען בכלל, וגם הקישורים בו ממשיכים לעבוד כקישורים רגילים, כי הם HTML.

מה כל אחד עושה:

- ‏**`hydrate on <trigger>`**: הטריגרים הם `idle`, ‏`viewport`, ‏`interaction` (קליק או מקש), ‏`hover`, ‏`immediate` ו-`timer(500ms)`. אפשר כמה, מופרדים ב-`;`, והראשון שקורה מפעיל.
- ‏**`hydrate when <condition>`**: מפעיל כשהתנאי נהיה אמת. הוא עובד רק לבלוק ה-`@defer` העליון שעוד יבש, כי התנאי מוגדר בקומפוננטת האב.
- ‏**`hydrate never`**: הבלוק נשאר HTML סטטי, כולל כל מה שמקונן בתוכו. מתאים לתוכן שלא צריך אינטראקציה.

## במה זה שונה מ-`@defer` רגיל

בלי `hydrate`, בלוק `@defer` שעבר SSR מרנדר בשרת את ה-`@placeholder`. בדפדפן ה-placeholder מוחלף בתוכן כשהטריגר מתקיים, וזה גורם לקפיצה בעמוד. הרצתי את אותה דוגמה עם `@defer (on viewport)` בלבד, והשרת החזיר `<p>Comments are loading…</p>`.

עם `hydrate`, התוכן האמיתי מגיע מהשרת, ולכן אפשר לשים `@defer` גם מעל קו הגלילה בלי layout shift. טריגרי `hydrate` חלים רק על הטעינה הראשונה של עמוד שרונדר בשרת. כשמנווטים אליו בדפדפן (בלי SSR), נשארים הטריגרים הרגילים (`on viewport` בדוגמה), ולכן `@placeholder` עדיין נדרש. בבלוקים מקוננים, ‏Angular מחבר קודם את האב ואז את הבן.

### בגרסאות קודמות

ב-Angular 19 התכונה יצאה כ-developer preview, ביציבה מגרסה 20, ובשתיהן צריך היה להפעיל אותה במפורש, יחד עם event replay:

```typescript
provideClientHydration(withIncrementalHydration(), withEventReplay());
```

מגרסה 22 `withIncrementalHydration()` מסומן deprecated כי היא ברירת המחדל, ומתוכנן להסיר אותו בגרסה 24. ‏`withEventReplay()` מיותר איתה.

## טעויות נפוצות של מתחילים

- **להשתמש ב-`hydrate` בלי SSR.** הטריגרים משפיעים רק על עמוד שרונדר בשרת. בלי `ng add @angular/ssr` הם לא עושים כלום.
- **להסיר את `@placeholder`.** הוא לא משמש ב-SSR, אבל הוא מוצג כשנכנסים לעמוד בניווט בדפדפן.
- ‏**`hydrate never` על בלוק שיש בו אינטראקציה.** לפי התיעוד, גם כל מה שמקונן בו נשאר יבש, ואף טריגר `hydrate` אחר בתוכו לא יופעל.

## מה הלאה

בפוסט הבא: יצירת אתר סטטי, ‏SSG ו-prerendering, ‏HTML שנבנה מראש ללא שרת.
