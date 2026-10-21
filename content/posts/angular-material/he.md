---
title: "‏Angular Material: התקנה, כפתורים, שדות טופס, דיאלוג ו-theme"
summary: "‏Angular Material בפועל: מה ng add משנה בפרויקט, כפתור ושדה טופס, דיאלוג אישור עם MatDialog, ו-theme של Material 3 עם mat.theme, משתני --mat-sys ו-overrides."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 63 }
---

[Angular Material](https://material.angular.dev) היא ספריית הקומפוננטות של צוות Angular, לפי Material Design 3. היא בנויה על [ה-CDK](he/posts/angular-cdk/), ולכן מקלדת, פוקוס ו-ARIA כבר מטופלים בה. מה שנשאר לכם הוא לבחור קומפוננטות ולהגדיר theme.

כל דוגמה נבדקה עם Angular 22.2 ו-`@angular/material` 22.2.3, בטסט Vitest וב-`ng build`.

## התקנה עם ng add

```bash
ng add @angular/material
```

השאלה היחידה היא איזה זוג פלטות להתחלה (Azure/Blue, ‏Rose/Red, ‏Magenta/Violet או Cyan/Orange). עם ברירת המחדל:

```text
✔ Packages installed successfully.
CREATE src/material-theme.scss (1179 bytes)
UPDATE angular.json (1959 bytes)
UPDATE src/index.html (640 bytes)
```

‏`material-theme.scss` מכיל את ה-theme, ו-`angular.json` מוסיף אותו ל-`styles` לפני `styles.css`. ב-`index.html` נוספו קישורים לגופן Roboto ולאייקונים Material Symbols מ-Google Fonts. ‏`@angular/cdk` מותקן יחד איתו.

## כפתור ושדה טופס

כל קומפוננטה מיובאת לבד, מהנתיב שלה:

```typescript
import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { DeleteDialog } from './delete-dialog';

@Component({
  selector: 'app-project-card',
  imports: [MatButton, MatFormField, MatLabel, MatHint, MatInput],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>Project name</mat-label>
      <input matInput [value]="name()" (input)="name.set($any($event.target).value)" />
      <mat-hint>Shown on the dashboard</mat-hint>
    </mat-form-field>
    <button matButton="outlined" (click)="confirmDelete()">Delete project</button>
    <p>{{ status() }}</p>
  `,
})
export class ProjectCard {
  private readonly dialog = inject(MatDialog);
  protected readonly name = signal('Loom');
  protected readonly status = signal('');

  protected confirmDelete() {
    this.dialog
      .open(DeleteDialog, { data: { name: this.name() } })
      .afterClosed()
      .subscribe((confirmed) => this.status.set(confirmed ? 'Deleted' : 'Kept'));
  }
}
```

- [הכפתור](https://material.angular.dev/components/button/overview) הוא `<button>` אמיתי עם המאפיין `matButton`, והערך שלו קובע את המראה: `text` (ברירת המחדל), ‏`filled`, ‏`tonal`, ‏`outlined` או `elevated`.
- [‏`mat-form-field`](https://material.angular.dev/components/form-field/overview) עוטף `<input matInput>` רגיל ומוסיף לו label צף, טקסט עזרה (`mat-hint`) ומסגרת. ‏`appearance` הוא `fill` או `outline`. ה-`<input>` נשאר נייטיב, כך שכל binding עובד עליו כרגיל.

## דיאלוג

[‏`MatDialog`](https://material.angular.dev/components/dialog/overview) פותח קומפוננטה בחלון מודאלי. ‏`open` מקבל את הקומפוננטה ו-`data`, ומחזיר `MatDialogRef`, ש-`afterClosed()` שלו פולט את התוצאה. זו קומפוננטת הדיאלוג:

```typescript
import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-dialog',
  imports: [MatButton, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose],
  template: `
    <h2 mat-dialog-title>Delete "{{ data.name }}"?</h2>
    <mat-dialog-content>This can't be undone.</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close>Cancel</button>
      <button matButton="filled" [mat-dialog-close]="true">Delete</button>
    </mat-dialog-actions>
  `,
})
export class DeleteDialog {
  protected readonly data = inject<{ name: string }>(MAT_DIALOG_DATA);
}
```

- ‏`MAT_DIALOG_DATA` הוא ה-token שדרכו מגיע `data` ([‏inject](he/posts/angular-inject/)).
- ‏`mat-dialog-close` סוגר את הדיאלוג, והערך שלו הוא התוצאה: ‏Cancel מחזיר `undefined`, ‏Delete מחזיר `true`. בטסט, אחרי שינוי השם ל-Notebook, הכותרת הייתה `Delete "Notebook"?`, ואחרי Delete הופיע `Deleted`.
- הדיאלוג מקבל `role="dialog"`, לוכד את הפוקוס, נסגר ב-Escape ומחזיר את הפוקוס לכפתור שפתח אותו.

## ‏theme עם Material 3

[ה-theme](https://material.angular.dev/guide/theming) מוגדר ב-Sass עם המיקסין `mat.theme`. כך נראה `material-theme.scss` אחרי שינוי פלטה, מצב כהה לפי מערכת ההפעלה, ושינוי של token אחד:

```scss
@use '@angular/material' as mat;

html {
  color-scheme: light dark;
  @include mat.theme((
    color: (
      primary: mat.$rose-palette,
      tertiary: mat.$red-palette,
    ),
    typography: Roboto,
    density: 0,
  ));
  @include mat.button-overrides((
    filled-container-shape: 8px,
  ));
}

body {
  margin: 0;
  background-color: var(--mat-sys-surface);
  color: var(--mat-sys-on-surface);
  font: var(--mat-sys-body-medium);
}

.banner {
  background: var(--mat-sys-primary-container);
  color: var(--mat-sys-on-primary-container);
  font: var(--mat-sys-title-medium);
}
```

‏`mat.theme` לא מייצר CSS לכל קומפוננטה, אלא משתני מערכת (`--mat-sys-*`) לצבע, טיפוגרפיה וצפיפות, וכל הקומפוננטות קוראות אותם. ב-CSS שה-build הוציא:

```text
--mat-sys-primary: light-dark(#ba005c, #ffb1c5)
--mat-button-filled-container-shape: 8px
```

- ‏`light-dark()` בוחר ערך לפי `color-scheme`. ‏`light dark` עוקב אחרי ההגדרה של המשתמש, ו-`light` או `dark` קובעים מצב אחד.
- ‏`mat.button-overrides` משנה token של קומפוננטה אחת (כאן פינות הכפתור המלא). לכל קומפוננטה יש מיקסין כזה, ורשימת ה-tokens שלה מופיעה בלשונית Styling בתיעוד שלה. ל-tokens של המערכת יש `mat.theme-overrides`.
- ‏`.banner` היא קומפוננטה שלכם שמשתמשת באותם משתנים, ולכן מתאימה את עצמה ל-theme ולמצב הכהה.

### בגרסאות קודמות

לפני Material 20 המראה של כפתור נקבע בשם המאפיין. הסלקטורים האלה עדיין נתמכים:

```html
<button mat-flat-button>Save</button>
<button mat-stroked-button>Cancel</button>
<button mat-raised-button>Share</button>
```

‏`ng add` מייצר theme עם `mat.theme` מגרסה 19. קובצי theme ישנים יותר משתמשים ב-API של Material 2: ‏`mat.define-light-theme` (היום `mat.m2-define-light-theme`) יחד עם `mat.all-component-themes`.

## טעויות נפוצות של מתחילים

- **לדרוס את ה-CSS הפנימי של הקומפוננטות** (`.mdc-button__label` וכו'). לפי התיעוד, מבנה ה-DOM והמחלקות הם פרטי מימוש שיכולים להשתנות בכל גרסה. משנים מראה רק דרך `mat.theme`, ה-overrides ומשתני `--mat-sys-*`.
- **לייבא `MatFormField` בלי `MatInput`.** בלי `matInput` על ה-`<input>`, השדה לא מתחבר ל-`mat-form-field`, והשגיאה היא `mat-form-field must contain a MatFormFieldControl.`
- **לשכוח את `color-scheme`.** בלי ההגדרה הזו `light-dark()` תמיד בוחר את הצבעים הבהירים.

## מה הלאה

בפוסט הבא: ‏Tailwind CSS ב-Angular, התקנה, מחלקות בתבניות ו-`[class]`, ומה קורה עם view encapsulation.
