import { expect, test } from '@playwright/test';
import { gotoReady, LANGS, SERIES_TITLE, t, type Lang } from './helpers';

test.describe('code blocks', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  for (const lang of LANGS) {
    test(`/${lang}: code blocks are dir=ltr and the copy button copies the code`, async ({ page }) => {
      await gotoReady(page, `${lang}/posts/rust-borrowing`);
      const pre = page.locator('article pre').first();
      await expect(pre).toBeVisible();
      const dirs = await page.locator('article pre').evaluateAll((els) => els.map((el) => el.getAttribute('dir')));
      expect(dirs.length).toBeGreaterThan(0);
      for (const dir of dirs) expect(dir).toBe('ltr');
      await expect(pre.locator('xpath=..')).toHaveAttribute('dir', 'ltr');

      const copy = page.getByRole('button', { name: t(lang, 'code.copy') }).first();
      await expect(copy).toBeVisible(); // added after hydration
      const expected = await pre.evaluate((el) => el.textContent);
      await copy.click();
      await expect(page.getByRole('button', { name: t(lang, 'code.copied') }).first()).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
      // The label reverts on its own.
      await expect(page.getByRole('button', { name: t(lang, 'code.copy') }).first()).toBeVisible();
    });
  }

  test('Hebrew post keeps code LTR inside an RTL article', async ({ page }) => {
    await gotoReady(page, 'he/posts/rust-ownership');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const direction = await page.locator('article pre').first().evaluate((el) => getComputedStyle(el).direction);
    expect(direction).toBe('ltr');
  });
});

test.describe('series navigation', () => {
  const part = (lang: Lang, index: number) => t(lang, 'series.part', { index, total: 2 });

  test('he: part 2 of 2 has a previous link to part 1 and no next', async ({ page }) => {
    await gotoReady(page, 'he/posts/rust-borrowing');
    const nav = page.getByRole('navigation', { name: new RegExp(SERIES_TITLE.he) });
    await expect(nav.getByRole('link', { name: SERIES_TITLE.he })).toHaveAttribute('href', /\/loom\/he\/series\/learning-rust$/);
    await expect(nav.getByText(part('he', 2))).toBeVisible();
    const prev = nav.getByRole('link', { name: new RegExp(t('he', 'series.prev')) });
    await expect(prev).toHaveAttribute('href', /\/loom\/he\/posts\/rust-ownership$/);
    await expect(nav.getByRole('link', { name: new RegExp(t('he', 'series.next')) })).toHaveCount(0);

    await prev.click();
    await expect(page).toHaveURL(/\/he\/posts\/rust-ownership$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ראסט: בעלות (Ownership)');
  });

  test('he: part 1 of 2 has a next link to part 2 and no previous', async ({ page }) => {
    await gotoReady(page, 'he/posts/rust-ownership');
    const nav = page.getByRole('navigation', { name: new RegExp(SERIES_TITLE.he) });
    await expect(nav.getByText(part('he', 1))).toBeVisible();
    await expect(nav.getByRole('link', { name: new RegExp(t('he', 'series.prev')) })).toHaveCount(0);
    const next = nav.getByRole('link', { name: new RegExp(t('he', 'series.next')) });
    await expect(next).toHaveAttribute('href', /\/loom\/he\/posts\/rust-borrowing$/);
    await next.click();
    await expect(page).toHaveURL(/\/he\/posts\/rust-borrowing$/);
  });

  test('en: the untranslated previous part links to the Hebrew post, marked lang=he', async ({ page }) => {
    await gotoReady(page, 'en/posts/rust-borrowing');
    const nav = page.getByRole('navigation', { name: new RegExp(SERIES_TITLE.en) });
    await expect(nav.getByText(part('en', 2))).toBeVisible();
    const prev = nav.getByRole('link', { name: new RegExp(t('en', 'series.prev')) });
    await expect(prev).toHaveAttribute('href', /\/loom\/he\/posts\/rust-ownership$/);
    await expect(prev).toHaveAttribute('hreflang', 'he');
    await expect(prev.locator('[lang="he"][dir="rtl"]')).toHaveText('ראסט: בעלות (Ownership)');
  });
});

test.describe('series pages', () => {
  for (const lang of LANGS) {
    test(`/${lang}/series → learning-rust lists the parts in order`, async ({ page }) => {
      await gotoReady(page, `${lang}/series`);
      await page.getByRole('link', { name: SERIES_TITLE[lang] }).click();
      await expect(page).toHaveURL(new RegExp(`/${lang}/series/learning-rust$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(SERIES_TITLE[lang]);

      const parts = page.getByRole('main').getByRole('listitem').filter({ has: page.getByRole('article') });
      await expect(parts).toHaveCount(2);
      // Part 1 exists only in Hebrew, so it appears (flagged) in both languages; part 2 is translated.
      await expect(parts.nth(0)).toContainText(lang === 'he' ? 'חלק 1' : 'Part 1');
      await expect(parts.nth(0)).toContainText('ראסט: בעלות (Ownership)');
      await expect(parts.nth(1)).toContainText(lang === 'he' ? 'חלק 2' : 'Part 2');
      await expect(parts.nth(1)).toContainText(lang === 'he' ? 'ראסט: השאלה (Borrowing)' : 'Rust: borrowing');
    });
  }
});
