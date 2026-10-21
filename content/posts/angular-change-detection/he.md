---
title: "change detection ב-Angular: איך המסך יודע להתעדכן"
summary: "מה זה change detection: עץ הקומפוננטות, בדיקת bindings, סימון view כמלוכלך, ומה מתזמן בדיקה ב-Angular 22: signals, אירועים בתבנית, ‏markForCheck, ‏AsyncPipe ו-setInput."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 20 }
---

התבנית מציגה נתונים מהמחלקה של הקומפוננטה. כשהנתונים משתנים, מישהו צריך לעדכן את ה-DOM. ב-Angular התהליך הזה נקרא change detection, ובתיעוד הוא מוגדר כ["התהליך שבו Angular בודק אם מצב האפליקציה השתנה, ואם צריך לעדכן DOM כלשהו"](https://angular.dev/best-practices/runtime-performance).

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest 5.

## עץ הקומפוננטות

אפליקציה היא עץ של קומפוננטות, וכל קומפוננטה מחזיקה view: ה-DOM של התבנית שלה וה-bindings שבה (`{{ }}`, ‏`[prop]`). זה העץ שהתיעוד משתמש בו כדוגמה:

```text
AppComponent
├── HeaderComponent
│   └── SearchComponent
└── MainComponent
    ├── LoginComponent
    └── DetailsComponent
```

בדיקה עוברת על העץ מהשורש כלפי מטה. בכל view שהיא נכנסת אליו, ‏Angular מחשב מחדש כל binding ומשווה לערך הקודם, ונוגע ב-DOM רק איפה שהערך השתנה. אילו views נכנסים לבדיקה תלוי באסטרטגיה של כל קומפוננטה, ‏[OnPush](he/posts/angular-onpush/) או [Eager](he/posts/angular-eager-strategy/).

## בדיקה רצה רק אחרי הודעה

ב-Angular 22 אין בדיקות "ליתר ביטחון". בדיקה מתוזמנת רק כשמשהו מודיע ל-Angular שמצב השתנה:

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-score',
  template: `<p>{{ label }}: {{ score() }}</p>`,
})
export class Score {
  label = 'Score';
  readonly score = signal(0);
}
```

הטסט משנה קודם את השדה הרגיל, ואחר כך את ה-signal:

```typescript
import { TestBed } from '@angular/core/testing';
import { Score } from './score';

it('renders only after a notification', async () => {
  const fixture = TestBed.createComponent(Score);
  await fixture.whenStable();
  const text = () => fixture.nativeElement.textContent;
  console.log('1.', text());

  fixture.componentInstance.label = 'Points';
  await fixture.whenStable();
  console.log('2.', text());

  fixture.componentInstance.score.set(5);
  await fixture.whenStable();
  console.log('3.', text());
  expect(text()).toBe('Points: 5');
});
```

```text
1. Score: 0
2. Score: 0
3. Points: 5
```

בשלב 2 ‏`label` השתנה, אבל אף אחד לא הודיע על כך ולכן לא רצה בדיקה. בשלב 3 ‏`score.set` סימן את ה-view כמלוכלך ותזמן בדיקה. הבדיקה חישבה מחדש את **כל** ה-bindings של ה-view, ולכן גם `Points` הופיע. ההודעה קובעת מתי בודקים ואיזה view, והבדיקה עצמה קוראת את הערכים העדכניים.

## מה מתזמן בדיקה

לפי [מדריך ה-zoneless](https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility), אלה ההודעות ש-Angular מקשיב להן:

| הודעה | דוגמה |
|---|---|
| ‏signal שהתבנית קוראת השתנה | ‏`score.set(5)` |
| ‏listener בתבנית או ב-host הופעל | ‏`(click)="save()"` |
| ‏`ChangeDetectorRef.markForCheck()` | אחרי שינוי ידני של שדה רגיל |
| ‏`AsyncPipe` | ‏`{{ user$ \| ‏async }}` קורא ל-`markForCheck` בעצמו |
| ‏`ComponentRef.setInput()` | קומפוננטה שנוצרה בקוד |
| חיבור view שסומן כמלוכלך באחת הדרכים האלה | |

כל אחת מהן מסמנת view כ"מלוכלך" (dirty), כלומר צריך לרנדר אותו מחדש. ‏[`markForCheck`](https://angular.dev/api/core/ChangeDetectorRef) עושה את זה במפורש, ושאר ההודעות עושות את זה בשבילכם. ‏signals מוסברים ב[פוסט על signals](he/posts/angular-signals/).

### בגרסאות קודמות

לפני גרסה 21, ‏Zone.js תזמן את הבדיקות: אחרי כל אירוע אסינכרוני (לחיצה, ‏`setTimeout`, תשובת HTTP) Angular בדק את העץ מהשורש, גם אם שום דבר לא השתנה. בקומפוננטה עם האסטרטגיה הישנה, השינוי של `label` בשלב 2 היה מופיע באירוע האסינכרוני הבא, בלי שום הודעה. איך זה עבד מוסבר [בפוסט הבא](he/posts/angular-zone-js/).

## טעויות נפוצות של מתחילים

- ‏**לשנות שדה רגיל בתוך `setTimeout` או `subscribe` ולצפות שהמסך יתעדכן.** אין הודעה, אין בדיקה. ‏signal פותר את זה.
- ‏**לחשוב שבדיקה מרנדרת את כל העמוד.** היא מחשבת bindings, אבל נוגעת ב-DOM רק איפה שערך השתנה.
- ‏**לקרוא ל-`fixture.detectChanges()` בכל טסט.** הוא מריץ בדיקה גם כש-Angular לא היה מתזמן אחת, ומסתיר הודעה שחסרה. ‏[התיעוד](https://angular.dev/guide/zoneless#using-zoneless-in-testbed) ממליץ על `await fixture.whenStable()`.

## מה הלאה

בפוסט הבא: ‏Zone.js, הדרך שבה אפליקציות Angular ידעו שמשהו השתנה לפני zoneless, ואיך אפליקציות קיימות עדיין עובדות איתו.
