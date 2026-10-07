import type { Lang } from '../core/content.models';

const DIR: Record<Lang, 'rtl' | 'ltr'> = { he: 'rtl', en: 'ltr' };

/**
 * Text direction for a fallback-language fragment (e.g. a Hebrew title in the English UI), so bidi
 * punctuation lands right. `null` → no attribute (inherit the page direction).
 */
export function dirOf(lang: Lang | null): 'rtl' | 'ltr' | null {
  return lang ? DIR[lang] : null;
}
