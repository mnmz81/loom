---
title: "Updating Angular with ng update: major versions, migrations and deprecations"
summary: "A real update from Angular 21 to 22 with ng update: what it updates, which migrations ran and what they changed (ChangeDetectionStrategy.Eager), the Update Guide and the deprecation policy."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 80 }
---

`ng update` updates the Angular packages and runs scripts that adapt your code to the new version. This post follows a real update from version 21 to version 22.

Every example was checked with Angular 22.2: an app created with Angular CLI 21.2 and updated to 22.2.3.

## What can be updated

Without package names, the command only checks and changes nothing:

```bash
ng update
```

```text
    We analyzed your package.json, there are some packages to update:
    
      Name                       Version                  Command to update
     ------------------------------------------------------------------------
      @angular/cli               21.2.27 -> 22.2.3        ng update @angular/cli
      @angular/core              21.2.25 -> 22.2.3        ng update @angular/core
    
    There might be additional packages which don't provide 'ng update' capabilities that are outdated.
```

It lists only packages that support `ng update`, such as the Angular packages or Angular Material. You update the rest with your package manager.

## The update itself

The [release policy](https://angular.dev/reference/releases#breaking-change-policy-and-update-paths) recommends moving one major version at a time: from 20 to 22 you go through 21. Update `core` and `cli` in the same command:

```bash
ng update @angular/core@22 @angular/cli@22
```

```text
The installed Angular CLI version is outdated.
Installing a temporary Angular CLI versioned 22 to perform the update.
Updating package.json with dependency @angular/core to version 22.2.3...
Updating package.json with dependency typescript to version 6.0.3...
** Executing migrations of package '@angular/core' **

❯ Adds `ChangeDetectionStrategy.Eager` to all components.
UPDATE src/app/app.ts (362 bytes)
  Migration completed (1 file modified).

❯ Disables the 'nullishCoalescingNotNullable & optionalChainNotNullable extended diagnostics.
UPDATE tsconfig.app.json (624 bytes)
  Migration completed (1 file modified).
```

The output is shortened: lines for other packages and six migrations that reported `No changes made` are left out. The order is:

1. A temporary install of CLI 22, which performs the update.
2. Updating `package.json` and installing. TypeScript also went from 5.9 to 6.0, because Angular 22 requires it.
3. Migrations: scripts each package defines for moving to its version, which edit your code.

Per [the docs](https://angular.dev/cli/update), `ng update` doesn't run when git has modified or untracked files (`--allow-dirty` overrides this), so all its changes show up in a clean diff. `--create-commits` (`-C`) creates a separate commit for each migration.

## What the migration changed in the code

This is the root component after the update:

```typescript
import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('old21');
}
```

In version 22 [OnPush became the default](en/posts/angular-onpush-default-v22/). A component without `changeDetection` was checked on every pass in version 21, and the migration writes `Eager` explicitly so its behavior doesn't change. Another component in the project, which already had `ChangeDetectionStrategy.OnPush`, wasn't touched. You remove `Eager` later, one component at a time, checking that each one still updates correctly ([the post on Eager](en/posts/angular-eager-strategy/)).

A second change: `tsconfig.app.json` got a setting that turns off two extended diagnostics checks, `nullishCoalescingNotNullable` and `optionalChainNotNullable`. After the update, the build and the tests passed with no further changes.

What didn't update: `vitest` and `jsdom` stayed at their old versions, because they don't support `ng update`. A new version 22 project gets Vitest 5; the update left Vitest 4.

## The Update Guide and optional migrations

In the [Update Guide](https://angular.dev/update-guide) you pick a source version, a target version and your app's complexity, and get a list of steps, including manual ones that have no migration. Go through it before updating.

At the end of the run the CLI lists migrations that don't run on their own:

```text
** Optional migrations of package '@angular/cli' **

This package has 2 optional migrations that can be executed.
❯ Migrate projects using legacy Karma unit-test builder to the new unit-test builder with Vitest.
  ng update @angular/cli --name migrate-karma-to-vitest

❯ Migrate application projects to the new build system.
  ng update @angular/cli --name use-application-builder
```

`--name` runs a single migration by name, and `--migrate-only` with `--from` and `--to` re-runs a package's migrations without changing the installed version.

## Deprecations

Per the [deprecation policy](https://angular.dev/reference/releases#deprecation-policy), a deprecated API stays for at least one major version, about 12 months, and removal happens only in a major version. So fix deprecation warnings in your current version, before the next update. The release cadence and support windows are covered in the [first post of the series](en/posts/angular-what-is-angular/).

## Mistakes beginners make

- **Jumping several major versions at once.** The migrations are written for moving from one version to the next.
- **Running with `--allow-dirty` over unsaved work.** The migrations' changes mix with yours, and it's hard to review what they did.
- **Deleting every `Eager` right after the update.** A component that changes plain fields, without signals, may stop updating on screen.

## What's next

Next: moving from NgModule to standalone components with the `ng generate @angular/core:standalone` migration.
