---
title: "Angular Material: installation, buttons, form fields, a dialog and a theme"
summary: "Angular Material in practice: what ng add changes, a button and a form field, a confirm dialog with MatDialog, and a Material 3 theme with mat.theme, --mat-sys variables and overrides."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 63 }
---

[Angular Material](https://material.angular.dev) is the Angular team's component library, following Material Design 3. It's built on [the CDK](en/posts/angular-cdk/), so keyboard, focus and ARIA are already handled. What's left for you is picking components and setting up a theme.

Every example was checked with Angular 22.2 and `@angular/material` 22.2.3, in a Vitest test and with `ng build`.

## Installing with ng add

```bash
ng add @angular/material
```

The only question is which pair of starter palettes to use (Azure/Blue, Rose/Red, Magenta/Violet or Cyan/Orange). With the default:

```text
✔ Packages installed successfully.
CREATE src/material-theme.scss (1179 bytes)
UPDATE angular.json (1959 bytes)
UPDATE src/index.html (640 bytes)
```

`material-theme.scss` holds the theme, and `angular.json` adds it to `styles` before `styles.css`. `index.html` gets links to the Roboto font and the Material Symbols icons from Google Fonts. `@angular/cdk` is installed along with it.

## A button and a form field

Each component is imported on its own, from its own path:

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

- [The button](https://material.angular.dev/components/button/overview) is a real `<button>` with the `matButton` attribute, and its value sets the look: `text` (the default), `filled`, `tonal`, `outlined` or `elevated`.
- [`mat-form-field`](https://material.angular.dev/components/form-field/overview) wraps a plain `<input matInput>` and adds a floating label, help text (`mat-hint`) and a frame. `appearance` is `fill` or `outline`. The `<input>` stays native, so any binding works on it as usual.

## A dialog

[`MatDialog`](https://material.angular.dev/components/dialog/overview) opens a component in a modal window. `open` takes the component and `data`, and returns a `MatDialogRef` whose `afterClosed()` emits the result. This is the dialog component:

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

- `MAT_DIALOG_DATA` is the token that delivers `data` ([inject](en/posts/angular-inject/)).
- `mat-dialog-close` closes the dialog, and its value is the result: Cancel returns `undefined`, Delete returns `true`. In the test, after renaming to Notebook, the title was `Delete "Notebook"?`, and after Delete the page showed `Deleted`.
- The dialog gets `role="dialog"`, traps focus, closes on Escape and returns focus to the button that opened it.

## A Material 3 theme

[The theme](https://material.angular.dev/guide/theming) is defined in Sass with the `mat.theme` mixin. This is `material-theme.scss` after switching palettes, following the OS dark mode, and changing one token:

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

`mat.theme` doesn't generate CSS per component; it generates system variables (`--mat-sys-*`) for color, typography and density, and every component reads them. In the CSS the build produced:

```text
--mat-sys-primary: light-dark(#ba005c, #ffb1c5)
--mat-button-filled-container-shape: 8px
```

- `light-dark()` picks a value based on `color-scheme`. `light dark` follows the user's setting, and `light` or `dark` forces one mode.
- `mat.button-overrides` changes a token of one component (here the filled button's corners). Every component has such a mixin, and its token list is on the Styling tab of its docs. System tokens have `mat.theme-overrides`.
- `.banner` is your own component using the same variables, so it follows the theme and dark mode.

### In older versions

Before Material 20, the button's look was set by the attribute name. These selectors are still supported:

```html
<button mat-flat-button>Save</button>
<button mat-stroked-button>Cancel</button>
<button mat-raised-button>Share</button>
```

`ng add` generates a `mat.theme` theme since version 19. Older theme files use the Material 2 API: `mat.define-light-theme` (now `mat.m2-define-light-theme`) together with `mat.all-component-themes`.

## Mistakes beginners make

- **Overriding the components' internal CSS** (`.mdc-button__label` and so on). Per the docs, the DOM structure and classes are implementation details that can change in any version. Change the look only through `mat.theme`, the overrides and the `--mat-sys-*` variables.
- **Importing `MatFormField` without `MatInput`.** Without `matInput` on the `<input>`, the field doesn't connect to `mat-form-field`, and the error is `mat-form-field must contain a MatFormFieldControl.`
- **Forgetting `color-scheme`.** Without it, `light-dark()` always picks the light colors.

## What's next

Next: Tailwind CSS in Angular, installation, classes in templates and `[class]`, and what happens with view encapsulation.
