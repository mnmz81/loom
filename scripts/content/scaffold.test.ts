import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { buildContent } from './collect';
import { lastSeriesOrder, scaffoldEntry } from './scaffold';

function makeContent(files: Record<string, string> = {}): string {
  const contentDir = join(mkdtempSync(join(tmpdir(), 'loom-scaffold-')), 'content');
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(join(contentDir, rel, '..'), { recursive: true });
    writeFileSync(join(contentDir, rel), body);
  }
  return contentDir;
}

const seriesPost = (key: string, order: number) => `---\ntitle: T\nsummary: S\ndate: 2026-01-01\ntags: [ai]\nseries: { key: ${key}, order: ${order} }\n---\n\nBody\n`;
const fm = (file: string) => matter(readFileSync(file, 'utf8')).data;

describe('scaffoldEntry', () => {
  it('writes he.md and en.md drafts with identical shared facts', () => {
    const contentDir = makeContent({ 'tags.yaml': 'ai: { he: בינה, en: AI }\n' });
    const result = scaffoldEntry({ contentDir, type: 'post', slug: 'new-one', tags: ['ai'], date: '2026-10-12' });

    expect(result.files).toEqual([join(contentDir, 'posts/new-one/he.md'), join(contentDir, 'posts/new-one/en.md')]);
    const [he, en] = result.files.map(fm);
    for (const data of [he, en]) {
      expect(data['tags']).toEqual(['ai']);
      expect(data['draft']).toBe(true);
      expect(data['summary']).toMatch(/TODO/);
    }
    expect(he['date']).toEqual(en['date']);
    expect(result.unlabeledTags).toEqual([]);
  });

  it('gives a series post the next free order across all posts and languages', () => {
    const contentDir = makeContent({
      'series/py.yaml': 'title: { he: פ, en: P }\n',
      'posts/a/he.md': seriesPost('py', 1),
      'posts/b/en.md': seriesPost('py', 7),
      'posts/c/he.md': seriesPost('other', 20),
    });
    expect(lastSeriesOrder(contentDir, 'py')).toBe(7);
    const result = scaffoldEntry({ contentDir, type: 'post', slug: 'next', tags: ['ai'], date: '2026-10-12', series: 'py' });
    expect(result.order).toBe(8);
    expect(fm(result.files[1])['series']).toEqual({ key: 'py', order: 8 });
  });

  it('writes notes without summary or series and reports tags missing from tags.yaml', () => {
    const contentDir = makeContent();
    const result = scaffoldEntry({ contentDir, type: 'note', slug: 'til', tags: ['git', 'cli'], date: '2026-10-12' });
    expect(result.files[0]).toBe(join(contentDir, 'notes/til/he.md'));
    expect(fm(result.files[0])).not.toHaveProperty('summary');
    expect(result.unlabeledTags).toEqual(['git', 'cli']);
  });

  it('rejects every problem at once and writes nothing', () => {
    const contentDir = makeContent({ 'notes/taken/he.md': '---\ntitle: T\ndate: 2026-01-01\ntags: [ai]\n---\n' });
    expect(() => scaffoldEntry({ contentDir, type: 'post', slug: 'Bad Slug', tags: ['Web Dev'], date: '12/10/2026', series: 'nope' })).toThrow(
      /slug "Bad Slug"[\s\S]*tag "Web Dev"[\s\S]*date "12\/10\/2026"[\s\S]*unknown series "nope"/,
    );
    expect(() => scaffoldEntry({ contentDir, type: 'post', slug: 'taken', tags: [], date: '2026-10-12' })).toThrow(
      /at least one tag[\s\S]*already exists in content\/notes/,
    );
    expect(() => scaffoldEntry({ contentDir, type: 'note', slug: 'n', tags: ['ai'], date: '2026-10-12', series: 'x' })).toThrow(/only posts/);
  });

  it('produces files the content build accepts', async () => {
    const contentDir = makeContent({ 'series/py.yaml': 'title: { he: פ, en: P }\n' });
    scaffoldEntry({ contentDir, type: 'post', slug: 'p', tags: ['ai'], date: '2026-10-12', series: 'py' });
    scaffoldEntry({ contentDir, type: 'note', slug: 'n', tags: ['ai'], date: '2026-10-12' });
    const outDir = join(contentDir, '..', 'out');
    await expect(buildContent({ contentDir, outDir, includeDrafts: true })).resolves.toBeDefined();
  });
});
