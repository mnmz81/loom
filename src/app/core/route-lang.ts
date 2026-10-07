import type { ActivatedRouteSnapshot } from '@angular/router';
import { DEFAULT_LANG, LANGS, type Lang } from './content.models';

function isLang(value: string | null): value is Lang {
  return value !== null && (LANGS as readonly string[]).includes(value);
}

/**
 * Language of a route. Pages are children of the `:lang` parent route and do not inherit its params,
 * so walk from the route up to the root and take the nearest valid `:lang`. Falls back to DEFAULT_LANG.
 */
export function routeLang(route: ActivatedRouteSnapshot): Lang {
  for (const snapshot of [...route.pathFromRoot].reverse()) {
    const lang = snapshot.paramMap.get('lang');
    if (isLang(lang)) return lang;
  }
  return DEFAULT_LANG;
}
