import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import type { Entry, EntryType, LangIndex, SeriesIndex } from './content.models';
import { ContentService } from './content.service';
import { routeLang } from './route-lang';
import { PATHS } from './routes.const';

/** LangIndex for the route's `:lang`. */
export const langIndexResolver: ResolveFn<LangIndex> = (route) => inject(ContentService).getIndex(routeLang(route));

/** All series (language-independent). */
export const seriesIndexResolver: ResolveFn<SeriesIndex> = () => inject(ContentService).getSeries();

/**
 * Entry of `type` for the route's `:lang` and `:slug`:
 * - exists in the route language → the Entry
 * - exists only in another language (index `availableLangs`) → redirect to that language's entry URL
 * - unknown slug or load error → redirect to /404
 * The index is checked first (usually already cached), so no request is made for a missing translation.
 */
export function entryResolver(type: EntryType): ResolveFn<Entry | RedirectCommand> {
  return async (route) => {
    // Inject before the first await: the injection context ends there.
    const content = inject(ContentService);
    const router = inject(Router);
    const lang = routeLang(route);
    const slug = route.paramMap.get('slug') ?? '';
    const redirect = (url: string) => new RedirectCommand(router.parseUrl(url), { replaceUrl: true });

    try {
      const index = await content.getIndex(lang);
      const meta = index.entries.find((e) => e.type === type && e.slug === slug);
      if (!meta) return redirect(PATHS.notFound());
      if (!meta.availableLangs.includes(lang)) {
        const other = meta.availableLangs[0];
        return redirect(other ? PATHS.entry(other, type, slug) : PATHS.notFound());
      }
      return await content.getEntry(lang, type, slug);
    } catch {
      return redirect(PATHS.notFound());
    }
  };
}
