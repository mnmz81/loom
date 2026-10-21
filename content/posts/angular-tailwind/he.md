---
title: "‏Tailwind CSS ב-Angular: התקנה, ‏[class] ו-@apply בקומפוננטות"
summary: "‏Tailwind CSS 4 בפרויקט Angular: מה ng add tailwindcss יוצר, מחלקות בתבנית ו-[class] עם signal, ‏@theme לצבעים משלכם, ולמה @apply בקומפוננטה צריך @reference."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 64 }
---

ב-[Tailwind CSS](https://tailwindcss.com) מעצבים עם מחלקות קטנות ישירות ב-HTML (`p-4`, ‏`text-sm`, ‏`bg-green-100`), וה-build מייצר CSS רק למחלקות שבאמת מופיעות בקוד. ה-CLI של Angular מריץ PostCSS, ולכן Tailwind מתחבר אליו בלי builder מיוחד.

כל דוגמה נבדקה עם Angular 22.2 ו-Tailwind CSS 4.3.3: בטסט Vitest, ב-`ng build` ובדפדפן.

## התקנה

[המדריך של Angular](https://angular.dev/guide/tailwind) ממליץ על `ng add`:

```bash
ng add tailwindcss
```

```text
The tailwindcss package does not provide `ng add` actions.
The Angular CLI will use built-in actions to add it to your project.
CREATE .postcssrc.json (53 bytes)
UPDATE src/styles.css (104 bytes)
UPDATE package.json (881 bytes)
✔ Packages installed successfully.
```

ה-CLI מתקין `tailwindcss`, ‏`@tailwindcss/postcss` ו-`postcss`, ויוצר את קובץ ההגדרות של PostCSS בשורש הפרויקט:

```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

ב-`styles.css` נוספה שורת ה-`@import`. כאן הוספתי גם צבע משלי עם `@theme`, וממנו Tailwind מייצר מחלקות כמו `text-brand` ו-`bg-brand`:

```css
@import 'tailwindcss';

@theme {
  --color-brand: oklch(0.55 0.2 260);
}
```

[המדריך של Tailwind](https://tailwindcss.com/docs/installation/framework-guides/angular) מתאר את אותם צעדים ידנית: ‏`npm install`, ‏`.postcssrc.json` וה-`@import`.

## מחלקות בתבנית ו-`[class]`

מחלקות קבועות כותבים ב-`class` רגיל. מחלקות שתלויות במצב מוסיפים עם `[class]`, ו-Angular משלב את השתיים:

```typescript
import { Component, computed, input } from '@angular/core';

type Status = 'done' | 'pending' | 'failed';

const COLORS: Record<Status, string> = {
  done: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
};

@Component({
  selector: 'app-status-badge',
  template: `
    <span class="rounded-full px-3 py-1 text-sm font-medium" [class]="color()">
      {{ status() }}
    </span>
  `,
})
export class StatusBadge {
  readonly status = input.required<Status>();
  protected readonly color = computed(() => COLORS[this.status()]);
}
```

בטסט, עם `status` = `pending` ה-`span` קיבל `rounded-full px-3 py-1 text-sm font-medium bg-amber-100 text-amber-800`, ואחרי מעבר ל-`done` הצבעים התחלפו לירוק והמחלקות הקבועות נשארו.

המפה `COLORS` חשובה: [‏Tailwind סורק את קובצי הפרויקט כטקסט](https://tailwindcss.com/docs/detecting-classes-in-source-files) ומחפש שמות מחלקות שלמים. ‏`'bg-green-100'` מופיע בקוד כמו שהוא, ולכן ה-CSS שלו נוצר. ‏`input` ו-`computed` מוסברים בפוסטים על [inputs](he/posts/angular-inputs/) ו-[signals](he/posts/angular-signals/).

## ‏`@apply` בסגנונות של קומפוננטה

ה-utilities בתבנית הן מחלקות גלובליות מ-`styles.css`, ולכן [view encapsulation](he/posts/angular-styling/) לא משפיע עליהן: הוא מוסיף מאפיין ייחודי רק לסלקטורים שב-`styles` של הקומפוננטה. הבעיה מתחילה כשרוצים `@apply` בתוך `styles`. הסגנונות של כל קומפוננטה עוברים ב-PostCSS בנפרד, בלי ה-`@import 'tailwindcss'` של `styles.css`, וה-build נכשל:

```text
✘ [ERROR] Cannot apply unknown utility class `rounded-lg`. Are you using CSS modules or similar and missing `@reference`?
```

הפתרון הוא [‏`@reference`](https://tailwindcss.com/docs/functions-and-directives) לקובץ הסגנונות הראשי. הוא נותן גישה ל-utilities ול-`@theme` בלי להכניס שוב את כל ה-CSS של Tailwind לקומפוננטה:

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-card',
  template: `<ng-content />`,
  styles: `
    @reference '../styles.css';

    :host {
      @apply block rounded-lg p-4 shadow;
    }
  `,
})
export class Card {}
```

הנתיב יחסי לקובץ של הקומפוננטה (`src/app/card.ts`). אחרי השינוי ה-build עבר, ובדפדפן ל-`app-card` היה `border-radius: 8px` וצל.

### בגרסאות קודמות

ב-Tailwind 3, שמופיע במדריכים ישנים, ההתקנה הייתה שונה: ‏`npx tailwindcss init` יצר `tailwind.config.js` עם רשימת `content` של קבצים לסריקה, ו-`styles.css` התחיל בשלוש הנחיות:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

ב-Tailwind 4 אין צורך ב-`tailwind.config.js`: הסריקה אוטומטית, והתאמות נכתבות ב-CSS עם `@theme`.

## טעויות נפוצות של מתחילים

- **להרכיב שם מחלקה ממחרוזות**, כמו `'bg-' + color() + '-500'`. בדפדפן המחלקה `bg-purple-500` הופיעה על האלמנט, אבל בלי רקע: השם המלא לא כתוב בשום קובץ, ולכן Tailwind לא יצר לו CSS.
- **כמה מחלקות במפתח אחד של אובייקט ב-`[class]`**, כמו `{ 'bg-red-100 text-red-800': on() }`. [התיעוד](https://angular.dev/guide/templates/binding) מגדיר שכל מפתח הוא שם מחלקה אחד; בבדיקה לא נוספה אף מחלקה, בלי שגיאה. משתמשים במחרוזת, במפתח לכל מחלקה, או ב-`ngClass`, שמפצל מפתחות לפי רווחים.
- ‏**`@apply` בלי `@reference`.** שגיאת ה-build למעלה.

## מה הלאה

בפוסט הבא: רינדור בצד השרת (SSR) ו-hydration, ‏`ng add @angular/ssr`, ‏`provideClientHydration` ומה שובר hydration.
