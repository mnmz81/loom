---
title: "Tailwind CSS in Angular: installation, [class] and @apply in components"
summary: "Tailwind CSS 4 in an Angular project: what ng add tailwindcss creates, classes in templates and [class] with a signal, @theme for your own colors, and why @apply in a component needs @reference."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 64 }
---

With [Tailwind CSS](https://tailwindcss.com) you style with small classes right in the HTML (`p-4`, `text-sm`, `bg-green-100`), and the build generates CSS only for the classes that actually appear in your code. The Angular CLI runs PostCSS, so Tailwind plugs into it without a special builder.

Every example was checked with Angular 22.2 and Tailwind CSS 4.3.3: in a Vitest test, with `ng build` and in a browser.

## Installation

[Angular's guide](https://angular.dev/guide/tailwind) recommends `ng add`:

```bash
ng add tailwindcss
```

```text
The tailwindcss package does not provide `ng add` actions.
The Angular CLI will use built-in actions to add it to your project.
CREATE .postcssrc.json (53 bytes)
UPDATE src/styles.css (104 bytes)
UPDATE package.json (881 bytes)
✔ Packages installed successfully.
```

The CLI installs `tailwindcss`, `@tailwindcss/postcss` and `postcss`, and creates the PostCSS config file in the project root:

```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

`styles.css` got the `@import` line. Here I also added my own color with `@theme`, from which Tailwind generates classes such as `text-brand` and `bg-brand`:

```css
@import 'tailwindcss';

@theme {
  --color-brand: oklch(0.55 0.2 260);
}
```

[Tailwind's guide](https://tailwindcss.com/docs/installation/framework-guides/angular) describes the same steps by hand: `npm install`, `.postcssrc.json` and the `@import`.

## Classes in the template and `[class]`

Fixed classes go in a plain `class`. Classes that depend on state are added with `[class]`, and Angular combines the two:

```typescript
import { Component, computed, input } from '@angular/core';

type Status = 'done' | 'pending' | 'failed';

const COLORS: Record<Status, string> = {
  done: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
};

@Component({
  selector: 'app-status-badge',
  template: `
    <span class="rounded-full px-3 py-1 text-sm font-medium" [class]="color()">
      {{ status() }}
    </span>
  `,
})
export class StatusBadge {
  readonly status = input.required<Status>();
  protected readonly color = computed(() => COLORS[this.status()]);
}
```

In the test, with `status` = `pending` the `span` got `rounded-full px-3 py-1 text-sm font-medium bg-amber-100 text-amber-800`, and after switching to `done` the colors changed to green while the fixed classes stayed.

The `COLORS` map matters: [Tailwind scans the project files as text](https://tailwindcss.com/docs/detecting-classes-in-source-files) looking for complete class names. `'bg-green-100'` appears in the code as is, so its CSS is generated. `input` and `computed` are covered in the [inputs](en/posts/angular-inputs/) and [signals](en/posts/angular-signals/) posts.

## `@apply` in component styles

The utilities in the template are global classes from `styles.css`, so [view encapsulation](en/posts/angular-styling/) doesn't affect them: it adds a unique attribute only to the selectors in the component's `styles`. The trouble starts when you want `@apply` inside `styles`. Each component's styles go through PostCSS separately, without the `@import 'tailwindcss'` from `styles.css`, and the build fails:

```text
✘ [ERROR] Cannot apply unknown utility class `rounded-lg`. Are you using CSS modules or similar and missing `@reference`?
```

The fix is [`@reference`](https://tailwindcss.com/docs/functions-and-directives) to the main stylesheet. It gives access to the utilities and `@theme` without pulling all of Tailwind's CSS into the component again:

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-card',
  template: `<ng-content />`,
  styles: `
    @reference '../styles.css';

    :host {
      @apply block rounded-lg p-4 shadow;
    }
  `,
})
export class Card {}
```

The path is relative to the component's file (`src/app/card.ts`). After the change the build passed, and in the browser `app-card` had `border-radius: 8px` and a shadow.

### In older versions

In Tailwind 3, which older tutorials use, setup was different: `npx tailwindcss init` created a `tailwind.config.js` with a `content` list of files to scan, and `styles.css` started with three directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Tailwind 4 needs no `tailwind.config.js`: scanning is automatic, and customizations are written in CSS with `@theme`.

## Mistakes beginners make

- **Building a class name from strings**, like `'bg-' + color() + '-500'`. In the browser the `bg-purple-500` class was on the element, but with no background: the full name isn't written in any file, so Tailwind generated no CSS for it.
- **Several classes in one object key in `[class]`**, like `{ 'bg-red-100 text-red-800': on() }`. [The docs](https://angular.dev/guide/templates/binding) define each key as one class name; in the test no class was added, with no error. Use a string, one key per class, or `ngClass`, which splits keys on spaces.
- **`@apply` without `@reference`.** The build error above.

## What's next

Next: server-side rendering (SSR) and hydration, `ng add @angular/ssr`, `provideClientHydration` and what breaks hydration.
