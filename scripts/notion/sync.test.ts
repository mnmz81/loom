import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it, vi } from 'vitest';
import type { NotionPageLike } from './mapping';
import { runSync, SyncError, type NotionSource } from './sync';

const rich = (s: string) => (s ? [{ plain_text: s }] : []);

interface PageSpec {
  id: string;
  title: string;
  slug?: string;
  kind?: 'Post' | 'Note';
  lang?: 'he' | 'en';
  status?: string;
  summary?: string;
  series?: [string, number];
}

const notionPage = ({
  id,
  title,
  slug = '',
  kind = 'Post',
  lang = 'en',
  status = 'Published',
  summary = 'Sum',
  series,
}: PageSpec): NotionPageLike => ({
  id,
  url: `https://www.notion.so/${id}`,
  properties: {
    Title: { type: 'title', title: rich(title) },
    Slug: { type: 'rich_text', rich_text: rich(slug) },
    Kind: { type: 'select', select: { name: kind } },
    Lang: { type: 'select', select: { name: lang } },
    Status: { type: 'status', status: { name: status } },
    Tags: { type: 'multi_select', multi_select: [{ name: 'ai' }] },
    Date: { type: 'date', date: { start: '2026-09-01' } },
    Summary: { type: 'rich_text', rich_text: rich(summary) },
    Series: { type: 'select', select: series ? { name: series[0] } : null },
    'Series order': { type: 'number', number: series ? series[1] : null },
  },
});

function dirs() {
  const root = mkdtempSync(join(tmpdir(), 'notion-'));
  return { contentDir: join(root, 'content'), publicDir: join(root, 'public') };
}

function source(pages: NotionPageLike[], bodies: Record<string, string> = {}): NotionSource {
  return {
    listPublished: async () => pages,
    pageMarkdown: async (id) => bodies[id] ?? `Body of ${id}`,
  };
}

const noDownload = async () => undefined;

describe('runSync', () => {
  it('writes posts and notes to content/<kind>s/<slug>/<lang>.md and downloads images', async () => {
    const pages = [
      notionPage({ id: 'p1', title: 'First Post' }),
      notionPage({ id: 'n1', title: 'A Note', kind: 'Note', summary: 'ignored' }),
    ];
    const download = vi.fn(noDownload);
    const { contentDir, publicDir } = dirs();

    const result = await runSync({
      source: source(pages, { p1: 'Intro\n\n![shot](https://files.notion.so/a/shot.png?x=1)\n' }),
      download,
      contentDir,
      publicDir,
    });

    const post = join(contentDir, 'posts', 'first-post', 'en.md');
    const note = join(contentDir, 'notes', 'a-note', 'en.md');
    expect(result.written).toEqual([post, note]);
    const md = readFileSync(post, 'utf8');
    expect(matter(md).data).toEqual({
      title: 'First Post',
      summary: 'Sum',
      date: '2026-09-01',
      tags: ['ai'],
    });
    expect(md).toContain('![shot](/images/first-post/en-1.png)');
    expect(download).toHaveBeenCalledWith(
      'https://files.notion.so/a/shot.png?x=1',
      join(publicDir, 'images', 'first-post', 'en-1.png'),
    );
    expect(matter(readFileSync(note, 'utf8')).data).toEqual({
      title: 'A Note',
      date: '2026-09-01',
      tags: ['ai'],
    });
  });

  it('writes a Hebrew page and its English translation into the same folder', async () => {
    const pages = [
      notionPage({
        id: 'he1',
        title: 'ראסט: השאלה',
        slug: 'rust-borrowing',
        lang: 'he',
        summary: 'תקציר',
      }),
      notionPage({ id: 'en1', title: 'Rust: Borrowing', slug: 'rust-borrowing', lang: 'en' }),
    ];
    const { contentDir, publicDir } = dirs();

    const { written } = await runSync({
      source: source(pages),
      download: noDownload,
      contentDir,
      publicDir,
    });

    expect(written).toEqual([
      join(contentDir, 'posts', 'rust-borrowing', 'he.md'),
      join(contentDir, 'posts', 'rust-borrowing', 'en.md'),
    ]);
    expect(matter(readFileSync(written[0], 'utf8')).data['title']).toBe('ראסט: השאלה');
  });

  it('skips pages that are not Published', async () => {
    const pages = [
      notionPage({ id: 'd1', title: 'Draft One', status: 'Draft' }),
      notionPage({ id: 'p1', title: 'Live' }),
    ];
    const { contentDir, publicDir } = dirs();
    const { written } = await runSync({
      source: source(pages),
      download: noDownload,
      contentDir,
      publicDir,
    });
    expect(written).toEqual([join(contentDir, 'posts', 'live', 'en.md')]);
  });

  it('reports every invalid page together and writes nothing', async () => {
    const pages = [
      notionPage({ id: 'he-no-slug', title: 'שלום עולם', lang: 'he' }),
      notionPage({ id: 'no-summary', title: 'Empty', summary: '' }),
      notionPage({ id: 'good', title: 'Good One' }),
    ];
    const { contentDir, publicDir } = dirs();

    const error = await runSync({
      source: source(pages),
      download: noDownload,
      contentDir,
      publicDir,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SyncError);
    const message = (error as SyncError).message;
    expect((error as SyncError).errors).toHaveLength(2);
    expect(message).toContain('"שלום עולם" (https://www.notion.so/he-no-slug)');
    expect(message).toContain('Slug is required when the title is not Latin');
    expect(message).toContain('"Empty" (https://www.notion.so/no-summary)');
    expect(existsSync(contentDir)).toBe(false);
  });

  it('rejects duplicate slug + kind + lang naming both pages', async () => {
    const pages = [
      notionPage({ id: 'a', title: 'Same', slug: 'same' }),
      notionPage({ id: 'b', title: 'Other', slug: 'same' }),
    ];
    const { contentDir, publicDir } = dirs();
    await expect(
      runSync({ source: source(pages), download: noDownload, contentDir, publicDir }),
    ).rejects.toThrow(
      /Duplicate post "same" in en: "Same" \(https:\/\/www\.notion\.so\/a\) and "Other" \(https:\/\/www\.notion\.so\/b\)/,
    );
    expect(existsSync(contentDir)).toBe(false);
  });

  it('requires the series file to exist in the repo', async () => {
    const pages = [notionPage({ id: 'p1', title: 'Part One', series: ['learning-rust', 1] })];
    const { contentDir, publicDir } = dirs();
    await expect(
      runSync({ source: source(pages), download: noDownload, contentDir, publicDir }),
    ).rejects.toThrow(/Series "learning-rust" has no content\/series\/learning-rust\.yaml/);

    mkdirSync(join(contentDir, 'series'), { recursive: true });
    writeFileSync(join(contentDir, 'series', 'learning-rust.yaml'), 'title: { he: א, en: A }\n');
    const { written } = await runSync({
      source: source(pages),
      download: noDownload,
      contentDir,
      publicDir,
    });
    expect(matter(readFileSync(written[0], 'utf8')).data['series']).toEqual({
      key: 'learning-rust',
      order: 1,
    });
  });

  it('overwrites pulled files but never deletes other files or images', async () => {
    const { contentDir, publicDir } = dirs();
    const other = join(contentDir, 'posts', 'hand-written', 'he.md');
    const otherLang = join(contentDir, 'posts', 'first-post', 'he.md');
    const oldImage = join(publicDir, 'images', 'first-post', 'he-1.png');
    for (const f of [other, otherLang, oldImage]) {
      mkdirSync(join(f, '..'), { recursive: true });
      writeFileSync(f, 'keep');
    }
    const target = join(contentDir, 'posts', 'first-post', 'en.md');
    writeFileSync(target, 'old');

    await runSync({
      source: source([notionPage({ id: 'p1', title: 'First Post' })]),
      download: noDownload,
      contentDir,
      publicDir,
    });

    expect(readFileSync(target, 'utf8')).toContain('title: First Post');
    for (const f of [other, otherLang, oldImage]) expect(readFileSync(f, 'utf8')).toBe('keep');
  });

  it('reports body and download failures with the page label', async () => {
    const { contentDir, publicDir } = dirs();
    const failing: NotionSource = {
      listPublished: async () => [notionPage({ id: 'p1', title: 'First Post' })],
      pageMarkdown: async () => {
        throw new Error('rate limited');
      },
    };
    await expect(
      runSync({ source: failing, download: noDownload, contentDir, publicDir }),
    ).rejects.toThrow(
      /"First Post" \(https:\/\/www\.notion\.so\/p1\): could not read page body: rate limited/,
    );

    const withImage = source([notionPage({ id: 'p1', title: 'First Post' })], {
      p1: '![x](https://files.notion.so/x.png)',
    });
    const badDownload = async () => {
      throw new Error('GET failed with 403');
    };
    await expect(
      runSync({ source: withImage, download: badDownload, contentDir, publicDir }),
    ).rejects.toThrow(/First Post.*GET failed with 403/);
  });
});
