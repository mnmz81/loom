import { describe, expect, it } from 'vitest';
import matter from 'gray-matter';
import {
  checkEntries,
  entryPath,
  isLatin,
  isPublished,
  type NotionEntry,
  type NotionPageLike,
  noteFrontmatter,
  PageError,
  postFrontmatter,
  readEntry,
  rewriteImages,
  slugify,
  toMarkdownFile,
} from './mapping';

const rich = (s: string) => (s ? [{ plain_text: s }] : []);
const select = (name: string | null) => ({
  type: 'select',
  select: name === null ? null : { name },
});

function page(overrides: Record<string, unknown> = {}, id = 'page-1'): NotionPageLike {
  return {
    id,
    url: `https://www.notion.so/${id}`,
    properties: {
      Title: { type: 'title', title: rich('Angular Signals in Practice!') },
      Slug: { type: 'rich_text', rich_text: [] },
      Kind: select('Post'),
      Lang: select('en'),
      Status: { type: 'status', status: { name: 'Published' } },
      Tags: { type: 'multi_select', multi_select: [{ name: 'Angular' }, { name: 'Web Dev' }] },
      Date: { type: 'date', date: { start: '2026-08-30T10:00:00.000+03:00' } },
      Updated: { type: 'date', date: null },
      Summary: { type: 'rich_text', rich_text: rich('How signals changed my state code.') },
      Series: select(null),
      'Series order': { type: 'number', number: null },
      Cover: { type: 'rich_text', rich_text: [] },
      ...overrides,
    },
  };
}

function issuesOf(p: NotionPageLike): string[] {
  try {
    readEntry(p);
  } catch (error) {
    expect(error).toBeInstanceOf(PageError);
    return (error as PageError).issues;
  }
  throw new Error('expected readEntry to throw');
}

describe('slugify / isLatin', () => {
  it('makes kebab-case slugs', () => {
    expect(slugify('Angular Signals in Practice!')).toBe('angular-signals-in-practice');
    expect(slugify('  Web   Dev_2 ')).toBe('web-dev-2');
    expect(slugify('Café Crème')).toBe('cafe-creme');
    expect(slugify('--a--b--')).toBe('a-b');
    expect(slugify('שלום')).toBe('');
  });

  it('detects non-Latin titles', () => {
    expect(isLatin('Café: a post (2)')).toBe(true);
    expect(isLatin('ראסט: השאלה')).toBe(false);
    expect(isLatin('Rust ראסט')).toBe(false);
  });
});

describe('readEntry: property mapping', () => {
  it('maps every property of a post', () => {
    const entry = readEntry(
      page({
        Slug: { type: 'rich_text', rich_text: rich('signals') },
        Updated: { type: 'date', date: { start: '2026-09-02' } },
        Series: select('learning-angular'),
        'Series order': { type: 'number', number: 2 },
        Cover: { type: 'rich_text', rich_text: rich('/images/signals/cover.png') },
      }),
    );
    expect(entry).toEqual({
      id: 'page-1',
      label: '"Angular Signals in Practice!" (https://www.notion.so/page-1)',
      kind: 'post',
      lang: 'en',
      slug: 'signals',
      frontmatter: {
        title: 'Angular Signals in Practice!',
        summary: 'How signals changed my state code.',
        date: '2026-08-30',
        updated: '2026-09-02',
        tags: ['angular', 'web-dev'],
        cover: '/images/signals/cover.png',
        series: { key: 'learning-angular', order: 2 },
      },
    });
  });

  it('derives the slug from a Latin title and dedupes tags', () => {
    const entry = readEntry(
      page({ Tags: { type: 'multi_select', multi_select: [{ name: 'Rust' }, { name: 'rust' }] } }),
    );
    expect(entry.slug).toBe('angular-signals-in-practice');
    expect(entry.frontmatter.tags).toEqual(['rust']);
  });

  it('kebab-cases an explicit slug', () => {
    expect(readEntry(page({ Slug: { type: 'rich_text', rich_text: rich('My Post') } })).slug).toBe(
      'my-post',
    );
  });

  it('reads a Hebrew page with an explicit slug', () => {
    const entry = readEntry(
      page({
        Title: { type: 'title', title: rich('ראסט: השאלה') },
        Slug: { type: 'rich_text', rich_text: rich('rust-borrowing') },
        Lang: select('he'),
      }),
    );
    expect(entry).toMatchObject({
      slug: 'rust-borrowing',
      lang: 'he',
      frontmatter: { title: 'ראסט: השאלה' },
    });
    expect(entryPath(entry)).toBe('posts/rust-borrowing/he.md');
  });

  it('maps a note without summary, series or cover', () => {
    const entry = readEntry(
      page({
        Kind: select('Note'),
        Summary: { type: 'rich_text', rich_text: rich('ignored for notes') },
      }),
    );
    expect(entry.kind).toBe('note');
    expect(entry.frontmatter).toEqual({
      title: 'Angular Signals in Practice!',
      date: '2026-08-30',
      tags: ['angular', 'web-dev'],
    });
    expect(entryPath(entry)).toBe('notes/angular-signals-in-practice/en.md');
  });
});

describe('readEntry: errors', () => {
  it('requires a slug when the title is not Latin', () => {
    const issues = issuesOf(
      page({ Title: { type: 'title', title: rich('שלום עולם') }, Lang: select('he') }),
    );
    expect(issues).toEqual([expect.stringMatching(/Slug is required when the title is not Latin/)]);
  });

  it('rejects a non-Latin explicit slug', () => {
    expect(issuesOf(page({ Slug: { type: 'rich_text', rich_text: rich('שלום') } }))).toEqual([
      expect.stringMatching(/Slug "שלום" is invalid/),
    ]);
  });

  it('rejects an invalid Kind and Lang', () => {
    const issues = issuesOf(page({ Kind: select('Project'), Lang: select(null) }));
    expect(issues).toContain('Kind must be Post or Note (got "Project")');
    expect(issues).toContain('Lang must be he or en (got "")');
  });

  it('requires Date, Tags and Title', () => {
    const issues = issuesOf(
      page({
        Title: { type: 'title', title: [] },
        Slug: { type: 'rich_text', rich_text: rich('x') },
        Date: { type: 'date', date: null },
        Tags: { type: 'multi_select', multi_select: [] },
      }),
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        'Date is required',
        'Tags at least one tag is required',
        'Title is required',
      ]),
    );
  });

  it('rejects non-Latin tags', () => {
    expect(
      issuesOf(page({ Tags: { type: 'multi_select', multi_select: [{ name: 'ראסט' }] } })),
    ).toEqual([expect.stringMatching(/Tag "ראסט" is not Latin/)]);
  });

  it('reports all problems of a page together, with its title and URL', () => {
    try {
      readEntry(
        page({ Summary: { type: 'rich_text', rich_text: [] }, Date: { type: 'date', date: null } }),
      );
      throw new Error('expected throw');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('"Angular Signals in Practice!" (https://www.notion.so/page-1)');
      expect(message).toContain('Summary is required for posts');
      expect(message).toContain('Date is required');
    }
  });

  it('rejects Updated before Date and a cover outside /images/', () => {
    const issues = issuesOf(
      page({
        Updated: { type: 'date', date: { start: '2026-01-01' } },
        Cover: { type: 'rich_text', rich_text: rich('https://x.dev/a.png') },
      }),
    );
    expect(issues).toEqual(
      expect.arrayContaining(['Updated must not be before Date', 'Cover must start with /images/']),
    );
  });
});

describe('readEntry: summary rules', () => {
  it('requires a summary for posts, at most 200 characters', () => {
    expect(issuesOf(page({ Summary: { type: 'rich_text', rich_text: [] } }))).toEqual([
      'Summary is required for posts',
    ]);
    expect(
      issuesOf(page({ Summary: { type: 'rich_text', rich_text: rich('x'.repeat(201)) } })),
    ).toEqual(['Summary must be at most 200 characters']);
    expect(
      readEntry(page({ Summary: { type: 'rich_text', rich_text: rich('א'.repeat(200)) } }))
        .frontmatter.summary,
    ).toHaveLength(200);
  });

  it('ignores the summary for notes, even an over-long one', () => {
    const entry = readEntry(
      page({
        Kind: select('Note'),
        Summary: { type: 'rich_text', rich_text: rich('x'.repeat(500)) },
      }),
    );
    expect(entry.frontmatter).not.toHaveProperty('summary');
  });
});

describe('readEntry: series rules', () => {
  const series = (key: string | null, order: number | null) => ({
    Series: select(key),
    'Series order': { type: 'number', number: order },
  });

  it('requires Series order when Series is set', () => {
    expect(issuesOf(page(series('learning-rust', null)))).toEqual([
      'Series order is required when Series is set',
    ]);
  });

  it('rejects Series order without Series', () => {
    expect(issuesOf(page(series(null, 3)))).toEqual(['Series order is set but Series is empty']);
  });

  it('requires an integer order ≥ 1 and a kebab-case key', () => {
    expect(issuesOf(page(series('learning-rust', 0)))).toEqual(['Series order must be ≥ 1']);
    expect(issuesOf(page(series('learning-rust', 1.5)))).toEqual([
      expect.stringMatching(/^Series order /),
    ]);
    expect(issuesOf(page(series('Learning Rust', 1)))).toEqual([
      'Series must be lowercase Latin kebab-case',
    ]);
  });

  it('rejects series and cover on notes', () => {
    const issues = issuesOf(
      page({
        Kind: select('Note'),
        ...series('learning-rust', 1),
        Cover: { type: 'rich_text', rich_text: rich('/images/a.png') },
      }),
    );
    expect(issues).toEqual([
      'Series / Series order are only for posts; clear them on notes',
      'Cover is only for posts; clear it on notes',
    ]);
  });
});

describe('isPublished', () => {
  it('only accepts Status = Published', () => {
    expect(isPublished(page())).toBe(true);
    expect(isPublished(page({ Status: { type: 'status', status: { name: 'Draft' } } }))).toBe(
      false,
    );
  });
});

describe('checkEntries', () => {
  const entry = (lang: 'he' | 'en', overrides: Record<string, unknown> = {}, id = `${lang}-page`) =>
    readEntry(
      page(
        {
          Slug: { type: 'rich_text', rich_text: rich('signals') },
          Lang: select(lang),
          ...overrides,
        },
        id,
      ),
    );

  it('pairs translations with the same slug and kind', () => {
    const he = entry('he', { Title: { type: 'title', title: rich('סיגנלים') } });
    const en = entry('en');
    expect(checkEntries([he, en])).toEqual([]);
    expect([he, en].map(entryPath)).toEqual(['posts/signals/he.md', 'posts/signals/en.md']);
  });

  it('reports duplicates (same slug, kind and lang) naming both pages', () => {
    const errors = checkEntries([entry('en', {}, 'a'), entry('en', {}, 'b')]);
    expect(errors).toEqual([
      expect.stringMatching(
        /Duplicate post "signals" in en: .*notion\.so\/a.* and .*notion\.so\/b/,
      ),
    ]);
  });

  it('reports the same slug used as a post and a note', () => {
    const errors = checkEntries([entry('he'), entry('en', { Kind: select('Note') })]);
    expect(errors).toEqual([expect.stringMatching(/used by both a Post and a Note/)]);
  });

  it('requires translations to share date, tags, series and cover', () => {
    const errors = checkEntries([
      entry('he', {
        Date: { type: 'date', date: { start: '2026-08-31' } },
        Tags: { type: 'multi_select', multi_select: [{ name: 'rust' }] },
      }),
      entry('en', {
        Series: select('s'),
        'Series order': { type: 'number', number: 1 },
        Cover: { type: 'rich_text', rich_text: rich('/images/x.png') },
      }),
    ]);
    expect(errors).toEqual([
      expect.stringMatching(/must share Date: .*he-page.* and .*en-page.* differ/),
      expect.stringMatching(/must share Tags/),
      expect.stringMatching(/must share Series \/ Series order/),
      expect.stringMatching(/must share Cover/),
    ]);
  });

  it('allows per-language title, summary and updated', () => {
    const errors = checkEntries([
      entry('he', {
        Summary: { type: 'rich_text', rich_text: rich('תקציר') },
        Updated: { type: 'date', date: { start: '2026-09-09' } },
      }),
      entry('en'),
    ]);
    expect(errors).toEqual([]);
  });

  it('rejects a series order used by two different posts, but not by translations', () => {
    const s = { Series: select('learning-rust'), 'Series order': { type: 'number', number: 1 } };
    const a = readEntry(page({ ...s, Slug: { type: 'rich_text', rich_text: rich('a') } }, 'a'));
    const aHe = readEntry(
      page({ ...s, Slug: { type: 'rich_text', rich_text: rich('a') }, Lang: select('he') }, 'a-he'),
    );
    const b = readEntry(page({ ...s, Slug: { type: 'rich_text', rich_text: rich('b') } }, 'b'));
    expect(checkEntries([a, aHe])).toEqual([]);
    expect(checkEntries([a, aHe, b])).toEqual([
      expect.stringMatching(/Series "learning-rust" order 1 is used twice/),
    ]);
  });
});

describe('toMarkdownFile', () => {
  const parse = (e: NotionEntry, body = '') => matter(toMarkdownFile(e, body));

  it('writes contract frontmatter for a post that passes the strict schema', () => {
    const e = readEntry(
      page({ Series: select('learning-angular'), 'Series order': { type: 'number', number: 1 } }),
    );
    const { data, content } = parse(e, 'Hello\n');
    expect(data).toEqual({
      title: 'Angular Signals in Practice!',
      summary: 'How signals changed my state code.',
      date: '2026-08-30',
      tags: ['angular', 'web-dev'],
      series: { key: 'learning-angular', order: 1 },
    });
    expect(Object.keys(data)).toEqual(['title', 'summary', 'date', 'tags', 'series']);
    expect(postFrontmatter.safeParse(data).success).toBe(true);
    expect(content.trim()).toBe('Hello');
  });

  it('writes a note that passes the strict note schema', () => {
    const { data } = parse(
      readEntry(
        page({ Kind: select('Note'), Updated: { type: 'date', date: { start: '2026-09-01' } } }),
      ),
    );
    expect(data).toEqual({
      title: 'Angular Signals in Practice!',
      date: '2026-08-30',
      updated: '2026-09-01',
      tags: ['angular', 'web-dev'],
    });
    expect(noteFrontmatter.safeParse(data).success).toBe(true);
  });

  it('keeps Hebrew titles with colons intact', () => {
    const e = readEntry(
      page({
        Title: { type: 'title', title: rich('ראסט: השאלה (Borrowing)') },
        Slug: { type: 'rich_text', rich_text: rich('rust') },
      }),
    );
    expect(parse(e).data['title']).toBe('ראסט: השאלה (Borrowing)');
  });
});

describe('rewriteImages', () => {
  it('rewrites remote images to language-prefixed local paths and lists downloads', () => {
    const md = '![a](https://s3.aws.com/x/photo.JPG?sig=1)\ntext\n![](https://img.dev/no-ext)';
    const { markdown, downloads } = rewriteImages(md, 'my-post', 'he');
    expect(markdown).toBe('![a](/images/my-post/he-1.jpg)\ntext\n![](/images/my-post/he-2.png)');
    expect(downloads).toEqual([
      { url: 'https://s3.aws.com/x/photo.JPG?sig=1', file: 'images/my-post/he-1.jpg' },
      { url: 'https://img.dev/no-ext', file: 'images/my-post/he-2.png' },
    ]);
  });

  it('leaves local images alone', () => {
    expect(rewriteImages('![a](/images/x/1.png)', 'x', 'en').downloads).toEqual([]);
  });
});
