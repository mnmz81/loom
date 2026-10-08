import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, Injectable, InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import type { EntryType } from '../../core/content.models';

/** The part of the Pagefind browser API this site uses (https://pagefind.app/docs/api/). */
export interface PagefindResultData {
  url: string;
  excerpt: string;
  meta: Record<string, string>;
  filters: Record<string, string[]>;
}
export interface PagefindApi {
  /** Drops the loaded index; the next search re-initialises for the current `<html lang>`. */
  destroy?(): Promise<void>;
  search(
    term: string | null,
    options?: { filters?: Record<string, string> },
  ): Promise<{ results: { data(): Promise<PagefindResultData> }[] }>;
}

/** Loads a module by absolute URL. Injectable so tests need no real Pagefind bundle. */
export type PagefindImporter = (url: string) => Promise<unknown>;
export const PAGEFIND_IMPORT = new InjectionToken<PagefindImporter>('PAGEFIND_IMPORT', {
  providedIn: 'root',
  // The URL is only known at runtime (resolved against <base href>), and the bundle is written by
  // scripts/postbuild after `ng build`, so the bundler must not try to resolve it.
  factory: () => (url) => import(/* @vite-ignore */ url),
});

/** Pagefind cannot be used here: server-side render, or the bundle does not exist (`ng serve`). */
export class SearchUnavailableError extends Error {
  constructor(message = 'Pagefind is not available') {
    super(message);
    this.name = 'SearchUnavailableError';
  }
}

export interface ExcerptPart {
  text: string;
  mark: boolean;
}

export interface SearchHit {
  /** Router path (no base href, no trailing slash), e.g. '/he/posts/rust-borrowing'. */
  path: string;
  title: string;
  excerpt: ExcerptPart[];
  type: EntryType | null;
  tags: string[];
}

export interface SearchFilters {
  type: EntryType | '';
  tag: string;
}

/** Most results whose data (title, excerpt) is fetched for one query. */
export const MAX_RESULTS = 50;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * Pagefind excerpt HTML ('… <mark>word</mark> …', other text entity-escaped) → text parts.
 * Rendering parts instead of the HTML keeps indexed text from ever being interpreted as markup.
 */
export function parseExcerpt(html: string): ExcerptPart[] {
  const parts: ExcerptPart[] = [];
  for (const [i, chunk] of html.split(/<\/?mark>/i).entries()) {
    const text = decodeEntities(chunk.replace(/<[^>]*>/g, ''));
    if (text) parts.push({ text, mark: i % 2 === 1 });
  }
  return parts;
}

/**
 * Pagefind result URL ('/he/posts/x/', possibly already prefixed with the base path) → router path
 * ('/he/posts/x'). `baseHref` is the pathname of <base href>, e.g. '/loom/'.
 */
export function toRouterPath(url: string, baseHref: string): string {
  let path = url.replace(/[?#].*$/, '');
  try {
    path = new URL(path, 'https://pagefind.invalid').pathname;
  } catch {
    // keep as is
  }
  const base = baseHref.replace(/\/+$/, '');
  if (base && (path === base || path.startsWith(`${base}/`))) path = path.slice(base.length);
  path = path.replace(/\/+$/, '');
  return path.startsWith('/') ? path : `/${path}`;
}

function toEntryType(value: string | undefined): EntryType | null {
  return value === 'post' || value === 'note' ? value : null;
}

/** Runtime full-text search over the Pagefind index the build writes to `<base>/pagefind/`. */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly importer = inject(PAGEFIND_IMPORT);
  private pagefind: Promise<PagefindApi> | null = null;
  /** `<html lang>` the loaded Pagefind index was initialised for (it reads it once, on first use). */
  private indexLang: string | null = null;

  /** Loads the Pagefind bundle once. Rejects with SearchUnavailableError (and retries next time). */
  load(): Promise<PagefindApi> {
    if (!this.isBrowser) return Promise.reject(new SearchUnavailableError('not in a browser'));
    this.pagefind ??= this.importer(new URL('pagefind/pagefind.js', this.document.baseURI).href).then(
      (module) => module as PagefindApi,
      (error: unknown) => {
        this.pagefind = null;
        throw new SearchUnavailableError(String(error));
      },
    );
    return this.pagefind;
  }

  /**
   * Searches the index of the page language (Pagefind picks it from `<html lang>`). A null/empty term
   * with filters lists everything matching the filters.
   */
  async search(term: string, filters: SearchFilters): Promise<{ total: number; hits: SearchHit[] }> {
    const api = await this.load();
    // Pagefind picks its per-language index from <html lang> on first use. After a client-side switch
    // between /he and /en the module is cached, so drop the loaded index and let it re-initialise.
    const lang = this.document.documentElement.lang;
    if (this.indexLang !== null && this.indexLang !== lang) await api.destroy?.();
    this.indexLang = lang;
    const active: Record<string, string> = {};
    if (filters.type) active['type'] = filters.type;
    if (filters.tag) active['tag'] = filters.tag;

    const response = await api.search(term.trim() || null, { filters: active });
    const base = new URL(this.document.baseURI).pathname;
    const data = await Promise.all(response.results.slice(0, MAX_RESULTS).map((r) => r.data()));
    return {
      total: response.results.length,
      hits: data.map((d) => ({
        path: toRouterPath(d.url, base),
        title: d.meta['title'] || d.url,
        excerpt: parseExcerpt(d.excerpt),
        type: toEntryType(d.filters['type']?.[0]),
        tags: d.filters['tag'] ?? [],
      })),
    };
  }
}
