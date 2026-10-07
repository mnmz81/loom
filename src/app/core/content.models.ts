// CONTRACT (Wave 0). Shape of the JSON the content pipeline writes to public/content/ and the app reads.
// Framework-free: imported by Angular code and by Node scripts in scripts/. Change only with all consumers.

export type Lang = 'he' | 'en';
export const LANGS: readonly Lang[] = ['he', 'en'];
export const DEFAULT_LANG: Lang = 'he';

export type EntryType = 'post' | 'note';

/** Plural folder / URL segment for an entry type: 'post' → 'posts'. */
export const TYPE_SEGMENT: Record<EntryType, 'posts' | 'notes'> = { post: 'posts', note: 'notes' };

export interface SeriesRef {
  key: string;             // = content/series/<key>.yaml
  order: number;           // 1-based position in the series, unique per series
}

export interface EntryMeta {
  type: EntryType;
  slug: string;            // kebab-case Latin, = folder name content/<type>s/<slug>/
  lang: Lang;              // language of THIS text. In a LangIndex, lang !== index.lang means "not translated" (fallback)
  title: string;
  summary?: string;        // always set for posts (≤ 200 chars); never set for notes
  date: string;            // 'YYYY-MM-DD'
  updated?: string;        // 'YYYY-MM-DD'
  tags: string[];          // lowercase kebab-case Latin keys, ≥ 1
  readingMinutes: number;  // ≥ 1
  cover?: string;          // '/images/...' (site-root relative, WITHOUT base path; see assetPath())
  series?: SeriesRef;      // posts only
  availableLangs: Lang[];  // languages this entry exists in, in LANGS order, ≥ 1
}

/** Minimal pointer to another entry (related list, series prev/next). */
export interface EntryRef {
  type: EntryType;
  slug: string;
  lang: Lang;              // language the title is in (target URL uses this lang)
  title: string;
}

export interface TocItem {
  id: string;              // heading id attribute in Entry.html
  text: string;
  depth: 2 | 3;
}

export interface SeriesNav {
  key: string;
  title: string;           // series title in the entry's language
  index: number;           // 1-based position of this entry
  total: number;
  prev: EntryRef | null;
  next: EntryRef | null;
}

/** public/content/<lang>/<type>s/<slug>.json — only written for languages the entry exists in. */
export interface Entry extends EntryMeta {
  html: string;            // rendered body (no <h1>); <pre> blocks carry dir="ltr" tabindex="0"
  toc: TocItem[];
  related: EntryRef[];     // ≤ 3, most shared tags first, then newest; never the entry itself
  seriesNav: SeriesNav | null;
}

export interface TagCount {
  tag: string;             // key
  label: string;           // display label in the index language (content/tags.yaml), falls back to the key
  count: number;
}

/** public/content/<lang>/index.json */
export interface LangIndex {
  lang: Lang;
  generatedAt: string;     // ISO timestamp
  // Every published entry exactly once. Text in `lang` when available, otherwise in the other language
  // (then entry.lang !== lang → UI shows the "only in X" badge and links to /<entry.lang>/...).
  // Sorted by date desc, then slug asc. Drafts excluded unless INCLUDE_DRAFTS=1.
  entries: EntryMeta[];
  tags: TagCount[];        // sorted by count desc, then tag asc
}

export interface SeriesSummary {
  key: string;
  title: Record<Lang, string>;
  description: Partial<Record<Lang, string>>;
  slugs: string[];         // post slugs in series order
}

/** public/content/series.json — sorted by key. */
export type SeriesIndex = SeriesSummary[];
