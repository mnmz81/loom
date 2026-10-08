import { test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './axe';
import { gotoReady, LANGS, type Lang } from './helpers';

// Pages that exist in both languages: [name, path under /<lang>/]
const PAGES: [string, string][] = [
  ['home', ''],
  ['post', 'posts/rust-borrowing'],
  ['note', 'notes/git-undo-last-commit'],
  ['series', 'series/learning-rust'],
  ['tag', 'tags/rust'],
  ['search', 'search'],
  ['posts list', 'posts'],
];

for (const lang of LANGS) {
  for (const [name, path] of PAGES) {
    test(`/${lang} ${name}: no serious a11y violations`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await gotoReady(page, path ? `${lang}/${path}` : lang);
      await expectNoSeriousA11yViolations(page);
    });
  }

  test(`/${lang} search with results: no serious a11y violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const query = lang === 'he' ? 'בעלות' : 'history';
    await gotoReady(page, `${lang}/search?q=${encodeURIComponent(query)}`);
    await page.locator('mark').first().waitFor();
    await expectNoSeriousA11yViolations(page);
  });

  test(`/${lang} post in dark mode: no serious a11y violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await gotoReady(page, `${lang}/posts/rust-borrowing`);
    await expectNoSeriousA11yViolations(page);
  });
}

// Untranslated entries are served in their own language (lang/dir overridden on cards).
test('en posts list with a Hebrew-only entry: no serious a11y violations', async ({ page }) => {
  await gotoReady(page, 'en/posts');
  await expectNoSeriousA11yViolations(page);
});

test('he Hebrew-only post page: no serious a11y violations', async ({ page }) => {
  const lang: Lang = 'he';
  await gotoReady(page, `${lang}/posts/rust-ownership`);
  await expectNoSeriousA11yViolations(page);
});
