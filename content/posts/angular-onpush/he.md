---
title: "OnPush ב-Angular: מתי קומפוננטה נבדקת"
summary: "הכללים של OnPush, אסטרטגיית ברירת המחדל מגרסה 22: הפניה חדשה ל-input, אירועים, ‏signals, ‏markForCheck ו-async pipe. ומלכודת ה-mutation, עם דוגמה שרצה."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 23 }
---

מגרסה 22, ‏[OnPush היא ברירת המחדל](https://angular.dev/best-practices/skipping-subtrees#using-onpush): קומפוננטה נבדקת רק במקרים מסוימים. מי שמכיר את המקרים האלה יודע לפתור את רוב הבאגים מסוג "המסך לא מתעדכן".

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest 5.

## הכללים

קומפוננטת OnPush נבדקת כש:

‏1. ‏**input מקבל ערך חדש מ-binding בתבנית.** ‏Angular משווה את הערך הקודם לחדש עם `Object.is`, כלומר לפי הפניה (reference) ולא לפי תוכן.
‏2. ‏**אירוע מטופל בה או באחד הצאצאים שלה**: ‏event binding, ‏output או `@HostListener`. האירוע מסמן גם את כל האבות שלה.
‏3. ‏**signal שהתבנית שלה קוראת משתנה.**
‏4. ‏**מישהו קורא ל-`ChangeDetectorRef.markForCheck()`** בתוכה.
‏5. ‏**`AsyncPipe` מקבל ערך חדש.** הוא קורא ל-`markForCheck` בעצמו.

שני הכללים הראשונים מופיעים [בתיעוד של OnPush](https://angular.dev/best-practices/skipping-subtrees), ושלושת האחרונים [במדריך ה-zoneless](https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility). כל דבר אחר, למשל שדה רגיל ששונה בתוך `setTimeout`, לא גורם לבדיקה.

## מלכודת ה-mutation

הורה מעביר אובייקט לילד דרך [input](he/posts/angular-inputs/), ויש לו שתי דרכים לשנות את השם:

```typescript
import { Component, input } from '@angular/core';

interface User {
  name: string;
}

@Component({
  selector: 'app-badge',
  template: `<span>{{ user().name }}</span>`,
})
export class Badge {
  readonly user = input.required<User>();
}

@Component({
  selector: 'app-profile',
  imports: [Badge],
  template: `
    <app-badge [user]="user" />
    <button (click)="mutate()">Mutate</button>
    <button (click)="replace()">Replace</button>
  `,
})
export class Profile {
  protected user: User = { name: 'Dana' };

  mutate() {
    this.user.name = 'Noa';
  }

  replace() {
    this.user = { ...this.user };
  }
}
```

```typescript
import { TestBed } from '@angular/core/testing';
import { Profile } from './profile';

it('ignores mutation, sees a new reference', async () => {
  const fixture = TestBed.createComponent(Profile);
  await fixture.whenStable();
  const el: HTMLElement = fixture.nativeElement;
  const [mutate, replace] = el.querySelectorAll('button');

  mutate.click();
  await fixture.whenStable();
  console.log('after mutate: ', el.querySelector('span')!.textContent);

  replace.click();
  await fixture.whenStable();
  console.log('after replace:', el.querySelector('span')!.textContent);
  expect(el.querySelector('span')!.textContent).toBe('Noa');
});
```

```text
after mutate:  Dana
after replace: Noa
```

הלחיצה על Mutate היא אירוע ב-`Profile`, ולכן `Profile` נבדק. אבל `[user]` מחזיק אותה הפניה, ‏`Object.is` מחזיר `true`, ו-`Badge` מדולג: השם כבר `Noa` בזיכרון, והמסך עדיין מציג `Dana`. ‏Replace יוצר אובייקט חדש, וה-input נחשב חדש. ‏`{ ...this.user }` מספיק כאן כי `name` כבר שונה. בקוד רגיל יוצרים אובייקט חדש עם הערך החדש מההתחלה: ‏`{ ...this.user, ‏name: 'Noa' }`.

אותו דבר במערכים: ‏`push` לא משנה את ההפניה, ו-`[...list, ‏item]` כן. גם signal לא יעזור כאן אם משנים את האובייקט שבתוכו: ‏[signals משווים עם `Object.is`](https://angular.dev/guide/signals) כברירת מחדל.

## ‏markForCheck לשדה רגיל

כש-state משתנה מחוץ לאירוע בתבנית, למשל בטיימר, צריך להודיע ל-Angular:

```typescript
import { ChangeDetectorRef, Component, inject } from '@angular/core';

@Component({
  selector: 'app-ticks',
  template: `<p>Ticks: {{ ticks }}</p>`,
})
export class Ticks {
  protected ticks = 0;
  private readonly cdr = inject(ChangeDetectorRef);

  start(notify: boolean) {
    setTimeout(() => {
      this.ticks++;
      if (notify) this.cdr.markForCheck();
    });
  }
}
```

הטסט קורא ל-`start(false)`, מחכה, ואז ל-`start(true)`:

```text
without markForCheck: Ticks: 0
with markForCheck:    Ticks: 2
```

אחרי הקריאה הראשונה `ticks` הוא 1, אבל אף אחד לא הודיע. ‏[`markForCheck`](https://angular.dev/api/core/ChangeDetectorRef) בקריאה השנייה סימן את ה-view ותזמן בדיקה, והיא הציגה את הערך העדכני, ‏2. ברוב המקרים signal פשוט יותר: ‏`ticks = signal(0)` ו-`ticks.update((n) => n + 1)`, בלי `ChangeDetectorRef` בכלל.

### בגרסאות קודמות

לפני גרסה 22 OnPush היה צריך לבקש בכל קומפוננטה, ו-inputs נכתבו עם הדקורטור `@Input()`:

```typescript
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span>{{ user.name }}</span>`,
})
export class BadgeComponent {
  @Input({ required: true }) user!: { name: string };
}
```

הכללים זהים. ב-Angular 22 השורה `changeDetection: ‏ChangeDetectionStrategy.OnPush` מיותרת אבל לא מזיקה, ו-`ng update` משאיר אותה כמו שהיא.

## טעויות נפוצות של מתחילים

- ‏**לשנות אובייקט או מערך שמועבר כ-input.** יוצרים הפניה חדשה.
- ‏**לצפות שאירוע בקומפוננטה אחת ירענן קומפוננטת OnPush אחות.** אירוע מסמן את הקומפוננטה שבה הוא קרה ואת האבות שלה, לא את האחיות.
- ‏**לקרוא ל-`detectChanges()` בכל מקום.** הוא מריץ בדיקה מיד על ה-view. בדרך כלל signal או `markForCheck` נכונים יותר.

## מה הלאה

בפוסט הבא: מה המשמעות של OnPush כברירת מחדל לקוד קיים, מה `ng update` לגרסה 22 עושה, ואיך עוברים ל-OnPush קומפוננטה אחרי קומפוננטה.
