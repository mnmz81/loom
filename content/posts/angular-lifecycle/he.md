---
title: "מחזור החיים של קומפוננטה ב-Angular: ‏ngOnInit, ‏DestroyRef ו-afterNextRender"
summary: "מה קורה מהיצירה של קומפוננטה ועד שהיא נהרסת: בנאי מול ngOnInit, ניקוי עם DestroyRef, עבודה עם ה-DOM ב-afterNextRender ו-afterEveryRender, ומתי עדיין צריך ngOnChanges."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 18 }
---

‏[מחזור החיים](https://angular.dev/guide/components/lifecycle) של קומפוננטה הוא רצף השלבים מהיצירה שלה ועד שהיא נהרסת. ‏Angular מאפשר להריץ קוד בכל שלב, דרך מתודות במחלקה (`ngOnInit`, ‏`ngOnDestroy`) או דרך פונקציות כמו `afterNextRender`. עם signals צריך פחות מהן: ‏[`computed`](he/posts/angular-signals/) ו-[`effect`](he/posts/angular-effect/) מגיבים לשינויים בלי hook.

כל דוגמה נבדקה עם Angular 22.2.

## הבנאי מול ngOnInit

```typescript
import { Component, OnInit, input } from '@angular/core';

@Component({
  selector: 'app-greeting',
  template: `<p>Hello {{ name() }}</p>`,
})
export class Greeting implements OnInit {
  readonly name = input.required<string>();

  constructor() {
    console.log(this.name()); // build error: the input has no value yet
  }

  ngOnInit() {
    console.log(`Init with ${this.name()}`);
  }
}
```

```text
✘ [ERROR] NG8118: `name` is a required `input` and does not have a value in this context.
```

הבנאי רץ כש-Angular יוצר את המופע, לפני שההורה העביר inputs, ו-Angular 22 מזהה ב-build קריאה של input חובה בבנאי. ‏`ngOnInit` רץ פעם אחת, [אחרי שכל ה-inputs קיבלו ערך התחלתי](https://angular.dev/guide/components/lifecycle#ngoninit) ולפני שהתבנית של הקומפוננטה נבנית. בלי השורה שבבנאי, `<app-greeting name="Dana" />` מדפיס `Init with Dana`.

החלוקה המקובלת: בבנאי ובאתחול שדות קוראים ל-`inject` ויוצרים signals ו-effects, וב-`ngOnInit` שמים קוד חד-פעמי שצריך את הערכים ההתחלתיים של ה-inputs. ערך שצריך להתעדכן כשה-input משתנה שייך ל-`computed`, לא ל-`ngOnInit`.

## ניקוי: ‏ngOnDestroy או DestroyRef

```typescript
import { Component, DestroyRef, inject, signal } from '@angular/core';

@Component({
  selector: 'app-clock',
  template: `<time>{{ now().toLocaleTimeString() }}</time>`,
})
export class Clock {
  protected readonly now = signal(new Date());

  constructor() {
    const id = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}
```

‏Angular הורס קומפוננטה כשהיא יוצאת מהמסך, למשל כש-`@if` נהיה שקרי או במעבר לעמוד אחר. ‏`ngOnDestroy` רץ באותו רגע, אבל [`DestroyRef`](https://angular.dev/guide/components/lifecycle#destroyref) מאפשר לרשום את הניקוי ליד הקוד שצריך אותו: הטיימר והביטול שלו באותן שתי שורות. בבדיקה, `clearInterval` נקרא עם המזהה של הטיימר רק כשהקומפוננטה נהרסה. אפשר גם להעביר `DestroyRef` לפונקציה מחוץ לקומפוננטה, והמאפיין `destroyed` אומר אם המופע כבר נהרס.

## אחרי הרינדור: ‏afterNextRender ו-afterEveryRender

```typescript
import { Component, ElementRef, afterEveryRender, afterNextRender, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-chat-log',
  template: `
    <ul #list>
      @for (message of messages(); track $index) {
        <li>{{ message }}</li>
      }
    </ul>
  `,
})
export class ChatLog {
  readonly messages = signal<string[]>(['Hi']);
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  constructor() {
    afterNextRender(() => console.log('first render done'));
    afterEveryRender({
      write: () => {
        const list = this.list().nativeElement;
        list.scrollTop = list.scrollHeight;
        return list.childElementCount;
      },
      read: (count) => console.log(`rendered ${count} messages`),
    });
  }
}
```

אחרי הרינדור הראשון והוספה של הודעה אחת:

```text
first render done
rendered 1 messages
rendered 2 messages
```

‏[`afterNextRender`](https://angular.dev/guide/components/lifecycle#aftereveryrender-and-afternextrender) רץ פעם אחת אחרי ש-Angular סיים לרנדר את כל הקומפוננטות ל-DOM, ו-`afterEveryRender` רץ אחרי כל רינדור. אלה פונקציות ולא מתודות, צריך לקרוא להן ב-injection context (בדרך כלל בבנאי), והן לא רצות ב-SSR או ב-prerender. החלוקה לשלבים מונעת layout thrashing: ‏`write` כותב ל-DOM (כאן גלילה לסוף הרשימה), ‏`read` קורא ממנו, ומה ש-`write` מחזיר מגיע ל-`read`. יש גם `earlyRead` ו-`mixedReadWrite`, שהוא ברירת המחדל כשמעבירים פונקציה בלי שלבים.

## מתי עדיין צריך ngOnChanges

```typescript
import { Component, OnChanges, SimpleChanges, input } from '@angular/core';

@Component({
  selector: 'app-price-tag',
  template: `<span>{{ price() }}</span>`,
})
export class PriceTag implements OnChanges {
  readonly price = input(0);
  readonly currency = input('ILS');

  ngOnChanges(changes: SimpleChanges<PriceTag>) {
    if (changes.price && !changes.price.firstChange) {
      console.log(`price: ${changes.price.previousValue} -> ${changes.price.currentValue}`);
    }
  }
}
```

‏[`ngOnChanges`](https://angular.dev/guide/components/lifecycle#ngonchanges) רץ אחרי כל שינוי ב-inputs, ובפעם הראשונה לפני `ngOnInit`. הוא מקבל `SimpleChanges` עם `previousValue`, ‏`currentValue` ו-`firstChange` לכל input שהשתנה. ‏`SimpleChanges<PriceTag>` נותן טיפוסים לפי ה-inputs של המחלקה, ולכן `changes.price` עובר בדיקה. כשההורה שינה את המחיר מ-10 ל-12 הודפס `price: 10 -> 12`. עם signal inputs הוא נחוץ פחות: ערך נגזר הוא `computed`, וערך קודם יש ב-[`linkedSignal`](he/posts/angular-linked-signal/). הוא נשאר שימושי כשרוצים במקום אחד את כל ה-inputs שהשתנו ואת הערכים הקודמים שלהם.

### בגרסאות קודמות

לפני signals, הקוד של קומפוננטה התפזר על כל ה-hooks. הם עדיין קיימים, לפי הסדר [שבתיעוד](https://angular.dev/guide/components/lifecycle#execution-order):

| Hook | מתי |
|---|---|
| `ngOnChanges` | לפני `ngOnInit` ובכל שינוי ב-inputs |
| `ngOnInit` | פעם אחת, אחרי ה-inputs הראשונים |
| `ngDoCheck` | בכל בדיקה של הקומפוננטה |
| `ngAfterContentInit` / `ngAfterContentChecked` | אחרי שהתוכן המוקרן אותחל / נבדק |
| `ngAfterViewInit` / `ngAfterViewChecked` | אחרי שהתבנית אותחלה / נבדקה |
| `ngOnDestroy` | פעם אחת, לפני ההריסה |

‏`ngAfterViewInit` היה המקום לקרוא `@ViewChild` (ראו [queries](he/posts/angular-queries/)), והיום query הוא signal. ‏`DestroyRef` נוסף בגרסה 16, ולפניו ניקוי היה רק ב-`ngOnDestroy`. ‏`afterEveryRender` נקרא `afterRender` עד גרסה 20, שבה [שונה שמו והוא הוכרז כיציב](https://github.com/angular/angular/blob/main/CHANGELOG.md). ב-Angular 22 אין יותר `afterRender`, ובקוד ישן מחליפים אותו ב-`afterEveryRender`.

## טעויות נפוצות של מתחילים

- **לקרוא inputs בבנאי.** הם עוד לא הגיעו. משתמשים ב-`computed` או ב-`ngOnInit`.
- **לשנות state ב-`ngAfterViewInit`.** [לפי התיעוד](https://angular.dev/guide/components/lifecycle#ngafterviewinit) זה גורם ל-`ExpressionChangedAfterItHasBeenCheckedError`.
- **לשכוח לנקות.** ‏`setInterval` או `addEventListener` ידניים ממשיכים לרוץ אחרי שהקומפוננטה נהרסה, אלא אם רושמים ביטול ב-`DestroyRef`.

## מה הלאה

בפוסט הבא: איך כל החלקים של הרמה הזו מתחברים, ומתי משתמשים ב-input, ‏output, ‏model או שירות משותף כדי להעביר מידע בין קומפוננטות.
