import { pageCount, pageText } from './page-text';
import { allLangPaths, describeHtml } from './seo-helpers';

describe('allLangPaths', () => {
  it('maps a path builder over both languages', () => {
    expect(allLangPaths((lang) => `/${lang}/search`)).toEqual({ he: '/he/search', en: '/en/search' });
  });
});

describe('describeHtml', () => {
  it('strips tags, decodes entities and collapses whitespace', () => {
    expect(describeHtml('<h2 id="a">Title</h2>\n<p>Use &amp; and &lt;b&gt;&nbsp;&quot;x&quot; it&#39;s</p>')).toBe(
      'Title Use & and <b> "x" it\'s',
    );
  });

  it('returns short text unchanged', () => {
    expect(describeHtml('<p>short</p>')).toBe('short');
  });

  it('cuts long text at a word boundary with an ellipsis', () => {
    const text = `<p>${'word '.repeat(60)}</p>`;
    const out = describeHtml(text, 50);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out).not.toMatch(/wor…$/);
  });

  it('hard-cuts text without spaces', () => {
    expect(describeHtml('x'.repeat(100), 20)).toBe(`${'x'.repeat(19)}…`);
  });
});

describe('pageText / pageCount', () => {
  it('fills placeholders per language', () => {
    expect(pageText('en', 'series.partN', { n: 3 })).toBe('Part 3');
    expect(pageText('he', 'series.partN', { n: 3 })).toBe('חלק 3');
    expect(pageText('en', 'series.partN')).toBe('Part {n}');
    expect(pageText('en', 'series.partN', {})).toBe('Part {n}');
  });

  it('picks singular for one and plural otherwise', () => {
    expect(pageCount('en', 1, 'entries.one', 'entries.other')).toBe('1 entry');
    expect(pageCount('en', 0, 'entries.one', 'entries.other')).toBe('0 entries');
    expect(pageCount('he', 5, 'entries.one', 'entries.other')).toBe('5 רשומות');
  });
});
