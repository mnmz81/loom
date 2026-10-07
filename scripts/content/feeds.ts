// RSS (one feed per language) and sitemap.xml with hreflang alternates.
import { DEFAULT_LANG, type Lang, LANGS, type LangIndex, type SeriesIndex } from '../../src/app/core/content.models';
import { PATHS } from '../../src/app/core/routes.const';
import { fileUrl, pageUrl, SITE } from '../../src/app/core/site.config';

export interface FeedSite {
  url: string;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
}

/** A prerendered page: its path in every language it exists in. */
export type SitemapPage = Partial<Record<Lang, string>>;

const RSS_LIMIT = 20;

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const rfc822 = (date: string) => new Date(`${date}T00:00:00Z`).toUTCString();

/** Feed for `index.lang`: only entries that exist in that language (no fallbacks), newest 20. */
export function buildRss(index: LangIndex, site: FeedSite = SITE): string {
  const { lang } = index;
  const items = index.entries
    .filter((entry) => entry.lang === lang)
    .sort((a, b) => (a.date === b.date ? (a.slug < b.slug ? -1 : 1) : a.date < b.date ? 1 : -1))
    .slice(0, RSS_LIMIT)
    .map((entry) => {
      const link = pageUrl(PATHS.entry(lang, entry.type, entry.slug), site.url);
      return [
        '    <item>',
        `      <title>${escapeXml(entry.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <pubDate>${rfc822(entry.date)}</pubDate>`,
        ...(entry.summary ? [`      <description>${escapeXml(entry.summary)}</description>`] : []),
        ...entry.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`),
        '    </item>',
      ].join('\n');
    });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(site.title[lang])}</title>`,
    `    <link>${pageUrl(PATHS.home(lang), site.url)}</link>`,
    `    <description>${escapeXml(site.description[lang])}</description>`,
    `    <language>${lang}</language>`,
    `    <atom:link href="${fileUrl(PATHS.rss(lang), site.url)}" rel="self" type="application/rss+xml"/>`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

const everyLang = (path: (lang: Lang) => string): SitemapPage => Object.fromEntries(LANGS.map((lang) => [lang, path(lang)]));

/**
 * Every prerendered page. List/series/tag/search pages exist in both languages;
 * an entry page only in the languages it was written in (`availableLangs`).
 */
export function sitemapPages(index: LangIndex, series: SeriesIndex): SitemapPage[] {
  return [
    everyLang(PATHS.home),
    everyLang(PATHS.posts),
    everyLang(PATHS.notes),
    everyLang(PATHS.seriesList),
    everyLang(PATHS.search),
    ...series.map(({ key }) => everyLang((lang) => PATHS.series(lang, key))),
    ...index.tags.map(({ tag }) => everyLang((lang) => PATHS.tag(lang, tag))),
    ...index.entries.map((entry) =>
      Object.fromEntries(entry.availableLangs.map((lang) => [lang, PATHS.entry(lang, entry.type, entry.slug)])),
    ),
  ];
}

/** One <url> per page and language; pages in 2+ languages get hreflang alternates and x-default (he). */
export function buildSitemap(pages: SitemapPage[], siteUrl: string = SITE.url): string {
  const urls = pages.flatMap((page) => {
    const langs = LANGS.filter((lang) => page[lang]);
    const alternates =
      langs.length > 1
        ? [
            ...langs.map((lang) => [lang, page[lang]!] as const),
            ['x-default', page[DEFAULT_LANG] ?? page[langs[0]]!] as const,
          ].map(([hreflang, path]) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(pageUrl(path, siteUrl))}"/>`)
        : [];
    return langs.map((lang) =>
      ['  <url>', `    <loc>${escapeXml(pageUrl(page[lang]!, siteUrl))}</loc>`, ...alternates, '  </url>'].join('\n'),
    );
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
