import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { DEFAULT_LANG, type Lang } from '../content.models';
import { en } from './en';
import { he } from './he';
import type { Dict, DictKey } from './i18n.types';

const DICTS: Record<Lang, Dict> = { he, en };
const DIR: Record<Lang, 'rtl' | 'ltr'> = { he: 'rtl', en: 'ltr' };

/**
 * Current UI language. Set once per navigation by `langGuard` from the `:lang` route param;
 * keeps <html lang dir> in sync (also during prerender, so static HTML has the right direction).
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly document = inject(DOCUMENT);
  private readonly dateFormats = new Map<Lang, Intl.DateTimeFormat>();

  readonly lang = signal<Lang>(DEFAULT_LANG);
  readonly dir = computed(() => DIR[this.lang()]);
  readonly otherLang = computed<Lang>(() => (this.lang() === 'he' ? 'en' : 'he'));
  /**
   * URL of the current page in `otherLang`, set by entry pages (the translation, or null to fall back).
   * The header falls back to swapLang(router.url) when null. Reset to null by langGuard on every navigation.
   */
  readonly alternateUrl = signal<string | null>(null);

  setLang(lang: Lang): void {
    this.lang.set(lang);
    const html = this.document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', DIR[lang]);
  }

  t(key: DictKey, params?: Record<string, string | number>): string {
    const text = DICTS[this.lang()][key];
    return params ? text.replace(/\{(\w+)\}/g, (m, name: string) => String(params[name] ?? m)) : text;
  }

  /** 'YYYY-MM-DD' → localized long date, e.g. '7 באוקטובר 2026' / 'October 7, 2026'. */
  formatDate(isoDate: string, lang: Lang = this.lang()): string {
    let format = this.dateFormats.get(lang);
    if (!format) {
      format = new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-US', { dateStyle: 'long', timeZone: 'UTC' });
      this.dateFormats.set(lang, format);
    }
    return format.format(new Date(`${isoDate}T00:00:00Z`));
  }
}
