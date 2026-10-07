import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './axe';

// Paths are relative to baseURL (http://localhost:4321/notebook/).

test('root redirects to the Hebrew home', async ({ page }) => {
  await page.goto('');
  await expect(page).toHaveURL(/\/notebook\/he\/?$/);
});

const LANGS = [
  { lang: 'he', dir: 'rtl' },
  { lang: 'en', dir: 'ltr' },
] as const;

for (const { lang, dir } of LANGS) {
  test(`/${lang} sets <html lang="${lang}" dir="${dir}">`, async ({ page }) => {
    await page.goto(lang);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('html')).toHaveAttribute('dir', dir);
  });

  test(`/${lang} has no serious a11y violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(lang);
    await expectNoSeriousA11yViolations(page);
  });
}

test('unknown URLs get the 404 page', async ({ page }) => {
  const response = await page.goto('this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.locator('html')).toHaveAttribute('lang', /^(he|en)$/);
});
