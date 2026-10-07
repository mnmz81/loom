import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import type { Entry, LangIndex, SeriesIndex } from '../../src/app/core/content.models';
import { buildContent } from './collect';

type Files = Record<string, string>;

function makeContent(files: Files): { contentDir: string; outDir: string } {
  const root = mkdtempSync(join(tmpdir(), 'notebook-content-'));
  const contentDir = join(root, 'content');
  mkdirSync(contentDir, { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    const file = join(contentDir, rel);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, body);
  }
  return { contentDir, outDir: join(root, 'out') };
}

const md = (fm: Record<string, unknown>, body = '## Heading\n\nBody\n') => `---\n${YAML.stringify(fm)}---\n\n${body}`;
const post = (title: string, date: string, tags: string[], extra: Record<string, unknown> = {}) =>
  md({ title, summary: `${title} summary`, date, tags, ...extra });
const note = (title: string, date: string, tags: string[], extra: Record<string, unknown> = {}) => md({ title, date, tags, ...extra });
const series = (he: string, en: string, description?: Record<string, string>) =>
  YAML.stringify({ title: { he, en }, ...(description ? { description } : {}) });

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const index = (outDir: string, lang: string) => readJson<LangIndex>(join(outDir, lang, 'index.json'));
const entry = (outDir: string, lang: string, type: string, slug: string) => readJson<Entry>(join(outDir, lang, `${type}s`, `${slug}.json`));

const build = (dirs: { contentDir: string; outDir: string }, includeDrafts = false) =>
  buildContent({ ...dirs, includeDrafts, now: () => new Date('2026-10-07T00:00:00.000Z') });

describe('buildContent — output', () => {
  it('writes one index per language with every entry once, sorted date desc then slug asc, with fallback text', async () => {
    const dirs = makeContent({
      'posts/both/he.md': post('שניהם', '2026-02-01', ['ai']),
      'posts/both/en.md': post('Both', '2026-02-01', ['ai']),
      'posts/he-only/he.md': post('עברית בלבד', '2026-01-01', ['ai']),
      'notes/en-only/en.md': note('English only', '2026-02-01', ['git']),
      'notes/older/he.md': note('ישן', '2025-12-31', ['git']),
    });
    await build(dirs);

    const he = index(dirs.outDir, 'he');
    expect(he.lang).toBe('he');
    expect(he.generatedAt).toBe('2026-10-07T00:00:00.000Z');
    expect(he.entries.map((e) => [e.slug, e.lang, e.title])).toEqual([
      ['both', 'he', 'שניהם'],
      ['en-only', 'en', 'English only'],
      ['he-only', 'he', 'עברית בלבד'],
      ['older', 'he', 'ישן'],
    ]);
    const en = index(dirs.outDir, 'en');
    expect(en.entries.map((e) => [e.slug, e.lang, e.title])).toEqual([
      ['both', 'en', 'Both'],
      ['en-only', 'en', 'English only'],
      ['he-only', 'he', 'עברית בלבד'],
      ['older', 'he', 'ישן'],
    ]);
    expect(he.entries.map((e) => e.availableLangs)).toEqual([['he', 'en'], ['en'], ['he'], ['he']]);
    expect(he.entries[0]).not.toHaveProperty('html');
    expect(he.entries[0]).not.toHaveProperty('toc');
    expect(he.entries[0]).not.toHaveProperty('draft');
  });

  it('builds metas with only the keys the contract allows', async () => {
    const dirs = makeContent({
      'series/s.yaml': series('ס', 'S'),
      'posts/full/he.md': post('מלא', '2026-01-01', ['ai'], {
        updated: '2026-01-05',
        cover: '/images/full/c.png',
        series: { key: 's', order: 1 },
      }),
      'posts/bare/he.md': post('ריק', '2026-01-01', ['ai']),
      'notes/n/he.md': note('הערה', '2026-01-01', ['ai']),
    });
    await build(dirs);
    const byslug = Object.fromEntries(index(dirs.outDir, 'he').entries.map((e) => [e.slug, e]));
    expect(byslug['full']).toEqual({
      type: 'post',
      slug: 'full',
      lang: 'he',
      title: 'מלא',
      summary: 'מלא summary',
      date: '2026-01-01',
      updated: '2026-01-05',
      tags: ['ai'],
      readingMinutes: 1,
      cover: '/images/full/c.png',
      series: { key: 's', order: 1 },
      availableLangs: ['he'],
    });
    expect(Object.keys(byslug['bare']).sort()).toEqual(['availableLangs', 'date', 'lang', 'readingMinutes', 'slug', 'summary', 'tags', 'title', 'type']);
    expect(Object.keys(byslug['n']).sort()).toEqual(['availableLangs', 'date', 'lang', 'readingMinutes', 'slug', 'tags', 'title', 'type']);
  });

  it('counts tags over all entries with localized labels, count desc then tag asc', async () => {
    const dirs = makeContent({
      'tags.yaml': YAML.stringify({ rust: { he: 'ראסט', en: 'Rust' }, git: { en: 'Git' } }),
      'posts/a/he.md': post('א', '2026-01-03', ['rust', 'zsh']),
      'posts/a/en.md': post('A', '2026-01-03', ['rust', 'zsh']),
      'posts/b/en.md': post('B', '2026-01-02', ['rust']),
      'notes/c/he.md': note('ג', '2026-01-01', ['git']),
    });
    await build(dirs);
    expect(index(dirs.outDir, 'he').tags).toEqual([
      { tag: 'rust', label: 'ראסט', count: 2 },
      { tag: 'git', label: 'git', count: 1 },
      { tag: 'zsh', label: 'zsh', count: 1 },
    ]);
    expect(index(dirs.outDir, 'en').tags).toEqual([
      { tag: 'rust', label: 'Rust', count: 2 },
      { tag: 'git', label: 'Git', count: 1 },
      { tag: 'zsh', label: 'zsh', count: 1 },
    ]);
  });

  it('writes entry JSON only for the languages an entry exists in', async () => {
    const dirs = makeContent({
      'posts/both/he.md': post('שניהם', '2026-01-01', ['ai']),
      'posts/both/en.md': post('Both', '2026-01-01', ['ai']),
      'notes/en-only/en.md': note('English', '2026-01-01', ['ai']),
    });
    await build(dirs);
    expect(readdirSync(join(dirs.outDir, 'he', 'posts'))).toEqual(['both.json']);
    expect(readdirSync(join(dirs.outDir, 'en', 'posts'))).toEqual(['both.json']);
    expect(existsSync(join(dirs.outDir, 'he', 'notes', 'en-only.json'))).toBe(false);
    expect(readdirSync(join(dirs.outDir, 'en', 'notes'))).toEqual(['en-only.json']);

    const he = entry(dirs.outDir, 'he', 'post', 'both');
    expect(he).toMatchObject({ type: 'post', slug: 'both', lang: 'he', title: 'שניהם', readingMinutes: 1, availableLangs: ['he', 'en'] });
    expect(he.toc).toEqual([{ id: 'heading', text: 'Heading', depth: 2 }]);
    expect(he.html).toContain('<h2 id="heading">');
    expect(he).not.toHaveProperty('draft');
    expect(entry(dirs.outDir, 'en', 'post', 'both').title).toBe('Both');
  });

  it('writes empty posts/notes folders when there is no content', async () => {
    const dirs = makeContent({});
    const result = await build(dirs);
    for (const lang of ['he', 'en']) {
      expect(index(dirs.outDir, lang).entries).toEqual([]);
      expect(index(dirs.outDir, lang).tags).toEqual([]);
      expect(readdirSync(join(dirs.outDir, lang, 'posts'))).toEqual([]);
      expect(readdirSync(join(dirs.outDir, lang, 'notes'))).toEqual([]);
    }
    expect(readJson(join(dirs.outDir, 'series.json'))).toEqual([]);
    expect(result.entries).toEqual([]);
  });

  it('returns indexes, rendered entries and series', async () => {
    const dirs = makeContent({
      'series/s.yaml': series('ס', 'S'),
      'posts/a/he.md': post('א', '2026-01-01', ['ai']),
      'posts/a/en.md': post('A', '2026-01-01', ['ai']),
    });
    const result = await build(dirs);
    expect(result.indexes.he.entries).toHaveLength(1);
    expect(result.indexes.en.entries[0].title).toBe('A');
    expect(result.entries.map((e) => `${e.lang}/${e.slug}`)).toEqual(['he/a', 'en/a']);
    expect(result.series.map((s) => s.key)).toEqual(['s']);
  });

  it('removes JSON left from a previous build', async () => {
    const dirs = makeContent({ 'posts/keep/he.md': post('שמור', '2026-01-01', ['ai']) });
    mkdirSync(join(dirs.outDir, 'he', 'posts'), { recursive: true });
    mkdirSync(join(dirs.outDir, 'en', 'notes'), { recursive: true });
    writeFileSync(join(dirs.outDir, 'he', 'posts', 'stale.json'), '{}');
    writeFileSync(join(dirs.outDir, 'en', 'notes', 'stale.json'), '{}');
    await build(dirs);
    expect(readdirSync(join(dirs.outDir, 'he', 'posts'))).toEqual(['keep.json']);
    expect(existsSync(join(dirs.outDir, 'en', 'notes', 'stale.json'))).toBe(false);
  });

  it('ignores hidden files such as .DS_Store', async () => {
    const dirs = makeContent({
      '.DS_Store': 'x',
      'posts/.DS_Store': 'x',
      'posts/a/.DS_Store': 'x',
      'posts/a/he.md': post('א', '2026-01-01', ['ai']),
      'series/.DS_Store': 'x',
    });
    await build(dirs);
    expect(index(dirs.outDir, 'he').entries.map((e) => e.slug)).toEqual(['a']);
  });
});

describe('buildContent — drafts', () => {
  const files = () => ({
    'posts/live/he.md': post('חי', '2026-01-02', ['ai']),
    'posts/live/en.md': post('Live', '2026-01-02', ['ai'], { draft: true }),
    'posts/wip/he.md': post('טיוטה', '2026-01-01', ['ai'], { draft: true }),
    'notes/wip-note/en.md': note('WIP', '2026-01-01', ['ai'], { draft: true }),
  });

  it('treats a draft translation as missing and drops fully-draft entries in production', async () => {
    const dirs = makeContent(files());
    await build(dirs);
    const en = index(dirs.outDir, 'en');
    expect(en.entries.map((e) => [e.slug, e.lang, e.availableLangs])).toEqual([['live', 'he', ['he']]]);
    expect(en.tags).toEqual([{ tag: 'ai', label: 'ai', count: 1 }]);
    expect(existsSync(join(dirs.outDir, 'en', 'posts', 'live.json'))).toBe(false);
    expect(existsSync(join(dirs.outDir, 'he', 'posts', 'wip.json'))).toBe(false);
    expect(existsSync(join(dirs.outDir, 'en', 'notes', 'wip-note.json'))).toBe(false);
  });

  it('includes drafts when includeDrafts is true', async () => {
    const dirs = makeContent(files());
    await build(dirs, true);
    const en = index(dirs.outDir, 'en');
    expect(en.entries.map((e) => [e.slug, e.lang])).toEqual([
      ['live', 'en'],
      ['wip', 'he'],
      ['wip-note', 'en'],
    ]);
    expect(en.entries[0].availableLangs).toEqual(['he', 'en']);
    expect(entry(dirs.outDir, 'en', 'post', 'live').title).toBe('Live');
    expect(entry(dirs.outDir, 'he', 'post', 'wip').title).toBe('טיוטה');
  });
});

describe('buildContent — related', () => {
  it('picks ≤ 3 entries by most shared tags, then newest, never itself, only with a shared tag', async () => {
    const dirs = makeContent({
      'posts/main/he.md': post('ראשי', '2026-01-10', ['a', 'b', 'c']),
      'posts/main/en.md': post('Main', '2026-01-10', ['a', 'b', 'c']),
      'posts/three/he.md': post('שלוש', '2026-01-01', ['a', 'b', 'c']),
      'posts/two-old/en.md': post('Two old', '2026-01-02', ['a', 'b']),
      'notes/two-new/he.md': note('שתיים חדש', '2026-01-03', ['b', 'c']),
      'notes/one/en.md': note('One', '2026-01-09', ['a']),
      'notes/none/he.md': note('כלום', '2026-01-09', ['z']),
    });
    await build(dirs);
    expect(entry(dirs.outDir, 'he', 'post', 'main').related).toEqual([
      { type: 'post', slug: 'three', lang: 'he', title: 'שלוש' },
      { type: 'note', slug: 'two-new', lang: 'he', title: 'שתיים חדש' },
      { type: 'post', slug: 'two-old', lang: 'en', title: 'Two old' },
    ]);
    expect(entry(dirs.outDir, 'en', 'post', 'main').related.map((r) => [r.slug, r.lang])).toEqual([
      ['three', 'he'],
      ['two-new', 'he'],
      ['two-old', 'en'],
    ]);
    expect(entry(dirs.outDir, 'he', 'note', 'none').related).toEqual([]);
    expect(entry(dirs.outDir, 'en', 'note', 'one').related.map((r) => r.slug)).toEqual(['main', 'two-old', 'three']);
  });

  it('prefers the reference title in the entry language', async () => {
    const dirs = makeContent({
      'posts/a/he.md': post('א', '2026-01-02', ['x']),
      'posts/a/en.md': post('A', '2026-01-02', ['x']),
      'posts/b/he.md': post('ב', '2026-01-01', ['x']),
      'posts/b/en.md': post('B', '2026-01-01', ['x']),
    });
    await build(dirs);
    expect(entry(dirs.outDir, 'en', 'post', 'a').related).toEqual([{ type: 'post', slug: 'b', lang: 'en', title: 'B' }]);
    expect(entry(dirs.outDir, 'he', 'post', 'a').related).toEqual([{ type: 'post', slug: 'b', lang: 'he', title: 'ב' }]);
  });

  it('never links to unpublished drafts', async () => {
    const dirs = makeContent({
      'posts/a/he.md': post('א', '2026-01-02', ['x']),
      'posts/b/he.md': post('ב', '2026-01-01', ['x'], { draft: true }),
    });
    await build(dirs);
    expect(entry(dirs.outDir, 'he', 'post', 'a').related).toEqual([]);
  });
});

describe('buildContent — series', () => {
  const files = (): Files => ({
    'series/learning-rust.yaml': series('לומדים ראסט', 'Learning Rust', { he: 'תיאור', en: 'Description' }),
    'series/empty.yaml': series('ריק', 'Empty'),
    'posts/r1/he.md': post('ר1', '2026-01-01', ['rust'], { series: { key: 'learning-rust', order: 1 } }),
    'posts/r3/he.md': post('ר3', '2026-01-03', ['rust'], { series: { key: 'learning-rust', order: 3 } }),
    'posts/r3/en.md': post('R3', '2026-01-03', ['rust'], { series: { key: 'learning-rust', order: 3 } }),
    'posts/r2/en.md': post('R2', '2026-01-02', ['rust'], { series: { key: 'learning-rust', order: 2 } }),
    'posts/other/he.md': post('אחר', '2026-01-04', ['rust']),
  });

  it('writes series.json sorted by key with published slugs in order', async () => {
    const dirs = makeContent(files());
    await build(dirs);
    expect(readJson<SeriesIndex>(join(dirs.outDir, 'series.json'))).toEqual([
      { key: 'empty', title: { he: 'ריק', en: 'Empty' }, description: {}, slugs: [] },
      {
        key: 'learning-rust',
        title: { he: 'לומדים ראסט', en: 'Learning Rust' },
        description: { he: 'תיאור', en: 'Description' },
        slugs: ['r1', 'r2', 'r3'],
      },
    ]);
  });

  it('builds seriesNav with localized title, position, total and fallback prev/next refs', async () => {
    const dirs = makeContent(files());
    await build(dirs);
    expect(entry(dirs.outDir, 'he', 'post', 'r1').seriesNav).toEqual({
      key: 'learning-rust',
      title: 'לומדים ראסט',
      index: 1,
      total: 3,
      prev: null,
      next: { type: 'post', slug: 'r2', lang: 'en', title: 'R2' },
    });
    expect(entry(dirs.outDir, 'en', 'post', 'r2').seriesNav).toEqual({
      key: 'learning-rust',
      title: 'Learning Rust',
      index: 2,
      total: 3,
      prev: { type: 'post', slug: 'r1', lang: 'he', title: 'ר1' },
      next: { type: 'post', slug: 'r3', lang: 'en', title: 'R3' },
    });
    expect(entry(dirs.outDir, 'he', 'post', 'r3').seriesNav).toMatchObject({
      index: 3,
      prev: { slug: 'r2', lang: 'en' },
      next: null,
    });
    expect(entry(dirs.outDir, 'he', 'post', 'other').seriesNav).toBeNull();
  });

  it('skips draft posts in series position, total and slugs', async () => {
    const dirs = makeContent({
      ...files(),
      'posts/r2/en.md': post('R2', '2026-01-02', ['rust'], { series: { key: 'learning-rust', order: 2 }, draft: true }),
    });
    await build(dirs);
    expect(readJson<SeriesIndex>(join(dirs.outDir, 'series.json'))[1].slugs).toEqual(['r1', 'r3']);
    expect(entry(dirs.outDir, 'he', 'post', 'r3').seriesNav).toMatchObject({
      index: 2,
      total: 2,
      prev: { slug: 'r1', lang: 'he', title: 'ר1' },
      next: null,
    });
  });
});

describe('buildContent — validation', () => {
  const ok = (title = 'א', date = '2026-01-01') => post(title, date, ['ai']);

  async function errorOf(files: Files): Promise<string> {
    const dirs = makeContent(files);
    try {
      await build(dirs);
    } catch (error) {
      expect(existsSync(dirs.outDir)).toBe(false);
      return (error as Error).message;
    }
    throw new Error('expected buildContent to fail');
  }

  it('rejects invalid frontmatter naming the file and the field', async () => {
    const message = await errorOf({ 'posts/bad/he.md': md({ title: 'X', date: '2026-01-01', tags: ['ai'] }) });
    expect(message).toMatch(/posts\/bad\/he\.md: .*summary/);
  });

  it('rejects missing frontmatter', async () => {
    expect(await errorOf({ 'notes/bare/en.md': 'just text\n' })).toMatch(/notes\/bare\/en\.md/);
  });

  it('rejects unparseable YAML frontmatter', async () => {
    expect(await errorOf({ 'posts/bad-yaml/he.md': '---\ntitle: a: b\n---\n' })).toMatch(/posts\/bad-yaml\/he\.md/);
  });

  it('rejects a note with post-only keys', async () => {
    expect(await errorOf({ 'notes/n/he.md': md({ title: 'N', summary: 'S', date: '2026-01-01', tags: ['a'] }) })).toMatch(
      /notes\/n\/he\.md: .*summary/,
    );
  });

  it('rejects files other than he.md / en.md in an entry folder', async () => {
    const message = await errorOf({
      'posts/a/he.md': ok(),
      'posts/a/fr.md': ok(),
      'posts/a/image.png': 'x',
      'notes/b/EN.md': ok(),
    });
    expect(message).toMatch(/posts\/a\/fr\.md/);
    expect(message).toMatch(/posts\/a\/image\.png/);
    expect(message).toMatch(/notes\/b\/EN\.md/);
  });

  it('rejects an entry folder with no he.md / en.md', async () => {
    const dirs = makeContent({ 'posts/a/he.md': ok() });
    mkdirSync(join(dirs.contentDir, 'posts', 'empty'));
    await expect(build(dirs)).rejects.toThrow(/posts\/empty/);
  });

  it('rejects a nested folder inside an entry folder', async () => {
    expect(await errorOf({ 'posts/a/he.md': ok(), 'posts/a/images/x.md': ok() })).toMatch(/posts\/a\/images/);
  });

  it('rejects files directly under posts/ or notes/', async () => {
    expect(await errorOf({ 'posts/loose.md': ok() })).toMatch(/posts\/loose\.md/);
  });

  it('rejects a non-kebab slug folder', async () => {
    expect(await errorOf({ 'posts/My Post/he.md': ok() })).toMatch(/posts\/My Post.*kebab/);
  });

  it('rejects the same slug under posts/ and notes/', async () => {
    const message = await errorOf({
      'posts/dup/he.md': ok(),
      'notes/dup/en.md': note('Dup', '2026-01-01', ['ai']),
    });
    expect(message).toMatch(/dup/);
    expect(message).toMatch(/posts\/dup/);
    expect(message).toMatch(/notes\/dup/);
  });

  it.each([
    ['date', { date: '2026-01-02' }],
    ['tags', { tags: ['ai', 'extra'] }],
    ['series', { series: { key: 's', order: 2 } }],
    ['cover', { cover: '/images/x.png' }],
  ])('rejects translations whose shared %s differs, naming both files', async (field, override) => {
    const base = { title: 'T', summary: 'S', date: '2026-01-01', tags: ['ai'], series: { key: 's', order: 1 } };
    const message = await errorOf({
      'series/s.yaml': series('ס', 'S'),
      'posts/a/he.md': md(base),
      'posts/a/en.md': md({ ...base, ...override }),
    });
    expect(message).toMatch(new RegExp(`posts/a/he\\.md.*posts/a/en\\.md.*${field}|${field}.*posts/a/he\\.md.*posts/a/en\\.md`));
  });

  it('allows per-language title, summary, updated, draft and body', async () => {
    const dirs = makeContent({
      'posts/a/he.md': md({ title: 'א', summary: 'ס', date: '2026-01-01', tags: ['ai'], updated: '2026-01-03' }, 'גוף'),
      'posts/a/en.md': md({ title: 'A', summary: 'S', date: '2026-01-01', tags: ['ai'], draft: true }, 'Body'),
    });
    await expect(build(dirs)).resolves.toBeDefined();
  });

  it('rejects translations with different shared facts even when one is a draft', async () => {
    expect(
      await errorOf({
        'notes/a/he.md': note('א', '2026-01-01', ['ai']),
        'notes/a/en.md': note('A', '2026-01-01', ['git'], { draft: true }),
      }),
    ).toMatch(/notes\/a\/he\.md.*notes\/a\/en\.md.*tags/);
  });

  it('rejects an unknown series key', async () => {
    expect(await errorOf({ 'posts/a/he.md': post('א', '2026-01-01', ['ai'], { series: { key: 'nope', order: 1 } }) })).toMatch(
      /posts\/a\/he\.md: .*series "nope"/,
    );
  });

  it('rejects a duplicate order within a series, naming both posts', async () => {
    const message = await errorOf({
      'series/s.yaml': series('ס', 'S'),
      'posts/a/he.md': post('א', '2026-01-01', ['ai'], { series: { key: 's', order: 1 } }),
      'posts/b/en.md': post('B', '2026-01-02', ['ai'], { series: { key: 's', order: 1 } }),
      'posts/c/he.md': post('ג', '2026-01-02', ['ai'], { series: { key: 's', order: 2 } }),
    });
    expect(message).toMatch(/order 1/);
    expect(message).toMatch(/posts\/a/);
    expect(message).toMatch(/posts\/b/);
    expect(message).not.toMatch(/posts\/c/);
  });

  it('rejects an invalid series file and a non-kebab series file name', async () => {
    const message = await errorOf({
      'series/bad.yaml': YAML.stringify({ title: { he: 'א' } }),
      'series/Bad Name.yaml': series('א', 'A'),
      'series/notes.txt': 'x',
    });
    expect(message).toMatch(/series\/bad\.yaml: .*title/);
    expect(message).toMatch(/series\/Bad Name\.yaml.*kebab/);
    expect(message).toMatch(/series\/notes\.txt/);
  });

  it('rejects an invalid tags.yaml', async () => {
    expect(await errorOf({ 'tags.yaml': YAML.stringify({ Rust: { en: 'Rust' } }) })).toMatch(/tags\.yaml/);
    expect(await errorOf({ 'tags.yaml': 'a: [' })).toMatch(/tags\.yaml/);
  });

  it('reports every invalid file together', async () => {
    const message = await errorOf({
      'posts/bad-one/he.md': '---\ntitle: X\n---\n',
      'notes/bad-two/en.md': '---\ntitle: Y\n---\n',
    });
    expect(message).toMatch(/^Invalid content/);
    expect(message).toMatch(/bad-one\/he\.md[\s\S]*bad-two\/en\.md/);
  });
});
