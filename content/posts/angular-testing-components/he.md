---
title: "בדיקות לקומפוננטות ב-Angular עם TestBed ו-Vitest"
summary: "איך בודקים קומפוננטה ב-Angular 22: ‏TestBed.createComponent, ‏await fixture.whenStable() בלי Zone.js, חיפוש ב-DOM, לחיצות, inputs עם setInput או inputBinding, ו-outputs עם outputBinding."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 57 }
---

בדיקת קומפוננטה יוצרת אותה בזיכרון, מרנדרת אותה ל-DOM מדומה, ובודקת מה מוצג ומה קורה בלחיצה. פרויקט חדש מגיע עם [Vitest ו-jsdom](https://angular.dev/guide/testing), ו-`ng test` בונה את הבדיקות ומריץ אותן. ‏jsdom מדמה DOM בתוך Node.js, כך שלא נפתח דפדפן.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest 5.

## בדיקה ראשונה

המונה מ[הפוסט הראשון](he/posts/angular-what-is-angular/) והבדיקה שלו:

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <button (click)="count.set(count() + 1)">+1</button>
    <p>Clicked {{ count() }} times</p>
  `,
})
export class Counter {
  protected readonly count = signal(0);
}
```

```typescript
import { TestBed } from '@angular/core/testing';
import { Counter } from './counter';

describe('Counter', () => {
  it('counts clicks', async () => {
    const fixture = TestBed.createComponent(Counter);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('p')?.textContent).toBe('Clicked 0 times');

    el.querySelector('button')!.click();
    await fixture.whenStable();
    expect(el.querySelector('p')?.textContent).toBe('Clicked 1 times');
  });
});
```

- ‏`TestBed.createComponent` יוצר את הקומפוננטה ומחזיר `fixture`. ‏`fixture.nativeElement` הוא האלמנט המארח, ו-`querySelector` מחפש בתוכו כמו בדפדפן.
- ‏`createComponent` לא מרנדר מיד. ‏[`await fixture.whenStable()`](https://angular.dev/guide/testing/components-scenarios) מחכה ש-Angular יסיים לעדכן את ה-DOM, וצריך לחכות שוב אחרי כל שינוי, כמו הלחיצה.
- ‏`describe`, ‏`it` ו-`expect` הם של Vitest, וזמינים בלי import.

```bash
ng test --watch=false
```

```text
 Test Files  2 passed (2)
      Tests  3 passed (3)
```

## ‏inputs עם setInput

```typescript
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-rating',
  template: `
    <p>{{ label() }}: {{ value() }}/5</p>
    <button (click)="rated.emit(value() + 1)" [disabled]="value() >= 5">Up</button>
  `,
})
export class Rating {
  readonly label = input.required<string>();
  readonly value = input(0);
  readonly rated = output<number>();
}
```

```typescript
import { TestBed } from '@angular/core/testing';
import { Rating } from './rating';

it('shows the inputs set with setInput', async () => {
  const fixture = TestBed.createComponent(Rating);
  fixture.componentRef.setInput('label', 'Speed');
  fixture.componentRef.setInput('value', 5);
  await fixture.whenStable();
  expect(fixture.nativeElement.querySelector('p').textContent).toBe('Speed: 5/5');
  expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
});
```

‏`input()` הוא signal לקריאה בלבד, ולכן אי אפשר לכתוב `fixture.componentInstance.value.set(5)`. ‏`componentRef.setInput` מעביר ערך כמו שתבנית של הורה הייתה מעבירה.

## ‏bindings: ‏inputs ו-outputs ב-createComponent

```typescript
import { inputBinding, outputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Rating } from './rating';

it('emits the next value', async () => {
  const value = signal(3);
  const onRated = vi.fn();
  const fixture = TestBed.createComponent(Rating, {
    bindings: [
      inputBinding('label', () => 'Price'),
      inputBinding('value', value),
      outputBinding('rated', onRated),
    ],
  });
  await fixture.whenStable();

  fixture.nativeElement.querySelector('button').click();
  expect(onRated).toHaveBeenCalledWith(4);

  value.set(1);
  await fixture.whenStable();
  expect(fixture.nativeElement.querySelector('p').textContent).toBe('Price: 1/5');
});
```

אלה אותם `inputBinding` ו-`outputBinding` מ[הפוסט על קומפוננטות דינמיות](he/posts/angular-dynamic-components/). ‏input שמחובר ל-signal מתעדכן כשה-signal משתנה, ו-`vi.fn()` של Vitest רושם כל קריאה ל-output. הבדיקה לא צריכה לחכות לפני `toHaveBeenCalledWith`, כי `emit` קורא ל-listener מיד.

### בגרסאות קודמות

לפני גרסה 21 פרויקטים חדשים נוצרו עם Karma ו-Jasmine, ובדיקות נכתבו כך:

```typescript
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Counter } from './counter';

describe('Counter (old style)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Counter] }).compileComponents();
  });

  it('counts clicks', fakeAsync(() => {
    const fixture = TestBed.createComponent(Counter);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p').textContent).toContain('Clicked 1 times');
  }));
});
```

- ‏`fixture.detectChanges()` מריץ change detection ידנית אחרי כל שינוי. ב-zoneless עדיף `await fixture.whenStable()`, שמחכה לכל העבודה ש-Angular תזמן.
- ‏`fakeAsync` ו-`tick` מזיזים שעון מדומה, אבל הם דורשים Zone.js. בפרויקט zoneless הבדיקה נכשלת:

```text
Error: zone-testing.js is needed for the fakeAsync() test helper but could not be found.
        Please make sure that your environment includes zone.js/testing
```

התיעוד אומר ש-`fakeAsync` כבר לא מומלץ, וממליץ על `async`/`await` או על השעון המדומה של Vitest (`vi.useFakeTimers()`). ‏Karma עדיין נתמך, ויש [מדריך מעבר ל-Vitest](https://angular.dev/guide/testing/migrating-to-vitest).

## טעויות נפוצות של מתחילים

- **לבדוק את ה-DOM בלי `await fixture.whenStable()`.** הבדיקה רואה את המצב הקודם, או תבנית ריקה.
- **לנסות `componentInstance.value.set(...)` על input.** ל-`input()` אין `set`; משתמשים ב-`setInput` או ב-`inputBinding`.
- **לבדוק מתודות פרטיות במקום את מה שמוצג.** בדיקה שקוראת את ה-DOM ולוחצת על כפתורים שורדת שינויים פנימיים בקומפוננטה.

## מה הלאה

בפוסט הבא: בדיקות לשירותים, עם `TestBed.inject`, ‏providers מדומים, ‏`HttpTestingController` ו-`RouterTestingHarness`.
