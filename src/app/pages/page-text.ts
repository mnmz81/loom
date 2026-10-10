// Page-level UI strings that are not in the shared `Dict` contract (src/app/core/i18n).
// Add a key to `he` first; `en` fails to compile until it has the same keys.
import type { Lang } from '../core/content.models';

const he = {
  'entries.one': 'רשומה אחת',
  'entries.other': '{n} רשומות',
  'series.partsOne': 'חלק אחד',
  'series.partsOther': '{n} חלקים',
  'series.partN': 'חלק {n}',
  'search.label': 'חיפוש באתר',
  'search.hint': 'הקלידו כדי לחפש בפוסטים ובהערות.',
  'search.type': 'סוג',
  'search.typeAll': 'הכל',
  'search.tag': 'תגית',
  'search.tagAll': 'כל התגיות',
  'search.loading': 'מחפש…',
  'search.resultsOne': 'תוצאה אחת',
  'search.resultsOther': '{n} תוצאות',
  'search.error': 'החיפוש נכשל. נסו שוב.',
} as const;

export type PageTextKey = keyof typeof he;

const en: Record<PageTextKey, string> = {
  'entries.one': '1 entry',
  'entries.other': '{n} entries',
  'series.partsOne': '1 part',
  'series.partsOther': '{n} parts',
  'series.partN': 'Part {n}',
  'search.label': 'Search the site',
  'search.hint': 'Type to search posts and notes.',
  'search.type': 'Type',
  'search.typeAll': 'All',
  'search.tag': 'Tag',
  'search.tagAll': 'All tags',
  'search.loading': 'Searching…',
  'search.resultsOne': '1 result',
  'search.resultsOther': '{n} results',
  'search.error': 'Search failed. Please try again.',
};

const TEXT: Record<Lang, Record<PageTextKey, string>> = { he, en };

/** Page string in `lang`; `{name}` placeholders are filled from `params`. */
export function pageText(lang: Lang, key: PageTextKey, params?: Record<string, string | number>): string {
  const text = TEXT[lang][key];
  return params ? text.replace(/\{(\w+)\}/g, (m, name: string) => String(params[name] ?? m)) : text;
}

/** '1 entry' / '{n} entries' style count, picking the singular key when n is 1. */
export function pageCount(lang: Lang, n: number, one: PageTextKey, other: PageTextKey): string {
  return n === 1 ? pageText(lang, one) : pageText(lang, other, { n });
}
