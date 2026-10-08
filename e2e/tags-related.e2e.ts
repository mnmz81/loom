import { expect, test } from '@playwright/test';
import { gotoReady, t } from './helpers';

test.describe('tag pages', () => {
  test('he /tags/rust lists the two Rust posts, newest first, and no others', async ({ page }) => {
    await gotoReady(page, 'he/tags/rust');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('he', 'tag.title', { tag: 'ראסט' }));
    await expect(page.getByRole('article').getByRole('heading', { level: 2 })).toHaveText([
      'ראסט: השאלה (Borrowing)',
      'ראסט: בעלות (Ownership)',
    ]);
  });

  test('en /tags/rust lists the English post and the Hebrew-only post, flagged', async ({ page }) => {
    await gotoReady(page, 'en/tags/rust');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('en', 'tag.title', { tag: 'Rust' }));
    await expect(page.getByRole('article').getByRole('heading', { level: 2 })).toHaveText([
      'Rust: borrowing',
      'ראסט: בעלות (Ownership)',
    ]);
    await expect(page.getByText(t('en', 'lang.onlyIn.he'), { exact: true })).toHaveCount(1);
  });

  test('a tag chip on a note opens its tag page; tags without a label show their key', async ({ page }) => {
    await gotoReady(page, 'en/notes/zsh-history-search');
    await page.getByRole('list', { name: t('en', 'entry.tags') }).getByRole('link', { name: /zsh/ }).click();
    await expect(page).toHaveURL(/\/en\/tags\/zsh$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('en', 'tag.title', { tag: 'zsh' }));
    await expect(page.getByRole('article').getByRole('heading', { level: 2 })).toHaveText(['Search zsh history with Ctrl+R']);
  });

  test('tag chips on the posts list link to tag pages', async ({ page }) => {
    await gotoReady(page, 'en/posts');
    await page.getByRole('list', { name: t('en', 'entry.tags') }).first().getByRole('link', { name: 'Rust' }).click();
    await expect(page).toHaveURL(/\/en\/tags\/rust$/);
  });
});

test.describe('related posts', () => {
  test('he: borrowing and ownership are related to each other', async ({ page }) => {
    await gotoReady(page, 'he/posts/rust-borrowing');
    const related = page.getByRole('region', { name: t('he', 'entry.related') });
    const link = related.getByRole('link', { name: /ראסט: בעלות/ });
    await expect(link).toHaveAttribute('href', /\/he\/posts\/rust-ownership$/);
    await link.click();
    await expect(page).toHaveURL(/\/he\/posts\/rust-ownership$/);
    await expect(page.getByRole('region', { name: t('he', 'entry.related') }).getByRole('link', { name: /ראסט: השאלה/ })).toBeVisible();
  });

  test('en: an untranslated related item is shown in Hebrew, marked lang=he', async ({ page }) => {
    await gotoReady(page, 'en/posts/rust-borrowing');
    const related = page.getByRole('region', { name: t('en', 'entry.related') });
    const link = related.getByRole('link', { name: /ראסט: בעלות/ });
    await expect(link).toHaveAttribute('href', /\/he\/posts\/rust-ownership$/);
    await expect(link.locator('[lang="he"][dir="rtl"]')).toBeVisible();
  });

  test('an entry without related items renders no related section', async ({ page }) => {
    await gotoReady(page, 'en/notes/zsh-history-search');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: t('en', 'entry.related') })).toHaveCount(0);
  });
});
