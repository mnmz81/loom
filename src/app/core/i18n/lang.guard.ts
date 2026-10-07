import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DEFAULT_LANG, LANGS, type Lang } from '../content.models';
import { LocaleService } from './locale.service';

/** Put on the `:lang` parent route. Unknown language → redirect to the default language home. */
export const langGuard: CanActivateFn = (route) => {
  const lang = route.paramMap.get('lang');
  if (!LANGS.includes(lang as Lang)) return inject(Router).parseUrl(`/${DEFAULT_LANG}`);
  const locale = inject(LocaleService);
  locale.setLang(lang as Lang);
  locale.alternateUrl.set(null);
  return true;
};
