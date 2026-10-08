import { expect, test } from '@playwright/test';
import { expectLang, gotoReady, langSwitch, navLink, SEARCH_TEXT, t, type Lang } from './helpers';

// Queries that exist only in seed content: [lang, query, expected result title]
const CASES: [Lang, string, string][] = [
  ['he', 'בעלות', 'ראסט: בעלות (Ownership)'],
  ['en', 'zsh','Search zsh history with Ctrl+R'],
];

for (const [lang, query, title] of CASES) {
  test(`/${lang}/search finds "${query}", highlights it, and links to the entry`, async ({ page }) => {
    await gotoReady(page, `${lang}/search`);
    await expect(page.getByText(SEARCH_TEXT[lang].hint)).toBeVisible();

    await page.getByRole('searchbox', { name: SEARCH_TEXT[lang].label }).fill(query);
    const result = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: title }) });
    await expect(result).toBeVisible(); // waits for debounce + pagefind
    await expect(result.locator('mark').first()).toBeVisible();
    await expect(page.getByRole('status')).toHaveText(SEARCH_TEXT[lang].resultsOne);
    await expect(page).toHaveURL(new RegExp(`search\\?q=${encodeURIComponent(query)}`));

    await result.getByRole('link', { name: title }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  });
}

test('he search does not return English-index results (and vice versa)', async ({ page }) => {
  await gotoReady(page, 'he/search');
  await page.getByRole('searchbox').fill('zsh');
  await expect(page.getByRole('status')).toHaveText(t('he', 'search.noResults', { query: 'zsh' }));

  await gotoReady(page, 'en/search');
  await page.getByRole('searchbox').fill('בעלות');
  await expect(page.getByRole('status')).toHaveText(t('en', 'search.noResults', { query: 'בעלות' }));
});

test('"?q=" prefills and runs the search', async ({ page }) => {
  await gotoReady(page, 'en/search?q=signals');
  await expect(page.getByRole('searchbox')).toHaveValue('signals');
  await expect(page.getByRole('link', { name: 'Angular signals — the basics' })).toBeVisible();
});

test.describe('filters', () => {
  test('type filter narrows results: a query matching only posts finds nothing among notes', async ({ page }) => {
    await gotoReady(page, 'en/search');
    await page.getByRole('searchbox').fill('borrowing');
    await expect(page.getByRole('link', { name: 'Rust: borrowing' })).toBeVisible();

    const type = page.getByLabel(SEARCH_TEXT.en.type, { exact: true });
    await type.selectOption({ label: t('en', 'type.note') });
    await expect(page.getByRole('status')).toHaveText(t('en', 'search.noResults', { query: 'borrowing' }));
    await expect(page.getByRole('link', { name: 'Rust: borrowing' })).toHaveCount(0);

    await type.selectOption({ label: SEARCH_TEXT.en.typeAll });
    await expect(page.getByRole('link', { name: 'Rust: borrowing' })).toBeVisible();
  });

  test('type filter alone (no query) lists that type; tag filter narrows further', async ({ page }) => {
    await gotoReady(page, 'en/search');
    await page.getByLabel(SEARCH_TEXT.en.type, { exact: true }).selectOption({ label: t('en', 'type.note') });
    await expect(page.getByRole('link', { name: 'Undo the last git commit' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Search zsh history with Ctrl+R' })).toBeVisible();

    await page.getByLabel(SEARCH_TEXT.en.tag, { exact: true }).selectOption({ label: 'git' });
    await expect(page.getByRole('link', { name: 'Search zsh history with Ctrl+R' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Undo the last git commit' })).toBeVisible();
  });

  test('he: tag filter works and the filter labels are Hebrew', async ({ page }) => {
    await gotoReady(page, 'he/search');
    await page.getByLabel(SEARCH_TEXT.he.tag, { exact: true }).selectOption({ label: 'ראסט' });
    await expect(page.getByRole('link', { name: 'ראסט: בעלות (Ownership)' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ראסט: השאלה (Borrowing)' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'סיגנלים באנגולר — היסודות' })).toHaveCount(0);
  });
});

test('a query with no hits shows the empty message', async ({ page }) => {
  await gotoReady(page, 'en/search');
  await page.getByRole('searchbox').fill('qqqzzzxxx');
  await expect(page.getByRole('status')).toHaveText(t('en', 'search.noResults', { query: 'qqqzzzxxx' }));
});

test('language switch keeps working from the search page', async ({ page }) => {
  await gotoReady(page, 'he/search');
  await page.getByRole('searchbox').fill('בעלות');
  await expect(page.getByRole('link', { name: 'ראסט: בעלות (Ownership)' })).toBeVisible();

  await langSwitch(page, 'he').click();
  await expect(page).toHaveURL(/\/loom\/en\/search/);
  await expectLang(page, 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('en', 'search.title'));

  // Search still works in the new language.
  await page.getByRole('searchbox').fill('history');
  await expect(page.getByRole('link', { name: 'Search zsh history with Ctrl+R' })).toBeVisible();

  await langSwitch(page, 'en').click();
  await expect(page).toHaveURL(/\/loom\/he\/search/);
  await expectLang(page, 'he');
});

test('search is reachable from the main navigation', async ({ page }) => {
  await gotoReady(page, 'en');
  await (await navLink(page, 'en', 'nav.search')).click();
  await expect(page).toHaveURL(/\/en\/search$/);
  await expect(page.getByRole('searchbox')).toBeVisible();
});
