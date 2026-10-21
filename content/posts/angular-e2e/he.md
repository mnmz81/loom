---
title: "בדיקות end-to-end ב-Angular עם Playwright"
summary: "איך מריצים בדיקות E2E על אפליקציית Angular בדפדפן אמיתי עם Playwright: הגדרת webServer, ‏locators ו-assertions עם המתנה אוטומטית, ‏ng e2e והסיבה שאין כלי ברירת מחדל."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 60 }
---

בדיקות יחידה מריצות קומפוננטה בודדת ב-jsdom. בדיקת end-to-end (‏E2E) מפעילה את האפליקציה כולה בדפדפן אמיתי וגולשת בה כמו משתמש: ניווט, לחיצות וטפסים. היא איטית יותר ושברירית יותר, ולכן כותבים מעט כאלה, על מסלולים חשובים כמו כניסה, הזמנה ותשלום.

כל דוגמה נבדקה עם Angular 22.2, ‏Playwright 1.63 ו-Chromium.

## ‏ng e2e לא מגיע עם כלי

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

‏[התיעוד](https://angular.dev/tools/cli/end-to-end) אומר ש-`ng e2e` מריץ את ה-builder שהוגדר ב-target בשם `e2e`, ושאף חבילה לא זוכה ליחס מיוחד. פרויקט חדש לא מגיע עם target כזה.

## ‏Playwright ידנית

[Playwright](https://playwright.dev/docs/intro) הוא כלי של Microsoft שמפעיל Chromium, ‏Firefox ו-WebKit. מתקינים `npm i -D @playwright/test` ו-`npx playwright install` (שמוריד את הדפדפנים), ומוסיפים קובץ הגדרות:

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

‏[`webServer`](https://playwright.dev/docs/test-webserver) מפעיל את `ng serve` לפני הבדיקות וממתין עד שהכתובת עונה. ‏`reuseExistingServer` משתמש בשרת שכבר רץ בפיתוח, אבל ב-CI מפעיל חדש. ‏`baseURL` מאפשר `page.goto('/')`.

## בדיקה ראשונה

האפליקציה היא המונה מ[הפוסט הראשון](he/posts/angular-what-is-angular/), עם כותרת `Counter`:

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

- ‏[`getByRole`](https://playwright.dev/docs/locators) מחפש לפי תפקיד ושם נגיש, כמו שמשתמש וקורא מסך רואים את הדף. התיעוד ממליץ להעדיף locators כאלה על פני selectors של CSS.
- ‏locators ממתינים ומנסים שוב: ‏`click` מחכה שהכפתור יהיה לחיץ, ו-`expect(...).toBeVisible()` בודק שוב עד שהתנאי מתקיים או עד ה-timeout. לכן אין `sleep` ואין `whenStable` כמו בבדיקות היחידה.
- הבדיקה לא יודעת על signals או על Angular בכלל, אלא רק על מה שהדפדפן מציג.

## ‏ng e2e עם schematic

כדי ש-`ng e2e` יעבוד, מוסיפים את החבילה שהתיעוד מציע:

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

הוא מגדיר ב-`angular.json` target בשם `e2e`:

```json
"e2e": {
  "builder": "playwright-ng-schematics:playwright",
  "options": { "devServerTarget": "ng-template:serve" }
}
```

עכשיו `ng e2e` בונה ומפעיל את שרת הפיתוח, ומריץ את Playwright מולו. ב-`playwright.config.ts` שלו יש שלושה projects (Chromium, ‏Firefox, ‏WebKit), ו-`--test-project=chromium` מצמצם לאחד:

```bash
ng e2e --test-project=chromium
```

```text
Running 1 test using 1 worker

  ✓  1 [chromium] › e2e/counter.spec.ts:3:5 › shows the message after three clicks (429ms)

  1 passed (895ms)
```

אותו עיקרון עובד עם כל כלי אחר מהרשימה: ה-schematic רק מחבר אותו ל-`ng e2e`.

### בגרסאות קודמות

בפרויקטים ישנים הכלי היה Protractor: תיקיית `e2e/` הייתה חלק מהפרויקט ו-`ng e2e` עבד מיד. בדיקה בסגנון שלו (לא הורצה כאן):

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

לפי ה-[changelog של ה-CLI](https://github.com/angular/angular-cli/blob/main/CHANGELOG.md), גרסה 19 הסירה את ה-builder ואת ה-schematics של Protractor, שהוכרז כ-end-of-life באוגוסט 2023. פרויקט שעדיין משתמש בו צריך לעבור לכלי אחר, למשל Playwright.

## טעויות נפוצות של מתחילים

- **להשתמש ב-`page.waitForTimeout`.** המתנה קבועה איטית ושברירית. `expect(locator)` כבר מחכה בדיוק כמה שצריך.
- **למצוא אלמנטים לפי מבנה ה-CSS.** ‏`div > button:nth-child(2)` נשבר בכל שינוי עיצוב; ‏`getByRole` ו-`getByLabel` שורדים אותו.
- **לבדוק ב-E2E מה ש-unit test יכול לבדוק.** כל לוגיקה שאפשר לבדוק בלי דפדפן שייכת ל[בדיקות היחידה](he/posts/angular-testing-components/).

## מה הלאה

בפוסט הבא: נגישות ו-Angular Aria.
