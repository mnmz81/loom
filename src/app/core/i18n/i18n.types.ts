// CONTRACT (Wave 0). UI strings. Add a key here first; he.ts and en.ts fail to compile until both have it.
// `{name}` placeholders are filled by LocaleService.t(key, { name: value }).
export interface Dict {
  'site.skipToContent': string;
  'nav.home': string;
  'nav.posts': string;
  'nav.notes': string;
  'nav.series': string;
  'nav.certificates': string;
  'nav.search': string;
  'nav.main': string;            // aria-label of the main <nav>
  'nav.menu': string;            // aria-label of the mobile menu button
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
  'certificates.title': string;
  'certificates.empty': string;
  'certificates.image': string;   // {title} — alt text of the certificate picture
  'certificates.verify': string;  // link to the issuer's verify page
  'list.empty': string;
  'list.latestPosts': string;
  'list.latestNotes': string;
  'list.all': string;
  'list.allPosts': string;         // section link on home, ends with a reading-direction arrow
  'list.allNotes': string;
  'list.allSeries': string;
  'list.moreTags': string;         // {n} — <summary> of the collapsed tag filter
  'pager.label': string;           // aria-label of the list pagination <nav>
  'pager.prev': string;
  'pager.next': string;
  'pager.page': string;            // {n} — accessible name of a page number link
  'pager.title': string;           // {title} {n} — document title of page n ≥ 2
  'home.title': string;            // h1: what the blog is
  'home.lead': string;             // who writes it and what is here
  'home.startSeries': string;      // primary action → series list
  'home.search': string;           // secondary action → search
  'series.partsOne': string;
  'series.partsOther': string;     // {n}
  'series.trackCount': string;     // {n} — "5 series" on a track tile
  'entry.backToTop': string;
  'search.startHere': string;      // heading of the starting points shown before typing
  'search.popularTags': string;
  'search.truncated': string;      // more matches than shown: {shown}, {total}
  'search.shortcut': string;       // hint: press Ctrl/⌘+K anywhere to search
  'certificates.enlarge': string;  // {title} — button that opens the large view
  'certificates.close': string;
  'certificates.original': string; // link to the original file in the large view
  'footer.about': string;
  'footer.sections': string;       // aria-label of the footer section links
  'tag.title': string;            // {tag}
  'search.title': string;
  'search.placeholder': string;
  'search.noResults': string;     // {query}
  'search.unavailable': string;
  'code.copy': string;
  'code.copied': string;
  'footer.rss': string;
  'footer.source': string;
  'footer.accessibility': string;
  'notFound.title': string;
  'notFound.body': string;
  'notFound.home': string;
}

export type DictKey = keyof Dict;
