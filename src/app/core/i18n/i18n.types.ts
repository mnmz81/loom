// CONTRACT (Wave 0). UI strings. Add a key here first; he.ts and en.ts fail to compile until both have it.
// `{name}` placeholders are filled by LocaleService.t(key, { name: value }).
export interface Dict {
  'site.skipToContent': string;
  'nav.home': string;
  'nav.posts': string;
  'nav.notes': string;
  'nav.series': string;
  'nav.search': string;
  'nav.main': string;            // aria-label of the main <nav>
  'lang.switch': string;         // aria-label / title of the language switch link
  'lang.name.he': string;
  'lang.name.en': string;
  'lang.onlyIn.he': string;      // badge on an entry that has no translation in the current language
  'lang.onlyIn.en': string;
  'theme.toLight': string;
  'theme.toDark': string;
  'type.post': string;
  'type.note': string;
  'entry.readingMinutes': string; // {n}
  'entry.updated': string;        // {date}
  'entry.toc': string;
  'entry.related': string;
  'entry.tags': string;
  'series.title': string;
  'series.part': string;          // {index} {total}
  'series.prev': string;
  'series.next': string;
  'series.empty': string;
  'list.empty': string;
  'list.latestPosts': string;
  'list.latestNotes': string;
  'list.all': string;
  'tag.title': string;            // {tag}
  'search.title': string;
  'search.placeholder': string;
  'search.noResults': string;     // {query}
  'search.unavailable': string;
  'code.copy': string;
  'code.copied': string;
  'footer.rss': string;
  'footer.source': string;
  'notFound.title': string;
  'notFound.body': string;
  'notFound.home': string;
}

export type DictKey = keyof Dict;
