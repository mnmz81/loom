---
title: "אנימציות ב-Angular: ‏animate.enter ו-animate.leave"
summary: "אנימציות כניסה ויציאה עם animate.enter ו-animate.leave ו-CSS רגיל: ‏keyframes, ‏transitions עם @starting-style, פונקציות עם animationComplete, ולמה @angular/animations מסומן deprecated."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 55 }
---

אלמנט שנכנס או יוצא מהדף בגלל `@if` או `@for` מופיע ונעלם בבת אחת. כדי להנפיש אותו, Angular מוסיף לו מחלקות CSS בזמן הנכון, ובהסרה מחכה שהאנימציה תסתיים לפני שהוא מוחק אותו מה-DOM. ‏`animate.enter` ו-`animate.leave` נוספו בגרסה 20.2, ולפי [התיעוד](https://angular.dev/guide/animations) הם חלק מהקומפיילר ולא directives, כך שאין מה לייבא.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest.

## ‏keyframes בכניסה וביציאה

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-panel',
  template: `
    <button (click)="open.set(!open())">Toggle</button>
    @if (open()) {
      <div class="panel" animate.enter="fade-in" animate.leave="fade-out">Hello</div>
    }
  `,
  styles: `
    .fade-in { animation: fade 300ms ease-out; }
    .fade-out { animation: fade 200ms ease-in reverse; }
    @keyframes fade {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: none; }
    }
  `,
})
export class Panel {
  protected readonly open = signal(false);
}
```

- ‏`animate.enter="fade-in"` מוסיף את המחלקה כשהאלמנט נכנס, ו-Angular מסיר אותה כשהאנימציה מסתיימת.
- ‏`animate.leave="fade-out"` מוסיף את המחלקה כשהאלמנט אמור לצאת, ו-Angular מוחק אותו מה-DOM רק אחרי שהאנימציה הסתיימה. כשיש כמה אנימציות, הוא מחכה לארוכה מביניהן.
- הערך יכול להיות כמה מחלקות מופרדות ברווח או מערך. ‏`[animate.enter]="cls()"` מקבל ביטוי, כולל signal.

## ‏transitions עם @starting-style

ב-transition, המחלקה מתארת את המצב שאליו מגיעים, ו-[`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) מתאר את המצב שממנו מתחילים:

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-toast',
  template: `
    <button (click)="shown.set(!shown())">Toggle</button>
    @if (shown()) {
      <p class="toast" animate.enter="visible">Saved</p>
    }
  `,
  styles: `
    .toast { transition: opacity 300ms, translate 300ms; }
    .toast.visible {
      opacity: 1;
      translate: 0;
      @starting-style {
        opacity: 0;
        translate: 0 1rem;
      }
    }
  `,
})
export class Toast {
  protected readonly shown = signal(false);
}
```

בלי `@starting-style` לדפדפן אין מצב התחלתי, והאלמנט מופיע בלי מעבר.

## אנימציה בקוד עם animationComplete

כשרוצים ספריית אנימציות או את Web Animations API, מחברים פונקציה עם `(animate.leave)`:

```typescript
import { AnimationCallbackEvent, Component, signal } from '@angular/core';

@Component({
  selector: 'app-slide',
  template: `
    <button (click)="shown.set(!shown())">Toggle</button>
    @if (shown()) {
      <p (animate.leave)="slideOut($event)">Bye</p>
    }
  `,
})
export class Slide {
  protected readonly shown = signal(true);

  protected slideOut(event: AnimationCallbackEvent) {
    const animation = event.target.animate(
      [{ transform: 'none' }, { transform: 'translateX(100%)' }],
      { duration: 250 },
    );
    animation.onfinish = () => event.animationComplete();
  }
}
```

‏`event.target` הוא האלמנט. ב-`animate.leave` חייבים לקרוא ל-`animationComplete()` כדי ש-Angular ימחק אותו. מי ששוכח, האלמנט נשאר עוד ארבע שניות, ואז Angular קורא לה בעצמו (הזמן ניתן לשינוי עם `MAX_ANIMATION_TIMEOUT`).

ב-TestBed האנימציות כבויות כברירת מחדל, ולכן בבדיקה האלמנט נמחק מיד. ‏`animationsEnabled: true` ב-`configureTestingModule` מדליק אותן.

### בגרסאות קודמות

לפני 20.2 אנימציות נכתבו עם החבילה `@angular/animations`, ב-DSL של TypeScript:

```typescript
import { Component, signal } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-open-close',
  animations: [
    trigger('openClose', [
      state('open', style({ height: '200px', opacity: 1 })),
      state('closed', style({ height: '100px', opacity: 0.8 })),
      transition('open <=> closed', [animate('300ms ease-in-out')]),
    ]),
  ],
  template: `
    <button (click)="isOpen.set(!isOpen())">Toggle</button>
    <div [@openClose]="isOpen() ? 'open' : 'closed'">The box is {{ isOpen() ? 'open' : 'closed' }}</div>
  `,
})
export class OpenClose {
  protected readonly isOpen = signal(true);
}
```

החבילה צריכה גם `provideAnimationsAsync()` ב-`app.config.ts`. [התיעוד](https://angular.dev/guide/legacy-animations) מסמן אותה כ-deprecated וממליץ על `animate.enter` ו-`animate.leave` לכל קוד חדש. ב-API שלה כתוב שהיא deprecated מ-20.2 ושיש כוונה להסיר אותה בגרסה 23. אי אפשר לערבב את שתי השיטות באותה קומפוננטה, אבל באותה אפליקציה אפשר, כך שמעבירים קומפוננטה אחת בכל פעם.

## טעויות נפוצות של מתחילים

- **‏transition בלי `@starting-style`.** אין ממה לעבור, והאלמנט קופץ.
- **לשכוח `animationComplete()` ב-`(animate.leave)`.** האלמנט נשאר בדף ארבע שניות.
- **להתעלם מהעדפת תנועה מופחתת.** ‏Angular לא מטפל בזה לבד; ‏[`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) ב-CSS מבטל או מקצר את האנימציה למי שביקש.

## מה הלאה

בפוסט הבא: טיפול בשגיאות, עם `ErrorHandler`, ‏`provideBrowserGlobalErrorListeners` והבלוק `@boundary`.
