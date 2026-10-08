import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CONTENT_LOADER } from '../../core/content-loader';
import { fixtureContentLoader } from '../../core/testing/fixture-content-loader';
import { SearchPage } from './search-page';
import { type SearchHit, SearchService, SearchUnavailableError } from './search.service';

const HIT: SearchHit = {
  path: '/en/posts/rust-borrowing',
  title: 'Rust: borrowing',
  excerpt: [
    { text: 'about ', mark: false },
    { text: 'borrowing', mark: true },
  ],
  type: 'post',
  tags: ['rust', 'unlabelled'],
};

type SearchFn = SearchService['search'];

async function open(search: SearchFn, url = '/en/search') {
  const spy = vi.fn(search);
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: CONTENT_LOADER, useValue: fixtureContentLoader },
      { provide: SearchService, useValue: { search: spy } },
    ],
  });
  vi.useFakeTimers();
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, SearchPage);
  const el = harness.routeNativeElement as HTMLElement;
  const flush = async (ms = 250) => {
    await vi.advanceTimersByTimeAsync(Math.max(ms, 1));
    await harness.fixture.whenStable();
  };
  const type = async (text: string) => {
    const input = el.querySelector<HTMLInputElement>('#search-input')!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
  };
  const select = async (id: string, value: string) => {
    const element = el.querySelector<HTMLSelectElement>(id)!;
    element.value = value;
    element.dispatchEvent(new Event('change'));
  };
  return { harness, el, spy, flush, type, select };
}

const status = (el: HTMLElement) => el.querySelector('[role="status"]')?.textContent?.trim();

describe('SearchPage', () => {
  afterEach(() => vi.useRealTimers());

  it('renders the form with labelled input, type and tag filters (en)', async () => {
    const { el, flush } = await open(async () => ({ total: 0, hits: [] }));
    await flush(0);
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Search');
    expect(el.querySelector('form')?.getAttribute('role')).toBe('search');
    expect(el.querySelector('label[for="search-input"]')?.textContent?.trim()).toBe('Search the site');
    expect(el.querySelector('#search-input')?.getAttribute('placeholder')).toBe('Search posts and notes…');
    expect([...el.querySelectorAll('#search-type option')].map((o) => o.textContent?.trim())).toEqual(['All', 'Post', 'Note']);
    expect(el.querySelectorAll('#search-tag option').length).toBe(7);
    expect(el.querySelector('.search__hint')?.textContent?.trim()).toBe('Type to search posts and notes.');
    expect(status(el)).toBe('');
    expect(el.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
  });

  it('is Hebrew in /he/search', async () => {
    const { el, flush } = await open(async () => ({ total: 0, hits: [] }), '/he/search');
    await flush(0);
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('חיפוש');
    expect(el.querySelector('label[for="search-type"]')?.textContent?.trim()).toBe('סוג');
    expect(TestBed.inject(Title).getTitle()).toBe('חיפוש · המחברת');
  });

  it('debounces typing, searches once, and shows the result count and hits', async () => {
    const { el, spy, flush, type } = await open(async () => ({ total: 1, hits: [HIT] }));
    await type('bor');
    await type('borrowing');
    await flush(100);
    expect(spy).not.toHaveBeenCalled();
    await flush(150);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('borrowing', { type: '', tag: '' });
    expect(status(el)).toBe('1 result');

    const link = el.querySelector<HTMLAnchorElement>('.result__title a');
    expect(link?.getAttribute('href')).toBe('/en/posts/rust-borrowing');
    expect(link?.textContent?.trim()).toBe('Rust: borrowing');
    expect(el.querySelector('.result__type')?.textContent?.trim()).toBe('Post');
    expect(el.querySelector('.result__excerpt mark')?.textContent).toBe('borrowing');
    expect(el.querySelector('.result__excerpt')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('about borrowing');
    expect([...el.querySelectorAll('.result__tags li')].map((li) => li.textContent?.trim())).toEqual(['Rust', 'unlabelled']);
    expect(el.querySelector('.search__hint')).toBeNull();
  });

  it('puts the query into the address bar (?q=)', async () => {
    const { flush, type } = await open(async () => ({ total: 0, hits: [] }));
    await type('a b');
    await flush();
    expect(TestBed.inject(Location).path()).toBe('/en/search?q=a%20b');
    await type('');
    await flush();
    expect(TestBed.inject(Location).path()).toBe('/en/search');
  });

  it('shows the plural count and the no-results message', async () => {
    const results = { total: 3, hits: [HIT] };
    const { el, flush, type, spy } = await open(async () => results);
    await type('x');
    await flush();
    expect(status(el)).toBe('3 results');
    spy.mockResolvedValueOnce({ total: 0, hits: [] });
    await type(' nothing ');
    await flush();
    expect(status(el)).toBe('No results for “nothing”.');
    expect(el.querySelector('.results')).toBeNull();
  });

  it('shows a loading message while a search is pending', async () => {
    let finish!: (value: { total: number; hits: SearchHit[] }) => void;
    const { el, flush, type } = await open(() => new Promise((resolve) => (finish = resolve)));
    await type('x');
    await flush();
    expect(status(el)).toBe('Searching…');
    finish({ total: 1, hits: [HIT] });
    await flush(0);
    expect(status(el)).toBe('1 result');
  });

  it('applies type and tag filters immediately, also without a query', async () => {
    const { spy, flush, select, el } = await open(async () => ({ total: 1, hits: [HIT] }));
    await select('#search-type', 'note');
    await flush(0);
    expect(spy).toHaveBeenLastCalledWith('', { type: 'note', tag: '' });
    await select('#search-tag', 'zsh');
    await flush(0);
    expect(spy).toHaveBeenLastCalledWith('', { type: 'note', tag: 'zsh' });
    expect(status(el)).toBe('1 result');
    await select('#search-type', '');
    await select('#search-tag', '');
    await flush(0);
    expect(spy).toHaveBeenCalledTimes(2); // nothing to search for: back to idle without a request
    expect(status(el)).toBe('');
    expect(el.querySelector('.search__hint')).not.toBeNull();
  });

  it('shows "unavailable" when the search bundle is missing', async () => {
    const { el, flush, type } = await open(async () => {
      throw new SearchUnavailableError();
    });
    await type('x');
    await flush();
    expect(status(el)).toBe('Search is only available in the built site.');
  });

  it('shows an error message when a search fails, and recovers on the next query', async () => {
    const { el, flush, type, spy } = await open(async () => {
      throw new Error('boom');
    });
    await type('x');
    await flush();
    expect(status(el)).toBe('Search failed. Please try again.');
    expect(el.querySelector('.search__status--error')).not.toBeNull();
    spy.mockResolvedValueOnce({ total: 1, hits: [HIT] });
    await type('xy');
    await flush();
    expect(status(el)).toBe('1 result');
  });

  it('ignores a slow response that arrives after a newer query', async () => {
    const resolvers: ((value: { total: number; hits: SearchHit[] }) => void)[] = [];
    const { el, flush, type } = await open(() => new Promise((resolve) => resolvers.push(resolve)));
    await type('first');
    await flush();
    await type('second');
    await flush();
    resolvers[1]({ total: 1, hits: [{ ...HIT, title: 'Second' }] });
    await flush(0);
    resolvers[0]({ total: 1, hits: [{ ...HIT, title: 'First' }] });
    await flush(0);
    expect(el.querySelector('.result__title')?.textContent?.trim()).toBe('Second');
  });

  it('runs the initial ?q= query once', async () => {
    const { el, spy, flush } = await open(async () => ({ total: 1, hits: [HIT] }), '/en/search?q=borrowing');
    await flush(0);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('borrowing', { type: '', tag: '' });
    expect(el.querySelector<HTMLInputElement>('#search-input')?.value).toBe('borrowing');
    expect(status(el)).toBe('1 result');
  });

  it('clears results back to the hint when the query is emptied', async () => {
    const { el, flush, type } = await open(async () => ({ total: 1, hits: [HIT] }));
    await type('x');
    await flush();
    expect(el.querySelector('.results')).not.toBeNull();
    await type('');
    await flush();
    expect(el.querySelector('.results')).toBeNull();
    expect(el.querySelector('.search__hint')).not.toBeNull();
  });

  it('does not search in the initial render and survives destruction with a pending timer', async () => {
    const { spy, type, harness } = await open(async () => ({ total: 0, hits: [] }));
    expect(spy).not.toHaveBeenCalled();
    await type('x');
    await TestBed.inject(Router).navigateByUrl('/he');
    await vi.advanceTimersByTimeAsync(500);
    expect(spy).not.toHaveBeenCalled();
    harness.fixture.destroy();
  });
});
