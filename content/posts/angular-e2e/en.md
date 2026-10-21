---
title: "End-to-end tests in Angular with Playwright"
summary: "How to run E2E tests on an Angular app in a real browser with Playwright: the webServer setting, locators and assertions that wait automatically, ng e2e, and why there's no default tool."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 60 }
---

Unit tests run a single component in jsdom. An end-to-end (E2E) test starts the whole app in a real browser and browses it like a user: navigation, clicks and forms. It's slower and more fragile, so you write few of them, for important flows such as login, ordering and payment.

Every example was checked with Angular 22.2, Playwright 1.63 and Chromium.

## ng e2e comes with no tool

```bash
ng e2e
```

```text
Cannot find "e2e" target for the specified project.
You can add a package that implements these capabilities.

For example:
  Playwright: ng add playwright-ng-schematics
  Cypress: ng add @cypress/schematic
  Nightwatch: ng add @nightwatch/schematics
  WebdriverIO: ng add @wdio/schematics
  Puppeteer: ng add @puppeteer/ng-schematics
```

[The docs](https://angular.dev/tools/cli/end-to-end) say `ng e2e` runs the builder configured in a target named `e2e`, and that no package gets special treatment. A new project has no such target.

## Playwright by hand

[Playwright](https://playwright.dev/docs/intro) is a Microsoft tool that drives Chromium, Firefox and WebKit. Install `npm i -D @playwright/test` and `npx playwright install` (which downloads the browsers), and add a config file:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:4200' },
  webServer: {
    command: 'npx ng serve',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
  },
});
```

[`webServer`](https://playwright.dev/docs/test-webserver) starts `ng serve` before the tests and waits until the URL responds. `reuseExistingServer` uses a server that's already running during development, but starts a fresh one on CI. `baseURL` allows `page.goto('/')`.

## A first test

The app is the counter from [the first post](en/posts/angular-what-is-angular/), with a `Counter` heading:

```typescript
import { expect, test } from '@playwright/test';

test('shows the message after three clicks', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Clicked 0 times')).toBeVisible();

  const button = page.getByRole('button', { name: '+1' });
  await button.click();
  await button.click();
  await expect(page.getByText('That is enough clicks.')).toBeHidden();

  await button.click();
  await expect(page.getByText('Clicked 3 times')).toBeVisible();
  await expect(page.getByText('That is enough clicks.')).toBeVisible();
});
```

```bash
npx playwright test
```

```text
Running 1 test using 1 worker

  ✓  1 e2e/counter.spec.ts:3:5 › shows the message after three clicks (374ms)

  1 passed (3.9s)
```

- [`getByRole`](https://playwright.dev/docs/locators) searches by role and accessible name, the way a user and a screen reader see the page. The docs recommend preferring such locators over CSS selectors.
- Locators wait and retry: `click` waits for the button to be clickable, and `expect(...).toBeVisible()` checks again until the condition holds or the timeout hits. So there's no `sleep` and no `whenStable` as in unit tests.
- The test knows nothing about signals or Angular at all, only about what the browser shows.

## ng e2e with a schematic

To make `ng e2e` work, add the package the docs suggest:

```bash
ng add playwright-ng-schematics
```

```text
CREATE playwright.config.ts (1933 bytes)
CREATE e2e/example.spec.ts (208 bytes)
CREATE e2e/tsconfig.json (64 bytes)
UPDATE angular.json (2339 bytes)
UPDATE package.json (886 bytes)
UPDATE .gitignore (691 bytes)
```

It defines a target named `e2e` in `angular.json`:

```json
"e2e": {
  "builder": "playwright-ng-schematics:playwright",
  "options": { "devServerTarget": "ng-template:serve" }
}
```

Now `ng e2e` builds and starts the dev server, and runs Playwright against it. Its `playwright.config.ts` has three projects (Chromium, Firefox, WebKit), and `--test-project=chromium` narrows it to one:

```bash
ng e2e --test-project=chromium
```

```text
Running 1 test using 1 worker

  ✓  1 [chromium] › e2e/counter.spec.ts:3:5 › shows the message after three clicks (429ms)

  1 passed (895ms)
```

The same idea works with any other tool in the list: the schematic only connects it to `ng e2e`.

### In older versions

In older projects the tool was Protractor: an `e2e/` folder was part of the project and `ng e2e` worked right away. A test in its style (not run here):

```typescript
import { browser, by, element } from 'protractor';

describe('counter', () => {
  it('counts clicks', async () => {
    await browser.get('/');
    await element(by.css('button')).click();
    expect(await element(by.css('p')).getText()).toEqual('Clicked 1 times');
  });
});
```

Per the [CLI changelog](https://github.com/angular/angular-cli/blob/main/CHANGELOG.md), version 19 removed Protractor's builder and schematics, after it was declared end-of-life in August 2023. A project that still uses it needs to move to another tool, such as Playwright.

## Mistakes beginners make

- **Using `page.waitForTimeout`.** A fixed wait is slow and fragile. `expect(locator)` already waits exactly as long as needed.
- **Finding elements by CSS structure.** `div > button:nth-child(2)` breaks on every design change; `getByRole` and `getByLabel` survive it.
- **Testing in E2E what a unit test can test.** Any logic you can check without a browser belongs in the [unit tests](en/posts/angular-testing-components/).

## What's next

Next: accessibility and Angular Aria.
