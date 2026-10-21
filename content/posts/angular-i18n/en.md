---
title: "i18n in Angular: @angular/localize, ng extract-i18n and a build per language"
summary: "Translating an Angular app with built-in i18n: marking text with i18n and $localize, ng extract-i18n, a Hebrew translation file, and a build per language. Plus when a dictionary is enough."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 68 }
---

Angular's built-in i18n translates at build time: you mark text in the code, extract it to a file, translate it, and `ng build` outputs a separate copy of the app for each language. Switching language means going to another URL, not swapping text at runtime.

Every example was checked with Angular 22.2.

## Adding @angular/localize

```bash
ng add @angular/localize
```

```text
UPDATE src/main.ts (267 bytes)
UPDATE tsconfig.app.json (429 bytes)
UPDATE tsconfig.spec.json (436 bytes)
UPDATE angular.json (1999 bytes)
```

The command adds `@angular/localize/init` to `polyfills` in `angular.json`, and the `$localize` types to the tsconfig ([docs](https://angular.dev/guide/i18n/add-package)).

## Marking text for translation

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <h1 i18n="site header|Welcome title@@welcome">Hello, reader!</h1>
    <button i18n-title title="Add one item" (click)="count.set(count() + 1)">+1</button>
    <p i18n>{count(), plural, =0 {No items} =1 {One item} other {{{ count() }} items}}</p>
    <p>{{ status }}</p>
  `,
})
export class App {
  protected readonly count = signal(0);
  protected readonly status = $localize`:@@status:Saved`;
}
```

[Four ways to mark text](https://angular.dev/guide/i18n/prepare):

- `i18n` marks the element's content. Its value has the form `meaning|description@@id`, and every part is optional. The meaning and description reach the translator, and `@@id` sets a fixed ID.
- `i18n-title` marks an attribute, here `title`.
- An ICU `plural` picks a wording by number. A Hebrew translation can add an `=2` case.
- `` $localize`:@@status:Saved` `` marks a string in TypeScript code, with the same metadata format between colons.

Without a translation, the app shows the source text: a test of the component got `No items`, and `One item` after a click.

## ng extract-i18n

```bash
ng extract-i18n --output-path src/locale
```

```text
Extraction Complete. (Messages: 4)
```

The command writes `src/locale/messages.xlf` (XLIFF 1.2). Copy it to `messages.he.xlf` and add a `<target>` to each unit:

```text
<trans-unit id="welcome" datatype="html">
  <source>Hello, reader!</source>
  <target>שלום, קוראים!</target>
  <note priority="1" from="description">Welcome title</note>
  <note priority="1" from="meaning">site header</note>
</trans-unit>
<trans-unit id="6358580996267558411" datatype="html">
  <source>{VAR_PLURAL, plural, =0 {No items} =1 {One item} other {<x id="INTERPOLATION"/> items}}</source>
  <target>{VAR_PLURAL, plural, =0 {אין פריטים} =1 {פריט אחד} =2 {שני פריטים} other {<x id="INTERPOLATION"/> פריטים}}</target>
</trans-unit>
```

(The `context-group` lines are left out of the excerpt.) `welcome` has the ID we chose. The plural, which got no `@@id`, has an ID computed from the text, so changing the source text creates a new unit.

## A build per language

In `angular.json`, set the source locale and the translation files, and turn on `localize` ([docs](https://angular.dev/guide/i18n/merge)):

```json
"i18n": {
  "sourceLocale": "en-US",
  "locales": {
    "he": { "translation": "src/locale/messages.he.xlf" }
  }
},
"architect": {
  "build": {
    "options": {
      "localize": true
    }
  }
}
```

`ng build` outputs a folder per language:

```text
dist/ng-template/browser/en-US/index.html
dist/ng-template/browser/en-US/main-OV5CLT5E.js
dist/ng-template/browser/he/index.html
dist/ng-template/browser/he/main-OV5CLT5E.js
```

In `he/index.html` the build wrote `<html lang="he" dir="rtl">` and `<base href="/he/">`, and the text `שלום, קוראים!` is already inside the JavaScript. The dev server serves one language at a time, so you add a configuration per language and run, for example, `ng serve --configuration=he`.

## Runtime alternatives

Libraries such as Transloco and ngx-translate load translations at runtime and switch language without a reload, with one build for all languages.

For a small site, a dictionary is sometimes enough. This blog doesn't use `@angular/localize`: it has an `he` object and an `en` object with the same keys (TypeScript makes sure no key is missing), and a `LocaleService` with a language signal and a `t(key)` function. The language comes from the route (`/he/...` or `/en/...`), and the build prerenders both ([SSG](en/posts/angular-ssg/)).

## Mistakes beginners make

- **Adding text without updating the translation file.** A unit missing from `messages.he.xlf` shows the source text, and the build only warns: `No translation found for "status" ("Saved").` With `"i18nMissingTranslation": "error"` the build fails.
- **Relying on automatic IDs.** Fixing a comma in the source text creates a new ID, and the old translation no longer matches it. Give text that changes an `@@id`.
- **Editing `messages.xlf` itself.** Every run of `ng extract-i18n` rewrites it. Translate in a copy per language.

## What's next

Next: turning the app into a PWA with `ng add @angular/pwa`, a service worker and working offline.
