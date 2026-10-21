---
title: "attribute directives ב-Angular: התנהגות לאלמנט קיים"
summary: "איך כותבים attribute directive עם @Directive: ‏bindings ומאזינים דרך host, ‏inputs עם input(), גישה לאלמנט עם ElementRef, ומה היו @HostBinding ו-@HostListener."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 51 }
---

‏directive מוסיף התנהגות לאלמנט שכבר קיים בתבנית, בלי תבנית משלו. קומפוננטה היא בעצם directive עם תבנית. ‏attribute directive משנה את המראה או ההתנהגות של האלמנט שעליו הוא יושב, למשל צבע רקע או פוקוס.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ‏directive ראשון

```typescript
import { Directive, input, signal } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  host: {
    '[style.backgroundColor]': 'hovered() ? color() : null',
    '[class.highlighted]': 'hovered()',
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
  },
})
export class Highlight {
  readonly appHighlight = input('');
  readonly defaultColor = input('yellow');
  protected readonly hovered = signal(false);

  protected color() {
    return this.appHighlight() || this.defaultColor();
  }
}
```

- ‏`selector: '[appHighlight]'` בסוגריים מרובעים תופס כל אלמנט שיש עליו את המאפיין `appHighlight`. בלי הסוגריים הוא היה תופס תגית בשם הזה. הקידומת `app` מונעת התנגשות עם מאפייני HTML.
- ‏`host` מגדיר bindings על האלמנט המארח באותו תחביר של [bindings בתבנית](he/posts/angular-bindings/): ‏`[...]` למאפיין, ל-style או ל-class, ו-`(...)` לאירוע. ה-expression רץ מול מופע ה-directive, ולכן הוא יכול לקרוא ל-`hovered()` ול-`color()`.
- ‏`hovered` הוא [signal](he/posts/angular-signals/), כך ש-Angular יודע לעדכן את הרקע כשהעכבר נכנס ויוצא.

לפי [התיעוד](https://angular.dev/guide/directives/attribute-directives), ‏`ng generate directive highlight` יוצר את הקובץ ואת קובץ הבדיקה שלו.

## ‏inputs ושם ה-selector

```typescript
import { Component } from '@angular/core';
import { Highlight } from './highlight';

@Component({
  selector: 'app-page',
  imports: [Highlight],
  template: `
    <p appHighlight>Yellow on hover</p>
    <p appHighlight="lightblue">Light blue on hover</p>
    <p appHighlight defaultColor="pink">Pink on hover</p>
  `,
})
export class Page {}
```

‏input ששמו כשם ה-selector מפעיל את ה-directive ומעביר לו ערך באותו מאפיין. במאפיין בלי ערך הוא מקבל מחרוזת ריקה, ולכן `color()` נופל ל-`defaultColor`. ערך קבוע לא צריך סוגריים מרובעים; ‏`[appHighlight]="color"` מעביר ערך מהקומפוננטה. ‏inputs של directive עובדים בדיוק כמו [inputs של קומפוננטה](he/posts/angular-inputs/), כולל `input.required` ו-transform.

ה-directive חייב להופיע ב-`imports` של הקומפוננטה שמשתמשת בו, כמו כל קומפוננטה אחרת.

## גישה לאלמנט עם ElementRef

כש-binding לא מספיק, למשל כשצריך לקרוא למתודה של ה-DOM, מזריקים את `ElementRef`:

```typescript
import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

@Directive({ selector: 'input[appAutofocus]' })
export class Autofocus {
  private readonly host = inject<ElementRef<HTMLInputElement>>(ElementRef);

  constructor() {
    afterNextRender(() => this.host.nativeElement.focus());
  }
}
```

‏`input[appAutofocus]` מגביל את ה-directive לאלמנטי `<input>`. ‏[`afterNextRender`](https://angular.dev/api/core/afterNextRender) מריץ את הקוד אחרי שהאלמנט כבר ב-DOM (הוא מוסבר בפוסט על [מחזור החיים](he/posts/angular-lifecycle/)), ובשרת הוא לא רץ בכלל, כך ש-`focus()` לא נקרא כשאין דפדפן. לשינוי style או class עדיף `host`, ולא `nativeElement.style`.

### בגרסאות קודמות

ב-directives ישנים ה-bindings נכתבים בדקורטורים על שדות ומתודות:

```typescript
import { Directive, HostBinding, HostListener, Input } from '@angular/core';

@Directive({ selector: '[appHighlightOld]' })
export class HighlightDirective {
  @Input() appHighlightOld = '';
  @Input() defaultColor = 'yellow';
  private hovered = false;

  @HostBinding('style.backgroundColor')
  get backgroundColor() {
    return this.hovered ? this.appHighlightOld || this.defaultColor : null;
  }

  @HostListener('mouseenter')
  onEnter() {
    this.hovered = true;
  }

  @HostListener('mouseleave')
  onLeave() {
    this.hovered = false;
  }
}
```

הקוד הזה עדיין עובד, אבל [התיעוד](https://angular.dev/guide/components/host-elements) ממליץ תמיד להעדיף את `host`, ואומר שהדקורטורים קיימים רק לתאימות לאחור. ‏`@Input()` הוחלף ב-`input()`, כמו שמוסבר בפוסט על inputs.

## טעויות נפוצות של מתחילים

- **לשכוח את ה-directive ב-`imports`.** מאפיין בלי binding פשוט לא עושה כלום, בלי שום שגיאה. עם binding ה-build נכשל:

```text
✘ [ERROR] NG8002: Can't bind to 'appHighlight' since it isn't a known property of 'p'.
```

- **‏selector בלי סוגריים מרובעים.** ‏`selector: 'appHighlight'` מחפש תגית `<appHighlight>`, ולא מאפיין.
- **לשנות style דרך `nativeElement`.** ‏Angular לא יודע על השינוי, ו-binding ב-`host` או בתבנית יכול לדרוס אותו.

## מה הלאה

בפוסט הבא: structural directives, שיוצרים ומסירים חלקים מהתבנית עם `TemplateRef` ו-`ViewContainerRef`, והרכבת directives עם `hostDirectives`.
