import { LANGS, type Lang } from '../core/content.models';

/** In-app path of a page in every language (for hreflang alternates of language-independent pages). */
export function allLangPaths(path: (lang: Lang) => string): Record<Lang, string> {
  return Object.fromEntries(LANGS.map((lang) => [lang, path(lang)])) as Record<Lang, string>;
}

/** Plain-text description from rendered entry HTML: tags stripped, whitespace collapsed, cut at a word. */
export function describeHtml(html: string, max = 160): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
