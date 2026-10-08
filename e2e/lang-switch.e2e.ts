import { expect, test } from '@playwright/test';
import { expectLang, gotoReady, langSwitch, t } from './helpers';

test.describe('language switch', () => {
  test('translated post: he → en lands on the English translation, and back', async ({ page }) => {
    await gotoReady(page, 'he/posts/rust-borrowing');
    await expectLang(page, 'he');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ראסט: השאלה (Borrowing)');

    await langSwitch(page, 'he').click();
    await expect(page).toHaveURL(/\/loom\/en\/posts\/rust-borrowing$/);
    await expectLang(page, 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rust: borrowing');

    await langSwitch(page, 'en').click();
    await expect(page).toHaveURL(/\/loom\/he\/posts\/rust-borrowing$/);
    await expectLang(page, 'he');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ראסט: השאלה (Borrowing)');
  });

  test('Hebrew-only post: switching to en lands on the English posts list with the "Hebrew only" badge', async ({ page }) => {
    await gotoReady(page, 'he/posts/rust-ownership');
    await langSwitch(page, 'he').click();
    await expect(page).toHaveURL(/\/loom\/en\/posts$/);
    await expectLang(page, 'en');

    // The untranslated Hebrew post is still listed on the en list, flagged and rendered RTL.
    const card = page.getByRole('article').filter({ hasText: 'ראסט: בעלות (Ownership)' });
    await expect(card).toBeVisible();
    await expect(card.getByText(t('en', 'lang.onlyIn.he'), { exact: true })).toBeVisible();
    await expect(card.getByRole('heading', { level: 2 })).toHaveAttribute('lang', 'he');
    await expect(card.getByRole('heading', { level: 2 })).toHaveAttribute('dir', 'rtl');

    // The translated post has no badge.
    const translated = page.getByRole('article').filter({ hasText: 'Rust: borrowing' });
    await expect(translated).toBeVisible();
    await expect(translated.getByText(t('en', 'lang.onlyIn.he'))).toHaveCount(0);
  });

  test('English-only note: switching to he lands on the Hebrew notes list', async ({ page }) => {
    await gotoReady(page, 'en/notes/zsh-history-search');
    await expectLang(page, 'en');
    await langSwitch(page, 'en').click();
    await expect(page).toHaveURL(/\/loom\/he\/notes$/);
    await expectLang(page, 'he');

    const card = page.getByRole('article').filter({ hasText: 'Search zsh history with Ctrl+R' });
    await expect(card).toBeVisible();
    await expect(card.getByText(t('he', 'lang.onlyIn.en'), { exact: true })).toBeVisible();
    await expect(card.getByRole('heading', { level: 2 })).toHaveAttribute('lang', 'en');
    await expect(card.getByRole('heading', { level: 2 })).toHaveAttribute('dir', 'ltr');
  });

  test('no English page is generated for a Hebrew-only post', async ({ page }) => {
    const response = await page.goto('en/posts/rust-ownership');
    expect(response?.status()).toBe(404);
  });
});
