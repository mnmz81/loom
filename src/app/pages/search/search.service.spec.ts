import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  MAX_RESULTS,
  PAGEFIND_IMPORT,
  type PagefindApi,
  type PagefindResultData,
  SearchService,
  SearchUnavailableError,
  parseExcerpt,
  toRouterPath,
} from './search.service';

describe('parseExcerpt', () => {
  it('splits marked words from plain text', () => {
    expect(parseExcerpt('use <mark>borrowing</mark> rules')).toEqual([
      { text: 'use ', mark: false },
      { text: 'borrowing', mark: true },
      { text: ' rules', mark: false },
    ]);
  });

  it('decodes entities and never keeps markup', () => {
    expect(parseExcerpt('a &amp; b &lt;script&gt; &#39;x&#39; &#x41; &quot;q&quot; &nbsp;')).toEqual([
      { text: "a & b <script> 'x' A \"q\"  ", mark: false },
    ]);
    expect(parseExcerpt('<b>bold</b> <mark>hit</mark>')).toEqual([
      { text: 'bold ', mark: false },
      { text: 'hit', mark: true },
    ]);
  });

  it('keeps unknown or invalid entities as written and handles empty input', () => {
    expect(parseExcerpt('&bogus; &#xZZ; &#0;')).toEqual([{ text: '&bogus; &#xZZ; &#0;', mark: false }]);
    expect(parseExcerpt('')).toEqual([]);
    expect(parseExcerpt('<mark>first</mark>')).toEqual([{ text: 'first', mark: true }]);
  });
});

describe('toRouterPath', () => {
  it('turns a pagefind URL into a router path', () => {
    expect(toRouterPath('/he/posts/x/', '/')).toBe('/he/posts/x');
    expect(toRouterPath('/en/notes/y', '/notebook/')).toBe('/en/notes/y');
  });

  it('strips the base path when pagefind already prefixed it, plus query and hash', () => {
    expect(toRouterPath('/notebook/he/posts/x/?pagefind-highlight=a#anchor', '/notebook/')).toBe('/he/posts/x');
    expect(toRouterPath('/notebook/', '/notebook/')).toBe('/');
    expect(toRouterPath('https://example.test/notebook/en/', '/notebook/')).toBe('/en');
  });

  it('does not strip a base-like prefix of another segment', () => {
    expect(toRouterPath('/notebooks/x/', '/notebook/')).toBe('/notebooks/x');
  });

  it('adds a leading slash to relative URLs', () => {
    expect(toRouterPath('he/posts/x/', '/')).toBe('/he/posts/x');
  });
});

function data(overrides: Partial<PagefindResultData> = {}): PagefindResultData {
  return {
    url: '/he/posts/rust-borrowing/',
    excerpt: 'about <mark>borrowing</mark>',
    meta: { title: 'Rust: borrowing' },
    filters: { type: ['post'], tag: ['rust'] },
    ...overrides,
  };
}

function fakeApi(results: PagefindResultData[]) {
  const search = vi.fn(async (_term: string | null, _options?: { filters?: Record<string, string> }) => ({
    results: results.map((r) => ({ data: async () => r })),
  }));
  const destroy = vi.fn(async () => undefined);
  return { api: { search, destroy } satisfies PagefindApi, search, destroy };
}

function setup(importer: (url: string) => Promise<unknown>, platform = 'browser') {
  TestBed.configureTestingModule({
    providers: [
      { provide: PAGEFIND_IMPORT, useValue: importer },
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });
  return TestBed.inject(SearchService);
}

describe('SearchService', () => {
  afterEach(() => {
    document.documentElement.lang = 'he';
  });

  it('loads pagefind/pagefind.js relative to the document base URI, once', async () => {
    const { api } = fakeApi([]);
    const importer = vi.fn(async (_url: string) => api);
    const service = setup(importer);
    await service.search('x', { type: '', tag: '' });
    await service.search('y', { type: '', tag: '' });
    expect(importer).toHaveBeenCalledTimes(1);
    expect(importer.mock.calls[0][0]).toBe(new URL('pagefind/pagefind.js', document.baseURI).href);
  });

  it('maps results to hits (router path, title, excerpt parts, type, tags)', async () => {
    const { api, search } = fakeApi([data(), data({ url: '/en/notes/n/', meta: {}, filters: {}, excerpt: '' })]);
    const service = setup(async () => api);
    const { total, hits } = await service.search('  borrowing ', { type: '', tag: '' });
    expect(search).toHaveBeenCalledWith('borrowing', { filters: {} });
    expect(total).toBe(2);
    expect(hits[0]).toEqual({
      path: '/he/posts/rust-borrowing',
      title: 'Rust: borrowing',
      excerpt: [
        { text: 'about ', mark: false },
        { text: 'borrowing', mark: true },
      ],
      type: 'post',
      tags: ['rust'],
    });
    expect(hits[1]).toMatchObject({ path: '/en/notes/n', title: '/en/notes/n/', type: null, tags: [], excerpt: [] });
  });

  it('passes type and tag filters, and a null term when only filtering', async () => {
    const { api, search } = fakeApi([]);
    const service = setup(async () => api);
    await service.search('', { type: 'note', tag: 'zsh' });
    expect(search).toHaveBeenCalledWith(null, { filters: { type: 'note', tag: 'zsh' } });
  });

  it('fetches data for at most MAX_RESULTS results but reports the real total', async () => {
    const many = Array.from({ length: MAX_RESULTS + 5 }, (_, i) => data({ url: `/he/posts/p${i}/` }));
    const { api } = fakeApi(many);
    const service = setup(async () => api);
    const { total, hits } = await service.search('p', { type: '', tag: '' });
    expect(total).toBe(MAX_RESULTS + 5);
    expect(hits.length).toBe(MAX_RESULTS);
  });

  it('re-initialises pagefind when <html lang> changed since it was loaded', async () => {
    const { api, destroy } = fakeApi([]);
    const service = setup(async () => api);
    document.documentElement.lang = 'he';
    await service.search('a', { type: '', tag: '' });
    await service.search('b', { type: '', tag: '' });
    expect(destroy).not.toHaveBeenCalled();
    document.documentElement.lang = 'en';
    await service.search('c', { type: '', tag: '' });
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('rejects with SearchUnavailableError when the bundle cannot be imported, and retries later', async () => {
    const { api } = fakeApi([]);
    const importer = vi.fn<(url: string) => Promise<unknown>>().mockRejectedValueOnce(new Error('404')).mockResolvedValue(api);
    const service = setup(importer);
    await expect(service.load()).rejects.toBeInstanceOf(SearchUnavailableError);
    await expect(service.load()).resolves.toBe(api);
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('is unavailable on the server and never imports', async () => {
    const importer = vi.fn(async (_url: string) => ({}));
    const service = setup(importer, 'server');
    await expect(service.search('x', { type: '', tag: '' })).rejects.toBeInstanceOf(SearchUnavailableError);
    expect(importer).not.toHaveBeenCalled();
  });
});
