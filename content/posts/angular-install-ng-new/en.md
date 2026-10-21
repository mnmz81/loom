---
title: "Installing Angular and a first project with ng new"
summary: "What you need to start: Node.js, the Angular CLI (global or via npx), ng new and its prompts, what version 22 generates, ng serve and ng version."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 2 }
---

Creating an Angular project takes two tools: Node.js, which runs the development tools, and the Angular CLI, which creates, runs and builds the project.

Every example was checked with Angular CLI 22.2, Node.js 24.21 and npm 11.19.

## Node.js

Angular 22 [requires](https://angular.dev/reference/versions) Node.js `^22.22.3`, `^24.15.0` or `^26.0.0`, that is, an active LTS or maintenance LTS release. Check what you have:

```bash
node -v
```

```text
v24.21.0
```

npm comes with Node.js; there's nothing else to install.

## Installing the CLI

The [usual install](https://angular.dev/tools/cli/setup-local) is global, after which the `ng` command works in any folder:

```bash
npm install -g @angular/cli
```

On Windows, PowerShell blocks running scripts by default, so `ng` may fail. The docs recommend `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`. On Linux and macOS, if the install fails on permissions, run it with `sudo`.

You can also skip the global install. [npx](https://docs.npmjs.com/cli/commands/npx) downloads a package and runs it once, which also lets you pick an exact version:

```bash
npx @angular/cli@22 new my-app
cd my-app
npx ng version
```

Inside the project, `npx ng` runs the CLI installed in the project's `node_modules`, at the version written in `package.json`. The rest of this post writes `ng`; every command works with `npx ng` too.

## ng new

`ng new my-app` asks three questions (the first time the CLI runs, one more comes before them: whether to share usage data with the Angular team). This is how it looks, with the answers I picked:

```text
✔ Which stylesheet system would you like to use? CSS
✔ Do you want to enable Server-Side Rendering (SSR) and Static Site Generation (SSG/Prerendering)? No
✔ Which AI tools should Angular integrate with? None
CREATE my-app/angular.json (1903 bytes)
CREATE my-app/package.json (782 bytes)
CREATE my-app/tsconfig.json (908 bytes)
CREATE my-app/src/main.ts (222 bytes)
CREATE my-app/src/index.html (291 bytes)
CREATE my-app/src/styles.css (80 bytes)
CREATE my-app/src/app/app.ts (289 bytes)
CREATE my-app/src/app/app.html (20144 bytes)
CREATE my-app/src/app/app.css (0 bytes)
CREATE my-app/src/app/app.spec.ts (680 bytes)
CREATE my-app/src/app/app.config.ts (312 bytes)
CREATE my-app/src/app/app.routes.ts (77 bytes)
CREATE my-app/public/favicon.ico (15086 bytes)
⠋ Installing packages (npm)...
```

(The list is shortened: it also had `README.md`, `.gitignore`, `tsconfig.app.json`, `tsconfig.spec.json` and a `.vscode` folder.)

- **stylesheet**: CSS, Tailwind CSS, Sass or Less. You can change it later.
- **SSR**: server rendering and pre-built static pages. SSR gets its own posts in level 10; for a first project, pick No.
- **AI tools**: instruction files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) and the Angular MCP server config for the tools you choose.

The same answers can be given as flags, with no prompts: `ng new my-app --style=css --ssr=false --ai-config=none`. `ng new` also initializes a git repository; `--skip-git` skips that. `ng new --help` lists every flag.

## What version 22 generates

The generated `package.json` shows four Angular 22 defaults:

```json
"devDependencies": {
  "@angular/build": "^22.2.2",
  "@angular/cli": "^22.2.2",
  "@angular/compiler-cli": "^22.2.0",
  "jsdom": "^30.0.0",
  "prettier": "^3.8.1",
  "typescript": "~6.0.2",
  "vitest": "^5.0.0"
}
```

- **Standalone**: there's no `app.module.ts`. The `--standalone` flag defaults to `true`, and components import each other directly.
- **Zoneless**: no `zone.js` in the dependencies; Angular detects changes without it.
- **OnPush**: `app.ts` has no `changeDetection`, because [OnPush is the default](https://angular.dev/best-practices/skipping-subtrees) since version 22.
- **Vitest**: the [test runner for new projects](https://angular.dev/guide/testing), with jsdom simulating a browser inside Node.js. `ng test --watch=false` runs the two tests generated in `app.spec.ts`:

```text
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

## ng serve

```bash
cd my-app
ng serve
```

```text
Initial chunk files | Names         | Raw size
main.js             | main          | 48.05 kB |
styles.css          | styles        | 95 bytes |

                    | Initial total | 48.14 kB

Application bundle generation complete. [2.386 seconds]

Watch mode enabled. Watching for file changes...
  ➜  Local:   http://localhost:4200/
```

The dev server builds the app, watches the files, rebuilds on every save and reloads the browser. `--open` (`-o`) opens the browser, and `--port` replaces port 4200. `npm start` runs the same `ng serve` through the script in `package.json`.

## ng version

`ng version` shows the CLI, Angular and Node.js versions, and each package's installed version next to what `package.json` requests:

```text
Angular CLI       : 22.2.3
Angular           : 22.2.3
Node.js           : 24.21.0
Package Manager   : npm 11.19.0

│ @angular/core             │ 22.2.3            │ ^22.2.0           │
│ typescript                │ 6.0.3             │ ~6.0.2            │
│ vitest                    │ 5.0.5             │ ^5.0.0            │
```

(The table is shortened.) `^22.2.0` is a range, so npm installed 22.2.3, the latest version in the range on install day.

### In older versions

This is the `package.json` that Angular 19's `ng new` generated (shortened):

```json
"dependencies": {
  "@angular/core": "^19.2.0",
  "@angular/platform-browser-dynamic": "^19.2.0",
  "zone.js": "~0.15.0"
},
"devDependencies": {
  "@angular-devkit/build-angular": "^19.2.27",
  "jasmine-core": "~5.6.0",
  "karma": "~6.4.0",
  "typescript": "~5.7.2"
}
```

`zone.js` was in the dependencies and under `polyfills` in `angular.json`, and tests ran with Karma and Jasmine in a real Chrome browser. I ran `ng new` in each version: Angular 20 still generated the same zone.js and Karma project, and Angular 21 was the first to generate a zoneless project with Vitest. Karma is [still supported](https://angular.dev/guide/testing) through `--test-runner=karma`.

Older projects were built around `NgModule`. `ng new --standalone=false` still creates that layout, with `app.module.ts` (`app-module.ts` in today's naming), and the next post shows what it looks like.

## Mistakes beginners make

- **Running `ng serve` outside the project folder.** The result: `Error: This command is not available when running the Angular CLI outside a workspace.` Run `cd my-app` first.
- **Running `ng new` inside an existing project.** The opposite: `Error: This command is not available when running the Angular CLI inside a workspace.` Create new projects from a folder that isn't an Angular project.
- **A Node.js version that's too old.** Angular 22 doesn't support Node.js 20. Run `node -v` before anything else.

## What's next

Next: a tour of the files `ng new` created, from `main.ts` to `angular.json`.
