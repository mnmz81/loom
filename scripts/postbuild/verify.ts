import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LANGS, type LangIndex, TYPE_SEGMENT } from '../../src/app/core/content.models';

/** Files every deploy must contain, relative to the dist root. */
export const CORE_FILES: readonly string[] = [
  'index.html',
  'he/index.html',
  'en/index.html',
  '404.html',
  'pagefind/pagefind.js',
  'sitemap.xml',
  'rss-he.xml',
  'rss-en.xml',
];

/**
 * Pure: the full list of expected output files. Each entry that has its own text in a language
 * (entry.lang === index.lang) must have a prerendered page; fallback entries link to the other language.
 */
export function requiredFiles(indexes: readonly LangIndex[] = []): string[] {
  const pages = indexes.flatMap((index) =>
    index.entries
      .filter((entry) => entry.lang === index.lang)
      .map((entry) => `${index.lang}/${TYPE_SEGMENT[entry.type]}/${entry.slug}/index.html`),
  );
  return [...CORE_FILES, ...pages];
}

/** Reads `content/<lang>/index.json` from the dist folder for every language that has one. */
export function readLangIndexes(distDir: string): LangIndex[] {
  return LANGS.map((lang) => join(distDir, 'content', lang, 'index.json'))
    .filter((file) => existsSync(file))
    .map((file) => JSON.parse(readFileSync(file, 'utf8')) as LangIndex);
}

/** Returns the expected files that do not exist under distDir, in list order. */
export function missingFiles(distDir: string, files: readonly string[]): string[] {
  return files.filter((file) => !existsSync(join(distDir, file)));
}
