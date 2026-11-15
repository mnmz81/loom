import { expect, test } from '@playwright/test';
import { gotoReady, t } from './helpers';

test('certificate pictures load, and a click opens the large view (Escape closes it)', async ({
  page,
}) => {
  await gotoReady(page, 'en/certificates');
  const first = page.locator('button.certificates__image').first();
  await expect(first.locator('img')).toHaveJSProperty('complete', true);
  expect(
    await first.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);

  await first.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: t('en', 'certificates.close') })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(first).toBeFocused(); // the browser returns focus to the opener
});
