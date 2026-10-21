---
title: "Your first component: ng generate and @Component"
summary: "Create a component with ng generate component, go through the @Component metadata (selector, template, styles, imports) and use the component inside another one."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 4 }
---

An Angular app is a tree of components. Each component has a class, an HTML template and styles, and it's shown with a tag of its own. In this post we generate one, see what each `@Component` field does, and use it inside the root component ([project structure](en/posts/angular-project-structure/)).

Every example was checked with Angular 22.2 and its CLI, and ran in a Vitest test.

## ng generate component

```bash
ng generate component user-card
```

```text
CREATE src/app/user-card/user-card.css (0 bytes)
CREATE src/app/user-card/user-card.spec.ts (547 bytes)
CREATE src/app/user-card/user-card.ts (196 bytes)
CREATE src/app/user-card/user-card.html (24 bytes)
```

The shortcut `ng g c user-card` does the same. The CLI creates a folder with four files: code, template, styles and a test. This is what's in `user-card.ts`:

```typescript
import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-user-card',
  styleUrl: './user-card.css',
  templateUrl: './user-card.html',
})
export class UserCard {}
```

The class name (`UserCard`) and the template file name come from the name you gave. `--inline-template` and `--inline-style` put the template and styles inside the `.ts` file (with no `.html` and `.css` files), and `--skip-tests` skips the `spec`. `ng generate component --help` lists every flag.

## The @Component metadata

The object passed to `@Component` is called the [component's metadata](https://angular.dev/guide/components). These are its fields:

- **`selector`**: the tag name that shows the component. The CLI prefixes it with `app-` (a short, consistent prefix is [recommended](https://angular.dev/guide/components/selectors), and `ng` is reserved for Angular itself).
- **`template` or `templateUrl`**: the HTML. `template` takes a string (usually a template literal with backticks), and `templateUrl` points to a file relative to the component's folder.
- **`styles` or `styleUrl`**: the same for styles. The styles apply only to this component's template; the [styling post](en/posts/angular-styling/) explains how.
- **`imports`**: the components, directives and pipes the template uses.

The examples in this series prefer `template` and `styles` inside the file, so a component is a single block. The template itself contains [bindings](en/posts/angular-bindings/):

```typescript
// user-card.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-user-card',
  template: `
    <h2>{{ name }}</h2>
    <p>Joined in {{ year }}</p>
  `,
  styles: `
    h2 { color: rebeccapurple; }
  `,
})
export class UserCard {
  protected name = 'Dana';
  protected year = 2024;
}
```

Both fields are `protected` because only the template reads them. The [style guide](https://angular.dev/style-guide) recommends this, since a class with public members exposes an API that can be reached through dependency injection and queries.

## Using a component inside another

To show `UserCard` in another component, import the class, put it in `imports`, and write the tag in the template:

```typescript
// app.ts
import { Component } from '@angular/core';
import { UserCard } from './user-card';

@Component({
  selector: 'app-root',
  imports: [UserCard],
  template: `
    <h1>Team</h1>
    <app-user-card />
    <app-user-card />
  `,
})
export class App {}
```

Each tag creates a separate instance of the component, and the test finds two `app-user-card` tags, each with an `<h2>` containing `Dana`. The element that matches a `selector` is the component's host element, and the template renders inside it.

If you forget `imports`, the build fails:

```text
✘ [ERROR] NG8001: 'app-user-card' is not a known element:
1. If 'app-user-card' is an Angular component, then verify that it is included in the '@Component.imports' of this component.
```

### In older versions

[Up to version 18](https://angular.dev/guide/components) components were non-standalone by default, so code from that period has one of two things. The first is `standalone: true` written explicitly (today it's the default and you can remove it):

```typescript
@Component({
  selector: 'app-explicit',
  standalone: true,
  template: `<p>explicit</p>`,
})
export class Explicit {}
```

The second is a component registered in the `declarations` of an `NgModule`, and used by importing the module instead of the class:

```typescript
@Component({
  selector: 'app-old-card',
  template: `<p>old card</p>`,
  standalone: false,
})
export class OldCard {}

@NgModule({ declarations: [OldCard], exports: [OldCard] })
export class OldCardModule {}

@Component({
  selector: 'app-old-host',
  imports: [OldCardModule],
  template: `<app-old-card />`,
})
export class OldHost {}
```

Such a component needs `standalone: false` today (in Angular 18 and below it was the default, so it wasn't written). Old code also names files and classes `user-card.component.ts` and `UserCardComponent`, which is how `ng generate component` created them up to version 19.

## Mistakes beginners make

- **Forgetting `imports`.** The `NG8001` error above almost always means the component isn't in the `imports` of the component that uses it.
- **Writing the class name in the template.** The `selector` is `app-user-card`, not `<UserCard />`.
- **Forgetting `export` on the class.** Without `export class` you can't import it from another file.

## What's next

Next: bindings, the way to pass values from the class to the template and events back to it.
