import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface HtmlPage {
  path: string;          // relative to dist
  lang: string | null;   // <html lang>, lowercased
  body: boolean;         // has data-pagefind-body
}

/** Pagefind's `pagefind-entry.json` (only the fields we read). */
export interface PagefindEntry {
  languages: Record<string, { page_count: number }>;
}

/** Pure: reads <html lang> and data-pagefind-body from page source. */
export function inspectHtml(path: string, html: string): HtmlPage {
  const lang = /<html\b[^>]*\blang=["']?([\w-]+)/i.exec(html)?.[1]?.toLowerCase() ?? null;
  return { path, lang, body: /\bdata-pagefind-body\b/.test(html) };
}

/** All .html files under distDir (skipping the pagefind bundle), inspected. */
export function scanHtml(distDir: string): HtmlPage[] {
  const out: HtmlPage[] = [];
  const walk = (dir: string): void => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, item.name);
      if (item.isDirectory()) {
        if (item.name !== 'pagefind') walk(full);
      } else if (item.name.endsWith('.html')) {
        out.push(inspectHtml(relative(distDir, full), readFileSync(full, 'utf8')));
      }
    }
  };
  walk(distDir);
  return out;
}

/**
 * Pure: primary language subtags ('he', 'en') of pages explicitly marked data-pagefind-body, sorted.
 * Unmarked pages (redirects, empty shells) are ignored: Pagefind drops pages without text, so only
 * marked pages are a reliable signal that a language index must exist.
 */
export function expectedLanguages(pages: readonly HtmlPage[]): string[] {
  const langs = pages
    .filter((page) => page.body)
    .map((page) => page.lang?.split('-')[0])
    .filter((lang): lang is string => !!lang);
  return [...new Set(langs)].sort();
}

/** Pure: page count per index language, keyed by primary subtag ('en-us' → 'en'). */
export function languageCounts(entry: PagefindEntry): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [lang, { page_count }] of Object.entries(entry.languages)) {
    const key = lang.split('-')[0];
    counts[key] = (counts[key] ?? 0) + page_count;
  }
  return counts;
}

/** Pure: expected languages that have no (or an empty) Pagefind index. */
export function missingLanguages(expected: readonly string[], counts: Record<string, number>): string[] {
  return expected.filter((lang) => !counts[lang]);
}

export interface SearchIndexResult {
  pageCount: number;
  counts: Record<string, number>;
  expectedLangs: string[];   // languages with data-pagefind-body pages
  missingLangs: string[];
}

/** Runs Pagefind over distDir and writes the bundle to `<distDir>/pagefind`. */
export async function buildSearchIndex(distDir: string): Promise<SearchIndexResult> {
  const pagefind = await import('pagefind');
  try {
    const { index, errors } = await pagefind.createIndex({});
    if (!index) throw new Error(`pagefind createIndex failed: ${errors.join('; ')}`);

    const added = await index.addDirectory({ path: distDir });
    if (added.errors.length) throw new Error(`pagefind addDirectory failed: ${added.errors.join('; ')}`);

    const written = await index.writeFiles({ outputPath: join(distDir, 'pagefind') });
    if (written.errors.length) throw new Error(`pagefind writeFiles failed: ${written.errors.join('; ')}`);

    const entryFile = join(distDir, 'pagefind', 'pagefind-entry.json');
    const counts = existsSync(entryFile)
      ? languageCounts(JSON.parse(readFileSync(entryFile, 'utf8')) as PagefindEntry)
      : {};
    const expectedLangs = expectedLanguages(scanHtml(distDir));
    return { pageCount: added.page_count, counts, expectedLangs, missingLangs: missingLanguages(expectedLangs, counts) };
  } finally {
    await pagefind.close();
  }
}
