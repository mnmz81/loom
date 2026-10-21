---
title: "‏Angular CDK: ‏Overlay, גרירה ושחרור ו-FocusTrap"
summary: "‏Component Dev Kit של Angular: חלון צף עם cdkConnectedOverlay, רשימה שמסדרים בגרירה עם cdkDrag ו-cdkDropList, ולכידת פוקוס בדיאלוג עם cdkTrapFocus."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 62 }
---

ה-CDK ‏(Component Dev Kit) הוא אוסף של התנהגויות בלי עיצוב: חלונות צפים, גרירה, ניהול פוקוס, [virtual scroll](https://material.angular.dev/cdk/scrolling/overview) לרשימות ארוכות ועוד. ‏Angular Material בנוי עליו, ואפשר להשתמש בו לבד בקומפוננטות שאתם מעצבים. הפוסט מראה שלושה חלקים, כל אחד בקומפוננטה אחת.

כל דוגמה נבדקה עם Angular 22.2 ו-`@angular/cdk` 22.2.3: בטסט Vitest, ובדפדפן אמיתי לגרירה וללכידת הפוקוס.

## התקנה

```bash
ng add @angular/cdk
```

```text
✔ Installing package
Nothing to be done.
```

לחבילה אין סכמת התקנה: ‏`ng add` רק מוסיף אותה ל-`package.json`, ו-`npm install @angular/cdk` עושה אותו דבר. כל חלק מיובא מנתיב משלו (`@angular/cdk/overlay`, ‏`@angular/cdk/drag-drop`, ‏`@angular/cdk/a11y`).

## ‏Overlay: חלון צף ליד כפתור

[Overlay](https://material.angular.dev/cdk/overlay/overlay) פותח פאנל צף מעל העמוד וממקם אותו ביחס לאלמנט אחר. בלי Material צריך להוסיף את הסגנונות הבסיסיים שלו ל-`styles.css` הגלובלי:

```css
@import '@angular/cdk/overlay-prebuilt.css';
```

הדרך הקצרה היא הדירקטיבה `cdkConnectedOverlay` על `ng-template`:

```typescript
import { Component, signal } from '@angular/core';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';

@Component({
  selector: 'app-help-popover',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin],
  template: `
    <button type="button" cdkOverlayOrigin #origin="cdkOverlayOrigin" [aria-expanded]="open()" (click)="open.set(!open())">
      Help
    </button>
    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      (overlayOutsideClick)="open.set(false)"
      (detach)="open.set(false)"
    >
      <div class="panel">Press ? to see all shortcuts.</div>
    </ng-template>
  `,
  styles: `.panel { background: white; border: 1px solid; padding: 0.5rem; }`,
})
export class HelpPopover {
  protected readonly open = signal(false);
}
```

- ‏`cdkOverlayOrigin` מסמן את הכפתור כנקודת העיגון, ו-`cdkConnectedOverlayOpen` פותח וסוגר לפי ה-signal. ‏`ng-template` מוסבר בפוסט על [ng-template](he/posts/angular-ng-template/).
- ‏`overlayOutsideClick` נפלט בלחיצה מחוץ לפאנל. לחיצה על הכפתור עצמו לא נחשבת "בחוץ", ולכן הכפתור ממשיך לפתוח ולסגור.
- ‏Escape סוגר את הפאנל (אלא אם `cdkConnectedOverlayDisableClose`), ו-`detach` מעדכן את ה-signal בהתאם.

בדפדפן, הפאנל הופיע בדיוק מתחת לכפתור כאלמנט `popover="manual"`: בדפדפנים שתומכים ב-Popover API ה-CDK משתמש בו, והפאנל עולה מעל הכול בלי מלחמות `z-index`.

## גרירה ושחרור

[‏drag and drop](https://angular.dev/guide/drag-drop) של ה-CDK מזיז את האלמנטים במסך, אבל לא נוגע בנתונים. את הסדר החדש מעדכנים באירוע `cdkDropListDropped`:

```typescript
import { Component, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-playlist',
  imports: [CdkDropList, CdkDrag],
  template: `
    <ol cdkDropList (cdkDropListDropped)="drop($event)">
      @for (song of songs(); track song) {
        <li cdkDrag>{{ song }}</li>
      }
    </ol>
  `,
  styles: `
    .cdk-drag-placeholder { opacity: 0.3; }
    .cdk-drag-animating { transition: transform 200ms; }
  `,
})
export class Playlist {
  protected readonly songs = signal(['Intro', 'Verse', 'Chorus', 'Outro']);

  protected drop(event: CdkDragDrop<string[]>) {
    this.songs.update((list) => {
      const copy = [...list];
      moveItemInArray(copy, event.previousIndex, event.currentIndex);
      return copy;
    });
  }
}
```

האירוע מוסר את `previousIndex` ו-`currentIndex`, ו-`moveItemInArray` מזיז את הפריט במערך. ‏`moveItemInArray` משנה את המערך במקום, ולכן מעבירים לו עותק ומחזירים אותו מ-`update`: כך ה-signal מקבל מערך חדש ומודיע לכל מי שקורא אותו. ‏`.cdk-drag-placeholder` מעצב את המקום שבו הפריט ינחת, ו-`.cdk-drag-animating` את האנימציה אחרי השחרור. בדפדפן, גרירת Intro לסוף הרשימה הציגה `Verse, Chorus, Outro, Intro`. להעברה בין שתי רשימות יש `transferArrayItem` ו-`cdkDropListConnectedTo`.

## ‏FocusTrap: פוקוס שנשאר בדיאלוג

בדיאלוג מודאלי, Tab לא אמור לברוח לעמוד שמאחוריו. [‏`cdkTrapFocus`](https://material.angular.dev/cdk/a11y/overview) לוכד את הפוקוס בתוך האלמנט:

```typescript
import { Component, signal } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';

@Component({
  selector: 'app-confirm-delete',
  imports: [CdkTrapFocus],
  template: `
    <button type="button" (click)="open.set(true)">Delete project</button>
    @if (open()) {
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" cdkTrapFocus cdkTrapFocusAutoCapture>
        <h2 id="confirm-title">Delete this project?</h2>
        <button type="button" (click)="open.set(false)">Cancel</button>
        <button type="button" (click)="open.set(false)">Delete</button>
      </div>
    }
  `,
})
export class ConfirmDelete {
  protected readonly open = signal(false);
}
```

בדפדפן: אחרי "Delete project" הפוקוס עבר ל-Cancel ‏(`cdkTrapFocusAutoCapture` מעביר אותו לאלמנט הראשון שאפשר להגיע אליו ב-Tab). ‏Tab ו-Shift+Tab הסתובבו בין Cancel ל-Delete בלבד, ואחרי הסגירה הפוקוס חזר ל-"Delete project". בלי `AutoCapture` הלכידה פועלת, אבל הפוקוס לא נכנס לדיאלוג ולא חוזר ממנו לבד. הלכידה לא חוסמת לחיצת עכבר מחוץ לאזור. ‏`Dialog` של ה-CDK (ו-`MatDialog` של Material) כוללים את כל זה, יחד עם Escape ו-backdrop.

## טעויות נפוצות של מתחילים

- **לשכוח את `overlay-prebuilt.css`.** בלי Material, ה-Overlay צריך את הסגנונות האלה כדי לעבוד נכון.
- **לצפות שהגרירה תשנה את המערך.** הדירקטיבות רק מציירות את הגרירה; בלי `moveItemInArray` ב-`cdkDropListDropped` הפריט חוזר למקומו.
- **גרירה כדרך היחידה לשנות סדר.** המדריך הרשמי מתאר עכבר ומגע בלבד, ולכן כדאי לתת גם כפתורי "למעלה" ו"למטה" למשתמשי מקלדת.

## מה הלאה

בפוסט הבא: ‏Angular Material, הקומפוננטות המעוצבות שנבנו על ה-CDK: התקנה עם `ng add`, כפתורים, שדות טופס, דיאלוג ו-theme.
