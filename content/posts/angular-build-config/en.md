---
title: "Build configuration in Angular: application builder, configurations and environment values"
summary: "What happens in ng build: the @angular/build:application builder (esbuild and Vite), the production and development configurations, fileReplacements vs define, budgets and source maps."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 71 }
---

`ng build` and `ng serve` don't build anything themselves: they run a builder defined in `angular.json`, with the options written there. Knowing the file tells you why a production build differs from development, and where to change an API URL per environment.

Every example was checked with Angular 22.2.

## The builder

```json
"build": {
  "builder": "@angular/build:application",
  "options": {
    "browser": "src/main.ts",
    "tsConfig": "tsconfig.app.json",
    "assets": [{ "glob": "**/*", "input": "public" }],
    "styles": ["src/styles.css"]
  },
  "defaultConfiguration": "production"
},
"serve": {
  "builder": "@angular/build:dev-server",
  "defaultConfiguration": "development"
}
```

`@angular/build:application` is [the default for every new application](https://angular.dev/tools/cli/build-system-migration). It builds with esbuild, and the dev server uses Vite, which Angular uses [only as a development server](https://angular.dev/tools/cli/build-system-migration). The same builder also handles SSR and [prerendering](en/posts/angular-ssg/). `browser` is the entry point, and `public` is copied as is to the output folder.

## production and development

```json
"configurations": {
  "production": {
    "budgets": [
      { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
      { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
    ],
    "outputHashing": "all"
  },
  "development": {
    "optimization": false,
    "extractLicenses": false,
    "sourceMap": true
  }
}
```

A configuration overrides `options`. `ng build` uses `production` (the `defaultConfiguration` of `build`), and `ng serve` uses `development`. The same app in both modes:

```text
ng build
main-XW2B5EJE.js    | main          | 190.97 kB |                52.13 kB

ng build --configuration development
main.js             | main          |  1.35 MB |
```

In production the code is minified and the file name gets a hash (`outputHashing`), so a new version doesn't get stuck in the browser cache. In development there's no optimization, and `main.js.map` is written next to `main.js`. You can pass several configurations separated by commas, [and the last one wins](https://angular.dev/tools/cli/environments).

## Environment values: fileReplacements and define

```bash
ng generate environments
```

```text
CREATE src/environments/environment.ts (31 bytes)
CREATE src/environments/environment.development.ts (31 bytes)
UPDATE angular.json (2143 bytes)
```

The command adds `fileReplacements` to `development`, which swaps `environment.ts` for `environment.development.ts` at build time ([docs](https://angular.dev/tools/cli/environments)). A second way is the [`define`](https://angular.dev/tools/cli/build-system-migration) option, which replaces a global identifier with a constant value. We added `"define": { "APP_VERSION": "'1.4.0'" }` to `options`. A string needs quotes inside the value:

```typescript
import { Component } from '@angular/core';
import { environment } from '../environments/environment';

declare const APP_VERSION: string;

@Component({
  selector: 'app-root',
  template: `<p>API: {{ apiUrl }} · version {{ version }}</p>`,
})
export class App {
  protected readonly apiUrl = environment.apiUrl;
  protected readonly version = APP_VERSION;
}
```

The `ng build` bundle contained `api.example.com` and `1.4.0`, and the development build `localhost:3000`. The `declare const` only tells TypeScript the identifier exists. `fileReplacements` suits a whole settings object per environment. `define` suits a single value, and you can override it from the command line: `ng build --define APP_VERSION="'1.5.0'"`. Either way the values end up in JavaScript anyone can read, so no secrets go there.

## Budgets and source maps

The `budgets` in production limit size: above `maximumWarning` the build warns, and above `maximumError` it fails. [Bundle size](en/posts/angular-bundle-size/) gets its own post.

`sourceMap` is [off by default](https://angular.dev/reference/configs/workspace-config#source-map-configuration) and on in development. To send maps to an error-reporting tool without exposing them in the browser, use `"sourceMap": { "scripts": true, "hidden": true }`: the files are written, but the bundle doesn't point to them.

### In older versions

Older projects build with the Webpack builder, where the entry point is called `main` and `index` is required:

```json
"builder": "@angular-devkit/build-angular:browser",
"options": {
  "outputPath": "dist/ng-template",
  "index": "src/index.html",
  "main": "src/main.ts"
}
```

On Angular 22 it still works, but prints on every build:

```text
The "@angular-devkit/build-angular:browser" builder is deprecated as part of Angular's Webpack support deprecation. Use "@angular/build:application" instead.
```

Its output goes straight to `dist/ng-template`, with no `browser/` folder. To migrate: `ng update @angular/cli --name use-application-builder`.

## Mistakes beginners make

- **Putting an API key in `environment.ts`.** The file goes into the bundle, and anyone who opens the site can read it.
- **Forgetting the quotes in `define`.** The value goes into the code as is, and with `"APP_VERSION": "1.4.0"` the build fails: `Invalid define value (must be an entity name or JS literal): 1.4.0`.
- **Measuring performance on `ng serve`.** That's a development build, with no optimization. Measure on `ng build`.

## What's next

Next: deploying the app to GitHub Pages with GitHub Actions, `baseHref` and a 404 page for client-side routing.
