import type { LangIndex, SeriesIndex } from '../core/content.models';
import enIndex from '../../testing/fixtures/content/en/index.json';
import heIndex from '../../testing/fixtures/content/he/index.json';
import series from '../../testing/fixtures/content/series.json';
import { entryParams, entrySlugs, seriesParams, tagParams } from './prerender-params';

const he = heIndex as LangIndex;
const en = enIndex as LangIndex;

describe('prerender params', () => {
  it('entrySlugs lists only entries that have their own text in the language', () => {
    // rust-ownership exists only in Hebrew: listed in the en index (fallback) but no /en/ page.
    expect(entrySlugs(he, 'post').sort()).toEqual(['angular-signals-basics', 'rust-borrowing', 'rust-ownership']);
    expect(entrySlugs(en, 'post').sort()).toEqual(['angular-signals-basics', 'rust-borrowing']);
    // zsh-history-search exists only in English.
    expect(entrySlugs(he, 'note')).toEqual(['git-undo-last-commit']);
    expect(entrySlugs(en, 'note').sort()).toEqual(['git-undo-last-commit', 'zsh-history-search']);
  });

  it('entryParams pairs every language with its slugs', () => {
    const params = entryParams([he, en], 'note');
    expect(params).toEqual([
      { lang: 'he', slug: 'git-undo-last-commit' },
      { lang: 'en', slug: 'zsh-history-search' },
      { lang: 'en', slug: 'git-undo-last-commit' },
    ]);
  });

  it('tagParams has every tag in every language (fallback entries count)', () => {
    const params = tagParams([he, en]);
    expect(params.filter((p) => p.lang === 'he').map((p) => p.tag)).toEqual(he.tags.map((t) => t.tag));
    expect(params.filter((p) => p.lang === 'en').map((p) => p.tag)).toContain('rust');
    expect(params.length).toBe(he.tags.length + en.tags.length);
  });

  it('seriesParams repeats each series per language', () => {
    expect(seriesParams(['he', 'en'], series as SeriesIndex)).toEqual([
      { lang: 'he', key: 'learning-rust' },
      { lang: 'en', key: 'learning-rust' },
    ]);
    expect(seriesParams(['he'], [])).toEqual([]);
  });
});
