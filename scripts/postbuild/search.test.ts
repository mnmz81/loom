import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSearchIndex, expectedLanguages, inspectHtml, languageCounts, missingLanguages, scanHtml } from './search';

const page = (lang: string, body: string, marked = true) =>
  `<!DOCTYPE html><html lang="${lang}" dir="${lang === 'he' ? 'rtl' : 'ltr'}"><head><title>${body}</title></head>` +
  `<body><main${marked ? ' data-pagefind-body' : ''}><h1>${body}</h1><p>${body} ${body}</p></main></body></html>`;

function makeDist(files: Record<string, string>): string {
  const dist = mkdtempSync(join(tmpdir(), 'nb-search-'));
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dist, file)), { recursive: true });
    writeFileSync(join(dist, file), content);
  }
  return dist;
}

describe('inspectHtml', () => {
  it('reads lang and data-pagefind-body', () => {
    expect(inspectHtml('a.html', page('he', 'שלום'))).toEqual({ path: 'a.html', lang: 'he', body: true });
    expect(inspectHtml('b.html', '<html><body>x</body></html>')).toEqual({ path: 'b.html', lang: null, body: false });
    expect(inspectHtml('c.html', "<html class='x' lang='EN-us'>")).toMatchObject({ lang: 'en-us' });
  });
});

describe('expectedLanguages', () => {
  it('uses only data-pagefind-body pages, by primary subtag', () => {
    expect(
      expectedLanguages([
        { path: '1', lang: 'he', body: true },
        { path: '2', lang: 'en-us', body: true },
        { path: '3', lang: 'fr', body: false },
        { path: '4', lang: null, body: true },
      ]),
    ).toEqual(['en', 'he']);
  });

  it('is empty when no page is marked', () => {
    expect(expectedLanguages([{ path: '1', lang: 'he', body: false }])).toEqual([]);
  });
});

describe('languageCounts / missingLanguages', () => {
  it('sums page counts per primary subtag', () => {
    const counts = languageCounts({ languages: { he: { page_count: 3 }, 'en-us': { page_count: 1 }, en: { page_count: 2 } } });
    expect(counts).toEqual({ he: 3, en: 3 });
  });

  it('reports expected languages without pages', () => {
    expect(missingLanguages(['en', 'he'], { he: 2, en: 0 })).toEqual(['en']);
    expect(missingLanguages(['en', 'he'], { he: 2, en: 1 })).toEqual([]);
  });
});

describe('scanHtml', () => {
  it('walks nested html files and skips the pagefind folder', () => {
    const dist = makeDist({ 'he/index.html': page('he', 'א'), 'pagefind/x.html': page('en', 'b'), 'a.txt': 'x' });
    expect(scanHtml(dist)).toEqual([{ path: join('he', 'index.html'), lang: 'he', body: true }]);
  });
});

describe('buildSearchIndex (runs pagefind)', () => {
  it('writes a separate index per <html lang>', async () => {
    const dist = makeDist({
      'he/index.html': page('he', 'מחברת'),
      'he/posts/a/index.html': page('he', 'סיגנלים'),
      'en/index.html': page('en', 'notebook'),
      'index.html': '<html><head><meta http-equiv="refresh" content="0; url=/notebook/he"></head></html>',
    });
    const result = await buildSearchIndex(dist);
    expect(result.counts).toEqual({ he: 2, en: 1 });
    expect(result.expectedLangs).toEqual(['en', 'he']);
    expect(result.missingLangs).toEqual([]);
    expect(existsSync(join(dist, 'pagefind', 'pagefind.js'))).toBe(true);
  }, 30_000);

  it('does not crash on a site with no indexable pages', async () => {
    const dist = makeDist({ 'index.html': '<html><body></body></html>' });
    const result = await buildSearchIndex(dist);
    expect(result.counts).toEqual({});
    expect(result.missingLangs).toEqual([]);
    expect(existsSync(join(dist, 'pagefind', 'pagefind.js'))).toBe(true);
  }, 30_000);
});
