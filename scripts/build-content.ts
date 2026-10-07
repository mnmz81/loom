// Builds public/content/**, public/rss-he.xml, public/rss-en.xml and public/sitemap.xml from content/**.
// Usage: npm run content                    (published only)
//        INCLUDE_DRAFTS=1 npm run content   (drafts included, for local preview)
import { mkdirSync, writeFileSync } from 'node:fs';
import { LANGS } from '../src/app/core/content.models';
import { PATHS } from '../src/app/core/routes.const';
import { SITE } from '../src/app/core/site.config';
import { buildContent } from './content/collect';
import { buildRss, buildSitemap, sitemapPages } from './content/feeds';

async function main(): Promise<void> {
  const includeDrafts = process.env['INCLUDE_DRAFTS'] === '1';
  const { indexes, entries, series } = await buildContent({ contentDir: 'content', outDir: 'public/content', includeDrafts });

  mkdirSync('public', { recursive: true });
  for (const lang of LANGS) writeFileSync(`public${PATHS.rss(lang)}`, buildRss(indexes[lang], SITE));
  const pages = sitemapPages(indexes[LANGS[0]], series);
  writeFileSync('public/sitemap.xml', buildSitemap(pages, SITE.url));

  const all = indexes[LANGS[0]].entries;
  const count = (type: string) => all.filter((e) => e.type === type).length;
  const perLang = LANGS.map((lang) => `${lang} ${entries.filter((e) => e.lang === lang).length}`).join(', ');
  console.log(
    `[content] ${count('post')} posts, ${count('note')} notes (${perLang}), ${indexes[LANGS[0]].tags.length} tags, ` +
      `${series.length} series, ${pages.length} sitemap pages${includeDrafts ? ' (drafts included)' : ''}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
