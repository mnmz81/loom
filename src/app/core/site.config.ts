// Framework-free: imported by Angular and by Node scripts in scripts/.
import type { Lang } from './content.models';

export const SITE = {
  /** Absolute site URL including the GitHub Pages base path, no trailing slash. */
  url: 'https://mnmz81.github.io/notebook',
  /** Must match angular.json production baseHref. */
  basePath: '/notebook/',
  title: { he: 'המחברת', en: 'Notebook' } satisfies Record<Lang, string>,
  description: {
    he: 'פוסטים והערות קצרות על מה שאני לומד — כדי לזכור ולמצוא שוב.',
    en: 'Posts and short notes on what I learn — to remember and find again.',
  } satisfies Record<Lang, string>,
  author: 'Moris Maor Zakay',
  ogLocale: { he: 'he_IL', en: 'en_US' } satisfies Record<Lang, string>,
  defaultOgImage: '/og/default.png',
  repo: 'https://github.com/mnmz81/notebook',
} as const;

/**
 * Absolute URL of a page path like '/he/posts/x'. GitHub Pages serves `x/index.html` and redirects
 * `/x` to `/x/`, so every page URL gets exactly one trailing slash. Not for files (images, rss).
 */
export function pageUrl(path: string, base: string = SITE.url): string {
  const trimmed = path.replace(/\/+$/, '');
  return trimmed === '' ? `${base}/` : `${base}${trimmed}/`;
}

/** Absolute URL of a static file path like '/rss-he.xml' or '/images/x.png'. */
export function fileUrl(path: string, base: string = SITE.url): string {
  return `${base}/${path.replace(/^\/+/, '')}`;
}

/** In-app relative URL for a static asset ('/images/x.png' → 'images/x.png'), resolved against <base href>. */
export function assetPath(path: string): string {
  return path.replace(/^\/+/, '');
}
