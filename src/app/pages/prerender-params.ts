// Pure helpers behind app.routes.server.ts: which URLs get prerendered, from the pipeline output.
import type { EntryType, Lang, LangIndex, SeriesIndex } from '../core/content.models';

/**
 * Entry slugs of `type` that have their own text in `index.lang`. A fallback entry (only in the other
 * language) is listed in the index but has no `/<lang>/...` page: its card links to the other language.
 */
export function entrySlugs(index: LangIndex, type: EntryType): string[] {
  return index.entries.filter((e) => e.type === type && e.availableLangs.includes(index.lang)).map((e) => e.slug);
}

/** `{ lang, slug }` for every (language, entry) pair that has a page. */
export function entryParams(indexes: readonly LangIndex[], type: EntryType): { lang: Lang; slug: string }[] {
  return indexes.flatMap((index) => entrySlugs(index, type).map((slug) => ({ lang: index.lang, slug })));
}

/** `{ lang, tag }` for every tag of every language index (all tags list fallback entries too). */
export function tagParams(indexes: readonly LangIndex[]): { lang: Lang; tag: string }[] {
  return indexes.flatMap((index) => index.tags.map(({ tag }) => ({ lang: index.lang, tag })));
}

/** `{ lang, key }` for every series in every language (series pages exist in both languages). */
export function seriesParams(langs: readonly Lang[], series: SeriesIndex): { lang: Lang; key: string }[] {
  return langs.flatMap((lang) => series.map(({ key }) => ({ lang, key })));
}
