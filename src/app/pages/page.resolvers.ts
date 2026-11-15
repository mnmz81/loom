import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import type { EntryType, SeriesSummary, TagCount } from '../core/content.models';
import { ContentService } from '../core/content.service';
import { routeLang } from '../core/route-lang';
import { PATHS } from '../core/routes.const';
import { pageTotal } from './pagination';

/** The series named by the route's `:key`, or a redirect to /404 for an unknown key / load error. */
export const seriesResolver: ResolveFn<SeriesSummary | RedirectCommand> = async (route) => {
  // Inject before the first await: the injection context ends there.
  const content = inject(ContentService);
  const router = inject(Router);
  const key = route.paramMap.get('key');
  try {
    const found = (await content.getSeries()).find((s) => s.key === key);
    if (found) return found;
  } catch {
    // fall through to 404
  }
  return new RedirectCommand(router.parseUrl(PATHS.notFound()), { replaceUrl: true });
};

/** The tag named by the route's `:tag` (from the language index), or a redirect to /404. */
export const tagResolver: ResolveFn<TagCount | RedirectCommand> = async (route) => {
  const content = inject(ContentService);
  const router = inject(Router);
  const lang = routeLang(route);
  const tag = route.paramMap.get('tag');
  try {
    const found = (await content.getIndex(lang)).tags.find((t) => t.tag === tag);
    if (found) return found;
  } catch {
    // fall through to 404
  }
  return new RedirectCommand(router.parseUrl(PATHS.notFound()), { replaceUrl: true });
};

/**
 * List page number from the route's `:page` (1 when the route has none), or a redirect to /404 for
 * anything that is not a page 2…n of `type` (page 1 lives at the plain list URL).
 */
export function listPageResolver(type: EntryType): ResolveFn<number | RedirectCommand> {
  return async (route) => {
    const content = inject(ContentService);
    const router = inject(Router);
    const raw = route.paramMap.get('page');
    if (raw === null) return 1;
    try {
      const count = (await content.getIndex(routeLang(route))).entries.filter(
        (e) => e.type === type,
      ).length;
      const page = Number(raw);
      if (/^\d+$/.test(raw) && page >= 2 && page <= pageTotal(count)) return page;
    } catch {
      // fall through to 404
    }
    return new RedirectCommand(router.parseUrl(PATHS.notFound()), { replaceUrl: true });
  };
}
