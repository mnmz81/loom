import { expect, test, type Page } from '@playwright/test';
import { gotoReady, LANGS, t, type Lang } from './helpers';

test.describe('dark mode', () => {
  test.use({ colorScheme: 'light' });

  for (const lang of LANGS) {
    test(`/${lang}: toggle sets data-theme, flips the label and persists across reload`, async ({ page }) => {
      await gotoReady(page, lang);
      const html = page.locator('html');
      await page.getByRole('button', { name: t(lang, 'theme.toDark') }).click();
      await expect(html).toHaveAttribute('data-theme', 'dark');
      await expect(page.getByRole('button', { name: t(lang, 'theme.toLight') })).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

      await page.reload();
      // Pre-paint script applies it before hydration.
      await expect(html).toHaveAttribute('data-theme', 'dark');
      await expect(page.getByRole('button', { name: t(lang, 'theme.toLight') })).toBeVisible();

      await page.getByRole('button', { name: t(lang, 'theme.toLight') }).click();
      await expect(html).toHaveAttribute('data-theme', 'light');
      await page.reload();
      await expect(html).toHaveAttribute('data-theme', 'light');
    });
  }

  test('theme choice carries over to other pages', async ({ page }) => {
    await gotoReady(page, 'en');
    await page.getByRole('button', { name: t('en', 'theme.toDark') }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await gotoReady(page, 'he/posts/rust-borrowing');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('dark mode follows the system preference when nothing is stored', () => {
  test.use({ colorScheme: 'dark' });
  test('prefers-color-scheme: dark → data-theme dark', async ({ page }) => {
    await gotoReady(page, 'en');
    await expect(page.getByRole('button', { name: t('en', 'theme.toLight') })).toBeVisible();
  });
});

test.describe('mobile width (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  async function expectNoHorizontalScroll(page: Page): Promise<void> {
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return { scroll: doc.scrollWidth, client: doc.clientWidth, body: document.body.scrollWidth };
    });
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
    expect(overflow.body).toBeLessThanOrEqual(overflow.client);
  }

  const PAGES = ['', 'posts', 'posts/rust-borrowing', 'posts/rust-ownership', 'notes/zsh-history-search', 'series/learning-rust', 'search'];
  for (const lang of LANGS) {
    for (const path of PAGES) {
      // en/posts/rust-ownership and he/notes/zsh-history-search do not exist.
      if ((lang === 'en' && path === 'posts/rust-ownership') || (lang === 'he' && path === 'notes/zsh-history-search')) continue;
      test(`/${lang}/${path}: no horizontal scroll`, async ({ page }) => {
        await gotoReady(page, path ? `${lang}/${path}` : lang);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoHorizontalScroll(page);
      });
    }
  }

  test('he post is laid out RTL: article text starts at the right edge', async ({ page }) => {
    await gotoReady(page, 'he/posts/rust-borrowing');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const h1 = page.getByRole('heading', { level: 1 });
    expect(await h1.evaluate((el) => getComputedStyle(el).textAlign)).toMatch(/^(start|right)$/);
    const box = await h1.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeGreaterThan(375 / 2); // heading sits on the right half
  });

  for (const lang of LANGS) {
    test(`/${lang}: menu button toggles the nav, links navigate, Escape closes`, async ({ page }) => {
      await gotoReady(page, lang);
      const menu = page.getByRole('button', { name: t(lang, 'nav.menu') });
      const nav = page.getByRole('navigation', { name: t(lang, 'nav.main') });
      const posts = nav.getByRole('link', { name: t(lang, 'nav.posts'), exact: true });

      await expect(menu).toBeVisible();
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect(posts).toBeHidden();

      await menu.click();
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      await expect(posts).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect(posts).toBeHidden();
      await expect(menu).toBeFocused();

      await menu.click();
      await posts.click();
      await expect(page).toHaveURL(new RegExp(`/${lang}/posts$`));
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
    });
  }

  test('language switch and theme toggle are usable without opening the menu', async ({ page }) => {
    const lang: Lang = 'he';
    await gotoReady(page, lang);
    await page.getByRole('button', { name: t(lang, 'theme.toDark') }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('banner').getByRole('link', { name: t(lang, 'lang.name.en'), exact: true }).click();
    await expect(page).toHaveURL(/\/en$/);
  });
});
