// CONTRACT (Wave 0). Every in-app URL is built here. Absolute router paths (start with '/'),
// the router resolves them against <base href>. Used with [routerLink].
import { type EntryType, type Lang, TYPE_SEGMENT } from './content.models';

export const PATHS = {
  home: (lang: Lang) => `/${lang}`,
  posts: (lang: Lang) => `/${lang}/posts`,
  notes: (lang: Lang) => `/${lang}/notes`,
  entry: (lang: Lang, type: EntryType, slug: string) => `/${lang}/${TYPE_SEGMENT[type]}/${slug}`,
  seriesList: (lang: Lang) => `/${lang}/series`,
  series: (lang: Lang, key: string) => `/${lang}/series/${key}`,
  tag: (lang: Lang, tag: string) => `/${lang}/tags/${tag}`,
  search: (lang: Lang) => `/${lang}/search`,
  rss: (lang: Lang) => `/rss-${lang}.xml`,
  notFound: () => '/404',
} as const;

/** Same page in another language: swaps the leading /<lang> segment. '/he/posts' → '/en/posts'. */
/** URLs without a language prefix ('/', '/404') map to that language's home. Query/hash are dropped. */
export function swapLang(url: string, to: Lang): string {
  const path = url.split(/[?#]/)[0];
  return /^\/(he|en)(\/|$)/.test(path) ? path.replace(/^\/(he|en)/, `/${to}`) : `/${to}`;
}
