import { describe, expect, it } from 'vitest';
import { formatZodError, isKebab, noteFrontmatter, postFrontmatter, seriesFile, tagsFile } from './schema';

describe('postFrontmatter', () => {
  const valid = { title: 'T', summary: 'S', date: '2026-08-30', tags: ['angular'] };

  it('accepts valid frontmatter and defaults draft to false', () => {
    expect(postFrontmatter.parse(valid)).toEqual({ ...valid, draft: false });
  });

  it('accepts every optional key', () => {
    const full = {
      ...valid,
      updated: '2026-09-01',
      draft: true,
      cover: '/images/x/cover.png',
      series: { key: 'learning-rust', order: 2 },
    };
    expect(postFrontmatter.parse(full)).toEqual(full);
  });

  it('converts YAML Date objects to YYYY-MM-DD', () => {
    const parsed = postFrontmatter.parse({ ...valid, date: new Date('2026-08-30T00:00:00Z'), updated: new Date('2026-09-02T00:00:00Z') });
    expect(parsed.date).toBe('2026-08-30');
    expect(parsed.updated).toBe('2026-09-02');
  });

  it('rejects a missing title', () => {
    const { title: _omit, ...rest } = valid;
    expect(() => postFrontmatter.parse(rest)).toThrow();
  });

  it('rejects an empty title', () => {
    expect(() => postFrontmatter.parse({ ...valid, title: '' })).toThrow();
  });

  it('rejects a missing or empty summary', () => {
    const { summary: _omit, ...rest } = valid;
    expect(() => postFrontmatter.parse(rest)).toThrow();
    expect(() => postFrontmatter.parse({ ...valid, summary: '' })).toThrow();
  });

  it('rejects summaries over 200 chars and accepts exactly 200', () => {
    expect(() => postFrontmatter.parse({ ...valid, summary: 'x'.repeat(201) })).toThrow();
    expect(postFrontmatter.parse({ ...valid, summary: 'x'.repeat(200) }).summary).toHaveLength(200);
  });

  it('rejects a bad date format', () => {
    expect(() => postFrontmatter.parse({ ...valid, date: '30/08/2026' })).toThrow();
  });

  it('rejects updated before date and accepts updated equal to date', () => {
    expect(() => postFrontmatter.parse({ ...valid, updated: '2026-08-29' })).toThrow(/updated/);
    expect(postFrontmatter.parse({ ...valid, updated: '2026-08-30' }).updated).toBe('2026-08-30');
  });

  it('rejects non-kebab tags', () => {
    expect(() => postFrontmatter.parse({ ...valid, tags: ['Angular Signals'] })).toThrow();
    expect(() => postFrontmatter.parse({ ...valid, tags: ['ראסט'] })).toThrow();
  });

  it('rejects empty tags', () => {
    expect(() => postFrontmatter.parse({ ...valid, tags: [] })).toThrow();
  });

  it('rejects a cover outside /images/', () => {
    expect(() => postFrontmatter.parse({ ...valid, cover: 'images/x.png' })).toThrow();
    expect(() => postFrontmatter.parse({ ...valid, cover: 'https://x.y/a.png' })).toThrow();
  });

  it('rejects a bad series', () => {
    expect(() => postFrontmatter.parse({ ...valid, series: { key: 'Learning Rust', order: 1 } })).toThrow();
    expect(() => postFrontmatter.parse({ ...valid, series: { key: 'rust', order: 0 } })).toThrow();
    expect(() => postFrontmatter.parse({ ...valid, series: { key: 'rust', order: 1.5 } })).toThrow();
    expect(() => postFrontmatter.parse({ ...valid, series: { key: 'rust' } })).toThrow();
    expect(() => postFrontmatter.parse({ ...valid, series: { key: 'rust', order: 1, extra: 1 } })).toThrow();
  });

  it('rejects unknown keys', () => {
    expect(() => postFrontmatter.parse({ ...valid, author: 'me' })).toThrow();
  });
});

describe('noteFrontmatter', () => {
  const valid = { title: 'T', date: '2026-08-30', tags: ['git'] };

  it('accepts valid frontmatter and defaults draft to false', () => {
    expect(noteFrontmatter.parse(valid)).toEqual({ ...valid, draft: false });
    expect(noteFrontmatter.parse({ ...valid, updated: '2026-09-01', draft: true })).toMatchObject({ updated: '2026-09-01', draft: true });
  });

  it('rejects post-only keys (summary, cover, series)', () => {
    expect(() => noteFrontmatter.parse({ ...valid, summary: 'S' })).toThrow();
    expect(() => noteFrontmatter.parse({ ...valid, cover: '/images/a.png' })).toThrow();
    expect(() => noteFrontmatter.parse({ ...valid, series: { key: 'a', order: 1 } })).toThrow();
  });

  it('rejects missing title, date or tags', () => {
    expect(() => noteFrontmatter.parse({ date: valid.date, tags: valid.tags })).toThrow();
    expect(() => noteFrontmatter.parse({ title: 'T', tags: valid.tags })).toThrow();
    expect(() => noteFrontmatter.parse({ title: 'T', date: valid.date })).toThrow();
  });

  it('rejects updated before date', () => {
    expect(() => noteFrontmatter.parse({ ...valid, updated: '2026-01-01' })).toThrow(/updated/);
  });
});

describe('seriesFile', () => {
  it('accepts title in both languages and optional description', () => {
    const s = { title: { he: 'א', en: 'A' } };
    expect(seriesFile.parse(s)).toEqual({ ...s, description: {} });
    expect(seriesFile.parse({ ...s, description: { en: 'D' } }).description).toEqual({ en: 'D' });
  });

  it('requires both title languages', () => {
    expect(() => seriesFile.parse({ title: { he: 'א' } })).toThrow();
    expect(() => seriesFile.parse({ title: { he: 'א', en: '' } })).toThrow();
  });

  it('rejects unknown keys and languages', () => {
    expect(() => seriesFile.parse({ title: { he: 'א', en: 'A' }, order: 1 })).toThrow();
    expect(() => seriesFile.parse({ title: { he: 'א', en: 'A', fr: 'B' } })).toThrow();
    expect(() => seriesFile.parse({ title: { he: 'א', en: 'A' }, description: { fr: 'x' } })).toThrow();
  });
});

describe('tagsFile', () => {
  it('accepts partial labels per tag', () => {
    const tags = { rust: { he: 'ראסט', en: 'Rust' }, git: { en: 'Git' } };
    expect(tagsFile.parse(tags)).toEqual(tags);
  });

  it('accepts an empty file', () => {
    expect(tagsFile.parse(null)).toEqual({});
    expect(tagsFile.parse({})).toEqual({});
  });

  it('rejects non-kebab keys and unknown languages', () => {
    expect(() => tagsFile.parse({ Rust: { en: 'Rust' } })).toThrow();
    expect(() => tagsFile.parse({ rust: { fr: 'Rust' } })).toThrow();
    expect(() => tagsFile.parse({ rust: 'Rust' })).toThrow();
  });
});

describe('isKebab', () => {
  it('accepts lowercase latin kebab-case only', () => {
    expect(isKebab('rust-borrowing-2')).toBe(true);
    for (const bad of ['Rust', 'a--b', '-a', 'a-', 'a_b', 'ראסט', '']) expect(isKebab(bad), bad).toBe(false);
  });
});

describe('formatZodError', () => {
  it('lists every issue with its path on one line', () => {
    const result = postFrontmatter.safeParse({ title: '', date: 'x', tags: [] });
    expect(result.success).toBe(false);
    const message = formatZodError(result.error!);
    expect(message).toMatch(/title: /);
    expect(message).toMatch(/summary: /);
    expect(message).toMatch(/date: /);
    expect(message).toMatch(/tags: /);
    expect(message).not.toContain('\n');
  });
});
