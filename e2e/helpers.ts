// Shared helpers for e2e specs. Labels come from the app's own i18n dictionaries so tests follow copy changes.
import { expect, type Locator, type Page } from '@playwright/test';
import { en } from '../src/app/core/i18n/en';
import { he } from '../src/app/core/i18n/he';
import type { DictKey } from '../src/app/core/i18n/i18n.types';

export type Lang = 'he' | 'en';

export const LANGS: readonly Lang[] = ['he', 'en'];
export const DICT = { he, en } as const;
export const DIR = { he: 'rtl', en: 'ltr' } as const;

/** Dictionary string with `{name}` placeholders filled in. */
export function t(lang: Lang, key: DictKey, params: Record<string, string | number> = {}): string {
  return DICT[lang][key].replace(/\{(\w+)\}/g, (m, name: string) => String(params[name] ?? m));
}

/** Search-page strings (src/app/pages/page-text.ts is not part of the Dict contract). */
export const SEARCH_TEXT = {
  he: { label: 'חיפוש באתר', type: 'סוג', tag: 'תגית', typeAll: 'הכל', resultsOne: 'תוצאה אחת', tagAll: 'כל התגיות', hint: 'הקלידו כדי לחפש בפוסטים ובהערות.' },
  en: { label: 'Search the site', type: 'Type', tag: 'Tag', typeAll: 'All', resultsOne: '1 result', tagAll: 'All tags', hint: 'Type to search posts and notes.' },
} as const;

export const SERIES_TITLE = { he: 'לומדים ראסט', en: 'Learning Rust' } as const;

/** Navigates (path relative to baseURL) and waits until Angular has hydrated, so clicks are not lost. */
export async function gotoReady(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => !!document.querySelector('[ng-version]'));
}

/** Opens the mobile menu when the viewport shows the menu button; no-op on desktop. */
export async function openNavIfCollapsed(page: Page, lang: Lang): Promise<void> {
  const menu = page.getByRole('button', { name: t(lang, 'nav.menu') });
  if (await menu.isVisible()) {
    if ((await menu.getAttribute('aria-expanded')) !== 'true') await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
  }
}

/** Main-nav link by dictionary key, opening the mobile menu first if needed. */
export async function navLink(page: Page, lang: Lang, key: DictKey): Promise<Locator> {
  await openNavIfCollapsed(page, lang);
  return page.getByRole('navigation', { name: t(lang, 'nav.main') }).getByRole('link', { name: t(lang, key), exact: true });
}

/** The header's language switch link (its text is the OTHER language's name). */
export function langSwitch(page: Page, lang: Lang): Locator {
  const other: Lang = lang === 'he' ? 'en' : 'he';
  return page.getByRole('banner').getByRole('link', { name: t(lang, `lang.name.${other}`), exact: true });
}

export async function expectLang(page: Page, lang: Lang): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
  await expect(page.locator('html')).toHaveAttribute('dir', DIR[lang]);
}
