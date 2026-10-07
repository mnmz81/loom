import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EntryMeta, LangIndex } from '../../src/app/core/content.models';
import { CORE_FILES, missingFiles, readLangIndexes, requiredFiles } from './verify';

function makeDist(files: Record<string, string> | string[]): string {
  const dist = mkdtempSync(join(tmpdir(), 'nb-dist-'));
  const entries = Array.isArray(files) ? files.map((f) => [f, 'x'] as const) : Object.entries(files);
  for (const [file, content] of entries) {
    mkdirSync(dirname(join(dist, file)), { recursive: true });
    writeFileSync(join(dist, file), content);
  }
  return dist;
}

const meta = (over: Partial<EntryMeta>): EntryMeta => ({
  type: 'post',
  slug: 'x',
  lang: 'he',
  title: 't',
  date: '2026-01-01',
  tags: ['a'],
  readingMinutes: 1,
  availableLangs: ['he'],
  ...over,
});

const index = (lang: 'he' | 'en', entries: EntryMeta[]): LangIndex => ({ lang, generatedAt: '', entries, tags: [] });

describe('requiredFiles', () => {
  it('lists the core files when there is no content', () => {
    expect(requiredFiles()).toEqual([...CORE_FILES]);
    expect(requiredFiles()).toEqual(
      expect.arrayContaining(['index.html', 'he/index.html', 'en/index.html', '404.html', 'pagefind/pagefind.js', 'sitemap.xml', 'rss-he.xml', 'rss-en.xml']),
    );
  });

  it('adds a page per entry written in the index language, skipping fallbacks', () => {
    const files = requiredFiles([
      index('he', [meta({ slug: 'a' }), meta({ slug: 'b', type: 'note' }), meta({ slug: 'c', lang: 'en' })]),
      index('en', [meta({ slug: 'c', lang: 'en' }), meta({ slug: 'a' })]),
    ]);
    expect(files.slice(CORE_FILES.length)).toEqual(['he/posts/a/index.html', 'he/notes/b/index.html', 'en/posts/c/index.html']);
  });
});

describe('missingFiles', () => {
  it('returns nothing when every file exists', () => {
    const dist = makeDist([...CORE_FILES]);
    expect(missingFiles(dist, CORE_FILES)).toEqual([]);
  });

  it('returns the missing files in list order', () => {
    const dist = makeDist(CORE_FILES.filter((f) => f !== 'rss-en.xml' && f !== '404.html'));
    expect(missingFiles(dist, CORE_FILES)).toEqual(['404.html', 'rss-en.xml']);
  });
});

describe('readLangIndexes', () => {
  it('reads the indexes that exist', () => {
    const he = index('he', [meta({})]);
    const dist = makeDist({ 'content/he/index.json': JSON.stringify(he) });
    expect(readLangIndexes(dist)).toEqual([he]);
  });

  it('returns [] without content', () => {
    expect(readLangIndexes(makeDist([]))).toEqual([]);
  });
});
