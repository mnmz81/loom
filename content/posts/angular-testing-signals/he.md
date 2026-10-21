---
title: "בדיקות ל-signals ב-Angular: ‏computed, ‏effect ו-TestBed.tick()"
summary: "איך בודקים signals, ‏computed ו-effects ב-Angular 22: מתי צריך TestBed.tick(), איך שולטים בזמן עם השעון המדומה של Vitest בלי Zone.js, ו-component harness ראשון."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 59 }
---

‏signal ו-`computed` מתעדכנים מיד, ולכן קל לבדוק אותם. ‏effects ורינדור קורים מאוחר יותר, בזמן ש-Angular בוחר, והבדיקה צריכה לדעת איך לחכות להם. הפוסט ממשיך את [בדיקות הקומפוננטות](he/posts/angular-testing-components/) ואת [בדיקות השירותים](he/posts/angular-testing-services/).

כל דוגמה נבדקה עם Angular 22.2, ‏Angular CDK 22.2 ו-Vitest 5.

## ‏computed ו-effect בשירות

```typescript
import { Service, computed, effect, signal } from '@angular/core';

@Service()
export class Preferences {
  readonly fontSize = signal(16);
  readonly lineHeight = computed(() => Math.round(this.fontSize() * 1.5));
  readonly saved: number[] = [];

  constructor() {
    effect(() => this.saved.push(this.fontSize()));
  }
}
```

```typescript
import { TestBed } from '@angular/core/testing';
import { Preferences } from './preferences';

describe('Preferences', () => {
  it('updates computed values right away', () => {
    const prefs = TestBed.inject(Preferences);
    prefs.fontSize.set(20);
    expect(prefs.lineHeight()).toBe(30);
  });

  it('runs the effect on TestBed.tick()', () => {
    const prefs = TestBed.inject(Preferences);
    expect(prefs.saved).toEqual([]);

    TestBed.tick();
    expect(prefs.saved).toEqual([16]);

    prefs.fontSize.set(18);
    prefs.fontSize.set(20);
    TestBed.tick();
    expect(prefs.saved).toEqual([16, 20]);
  });
});
```

- ‏`computed` מחושב ברגע שקוראים אותו, ולכן `lineHeight()` מחזיר 30 מיד אחרי `set`.
- לפי [התיעוד](https://angular.dev/guide/signals/effect), ‏effects תמיד רצים באופן אסינכרוני, כחלק מ-change detection. מיד אחרי `inject` ה-effect עוד לא רץ, ו-`saved` ריק.
- ‏[`TestBed.tick()`](https://angular.dev/api/core/testing/TestBedStatic) מריץ את כל העבודה שממתינה לסנכרון בין המצב למסך, כולל effects. שני `set` לפני `tick` מריצים את ה-effect פעם אחת, עם הערך האחרון. ‏effects מוסברים ב[פוסט משלהם](he/posts/angular-effect/).

## זמן בלי Zone.js: השעון המדומה של Vitest

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-toast',
  template: `
    <button (click)="show()">Save</button>
    @if (visible()) {
      <p role="status">Saved</p>
    }
  `,
})
export class Toast {
  protected readonly visible = signal(false);

  show() {
    this.visible.set(true);
    setTimeout(() => this.visible.set(false), 3000);
  }
}
```

```typescript
import { TestBed } from '@angular/core/testing';
import { Toast } from './toast';

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('hides the message after 3 seconds', async () => {
    const fixture = TestBed.createComponent(Toast);
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector('button')!.click();
    TestBed.tick();
    expect(el.querySelector('[role=status]')).not.toBeNull();

    await vi.advanceTimersByTimeAsync(2999);
    TestBed.tick();
    expect(el.querySelector('[role=status]')).not.toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    TestBed.tick();
    expect(el.querySelector('[role=status]')).toBeNull();
  });
});
```

- ‏`vi.useFakeTimers()` מחליף את `setTimeout` בשעון ש-Vitest שולט בו, ו-`advanceTimersByTimeAsync` מזיז אותו קדימה. הבדיקה רצה מיד, בלי לחכות שלוש שניות באמת.
- ‏`TestBed.tick()` מעדכן את ה-DOM באופן סינכרוני. גם Angular מתזמן את הרינדור עם טיימרים, ולכן עם שעון מדומה `await fixture.whenStable()` לא מסתיים לבד: אצלי הבדיקה נתקעה עד ה-timeout של 5 שניות.
- אחרי הבדיקה `vi.useRealTimers()` מחזיר את השעון האמיתי לבדיקות הבאות.

## ‏component harness

‏harness הוא מחלקה שמתארת איך משתמשים בקומפוננטה, כך שהבדיקות לא תלויות במבנה ה-HTML שלה. הוא מגיע מ-`@angular/cdk/testing` (‏CDK מקבל [פוסט משלו](he/posts/angular-cdk/)). כאן harness ל-`Rating` מ[הפוסט על בדיקות קומפוננטות](he/posts/angular-testing-components/):

```typescript
import { ComponentHarness } from '@angular/cdk/testing';

export class RatingHarness extends ComponentHarness {
  static hostSelector = 'app-rating';
  private readonly label = this.locatorFor('p');
  private readonly upButton = this.locatorFor('button');

  async getText() {
    return (await this.label()).text();
  }

  async rateUp() {
    await (await this.upButton()).click();
  }
}
```

```typescript
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Rating } from './rating';
import { RatingHarness } from './rating.harness';

@Component({
  imports: [Rating],
  template: `<app-rating label="Speed" [value]="value()" (rated)="value.set($event)" />`,
})
class Host {
  readonly value = signal(2);
}

it('rates up through the harness', async () => {
  const fixture = TestBed.createComponent(Host);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const rating = await loader.getHarness(RatingHarness);

  expect(await rating.getText()).toBe('Speed: 2/5');
  await rating.rateUp();
  expect(await rating.getText()).toBe('Speed: 3/5');
});
```

- ‏`hostSelector` מוצא את הקומפוננטה, ו-`locatorFor` מחזיר פונקציה שמוצאת אלמנט בתוכה. ‏[התיעוד](https://angular.dev/guide/testing/creating-component-harnesses) מדגיש שהיא לא מוצאת אותו מיד.
- כל מתודה של harness אסינכרונית, וה-harness מחכה ש-Angular יסיים לעדכן את ה-DOM לפני ואחרי כל פעולה. לכן אין כאן `whenStable` בכלל.
- אם מבנה ה-HTML של `Rating` ישתנה, מתקנים רק את ה-harness. ל-Angular Material יש harness לכל קומפוננטה.

### בגרסאות קודמות

בבדיקות ישנות מופיע `TestBed.flushEffects()`:

```typescript
import { TestBed } from '@angular/core/testing';
import { Preferences } from './preferences';

it('runs the effect (old API)', () => {
  const prefs = TestBed.inject(Preferences);
  TestBed.flushEffects();
  expect(prefs.saved).toEqual([16]);
});
```

הוא עדיין עובד ב-22.2, אבל מסומן כ-deprecated, וה-API אומר להשתמש ב-`TestBed.tick()` במקומו. בבדיקות שנכתבו עם Zone.js מופיעים גם `fakeAsync` ו-`tick()` מ-`@angular/core/testing` (פונקציה, לא `TestBed.tick`), שתפקידם עבר לשעון המדומה של Vitest.

## טעויות נפוצות של מתחילים

- **לבדוק effect בלי `TestBed.tick()`.** הבדיקה רצה לפני ה-effect ורואה את המצב הקודם.
- **‏`await fixture.whenStable()` עם `vi.useFakeTimers()`.** הבדיקה נתקעת עד ה-timeout; עם שעון מדומה מעדכנים את ה-DOM ב-`TestBed.tick()`.
- **לשכוח `vi.useRealTimers()`.** השעון המדומה נשאר לבדיקות הבאות ומשבש אותן.

## מה הלאה

בפוסט הבא: בדיקות end-to-end עם Playwright, שמריצות את האפליקציה בדפדפן אמיתי.
