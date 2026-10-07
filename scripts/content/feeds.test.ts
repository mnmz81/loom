import { describe, expect, it } from 'vitest';
import type { EntryMeta, LangIndex, SeriesIndex } from '../../src/app/core/content.models';
import { SITE } from '../../src/app/core/site.config';
import { buildRss, buildSitemap, sitemapPages } from './feeds';

const site = {
  url: 'https://example.dev/nb',
  title: { he: 'המחברת & co', en: 'Notebook & Co' },
  description: { he: 'תיאור', en: 'Desc' },
};

const meta = (over: Partial<EntryMeta> & Pick<EntryMeta, 'slug'>): EntryMeta => ({
  type: 'post',
  lang: 'en',
  title: over.slug,
  summary: 'Sum',
  date: '2026-09-20',
  tags: ['ai'],
  readingMinutes: 1,
  availableLangs: ['en'],
  ...over,
});

const enIndex: LangIndex = {
  lang: 'en',
  generatedAt: '2026-10-07T00:00:00.000Z',
  entries: [
    meta({ slug: 'both', title: 'A <b> & c', date: '2026-09-22', availableLangs: ['he', 'en'], tags: ['ai', 'rust'] }),
    meta({ slug: 'he-only', lang: 'he', title: 'עברית', date: '2026-09-21', availableLangs: ['he'] }),
    meta({ slug: 'a-note', type: 'note', summary: undefined, date: '2026-09-20', availableLangs: ['en'] }),
  ],
  tags: [
    { tag: 'ai', label: 'AI', count: 3 },
    { tag: 'rust', label: 'Rust', count: 1 },
  ],
};

const seriesIndex: SeriesIndex = [{ key: 'learning-rust', title: { he: 'ר', en: 'R' }, description: {}, slugs: [] }];

describe('buildRss', () => {
  it('produces an RSS 2.0 feed for one language with escaped items', () => {
    const xml = buildRss(enIndex, site);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
    expect(xml).toContain('<title>Notebook &amp; Co</title>');
    expect(xml).toContain('<link>https://example.dev/nb/en/</link>');
    expect(xml).toContain('<description>Desc</description>');
    expect(xml).toContain('<language>en</language>');
    expect(xml).toContain('<atom:link href="https://example.dev/nb/rss-en.xml" rel="self" type="application/rss+xml"/>');
    expect(xml).toContain('<title>A &lt;b&gt; &amp; c</title>');
    expect(xml).toContain('<link>https://example.dev/nb/en/posts/both/</link>');
    expect(xml).toContain('<guid isPermaLink="true">https://example.dev/nb/en/posts/both/</guid>');
    expect(xml).toContain('<pubDate>Tue, 22 Sep 2026 00:00:00 GMT</pubDate>');
    expect(xml).toContain('<category>rust</category>');
    expect(xml).toContain('<link>https://example.dev/nb/en/notes/a-note/</link>');
  });

  it('only includes entries that exist in the feed language', () => {
    const xml = buildRss(enIndex, site);
    expect(xml).not.toContain('he-only');
    expect(xml.match(/<item>/g)).toHaveLength(2);
  });

  it('gives posts a description and notes none', () => {
    const items = buildRss(enIndex, site).split('<item>').slice(1);
    expect(items[0]).toContain('<description>Sum</description>');
    expect(items[1]).not.toContain('<description>');
  });

  it('uses the Hebrew channel metadata for the Hebrew feed', () => {
    const heIndex: LangIndex = { ...enIndex, lang: 'he', entries: [meta({ slug: 'x', lang: 'he', availableLangs: ['he'] })] };
    const xml = buildRss(heIndex, site);
    expect(xml).toContain('<title>המחברת &amp; co</title>');
    expect(xml).toContain('<language>he</language>');
    expect(xml).toContain('<link>https://example.dev/nb/he/posts/x/</link>');
    expect(xml).toContain('href="https://example.dev/nb/rss-he.xml"');
  });

  it('keeps the newest 20 items, newest first', () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      meta({ slug: `p-${String(i).padStart(2, '0')}`, date: `2026-01-${String(i + 1).padStart(2, '0')}` }),
    );
    const xml = buildRss({ ...enIndex, entries }, site);
    const links = [...xml.matchAll(/<guid isPermaLink="true">[^<]*\/posts\/([^/]+)\/<\/guid>/g)].map((m) => m[1]);
    expect(links).toHaveLength(20);
    expect(links[0]).toBe('p-24');
    expect(links[19]).toBe('p-05');
  });

  it('defaults to SITE', () => {
    expect(buildRss(enIndex)).toContain(`<link>${SITE.url}/en/posts/both/</link>`);
  });
});

describe('sitemapPages', () => {
  it('lists every prerendered page with the languages it exists in', () => {
    expect(sitemapPages(enIndex, seriesIndex)).toEqual([
      { he: '/he', en: '/en' },
      { he: '/he/posts', en: '/en/posts' },
      { he: '/he/notes', en: '/en/notes' },
      { he: '/he/series', en: '/en/series' },
      { he: '/he/search', en: '/en/search' },
      { he: '/he/series/learning-rust', en: '/en/series/learning-rust' },
      { he: '/he/tags/ai', en: '/en/tags/ai' },
      { he: '/he/tags/rust', en: '/en/tags/rust' },
      { he: '/he/posts/both', en: '/en/posts/both' },
      { he: '/he/posts/he-only' },
      { en: '/en/notes/a-note' },
    ]);
  });
});

describe('buildSitemap', () => {
  const xml = buildSitemap(sitemapPages(enIndex, seriesIndex), site.url);

  it('declares the sitemap and xhtml namespaces', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">');
  });

  it('writes one <url> per page and language with absolute trailing-slash URLs', () => {
    expect(xml.match(/<url>/g)).toHaveLength(2 * 9 + 2);
    expect(xml).toContain('<loc>https://example.dev/nb/he/</loc>');
    expect(xml).toContain('<loc>https://example.dev/nb/en/posts/both/</loc>');
    expect(xml).toContain('<loc>https://example.dev/nb/he/posts/he-only/</loc>');
    expect(xml).not.toContain('/en/posts/he-only');
  });

  it('adds hreflang alternates plus x-default (he) only for pages in both languages', () => {
    const urls = xml.split('<url>').slice(1);
    const enBoth = urls.find((u) => u.includes('<loc>https://example.dev/nb/en/posts/both/</loc>'))!;
    expect(enBoth).toContain('<xhtml:link rel="alternate" hreflang="he" href="https://example.dev/nb/he/posts/both/"/>');
    expect(enBoth).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://example.dev/nb/en/posts/both/"/>');
    expect(enBoth).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://example.dev/nb/he/posts/both/"/>');
    const heOnly = urls.find((u) => u.includes('he-only'))!;
    expect(heOnly).not.toContain('xhtml:link');
    expect(urls.filter((u) => u.includes('xhtml:link'))).toHaveLength(18);
  });
});
