import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CONTENT_LOADER, type ContentLoader } from '../../core/content-loader';
import type { LangIndex } from '../../core/content.models';
import { fixtureContentLoader } from '../../core/testing/fixture-content-loader';
import { HomePage, latestPerSeries } from './home-page';
import heIndexJson from '../../../testing/fixtures/content/he/index.json';

async function open(url: string, loader: ContentLoader = fixtureContentLoader) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: CONTENT_LOADER, useValue: loader },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, HomePage);
  await harness.fixture.whenStable();
  return harness.routeNativeElement as HTMLElement;
}

const hrefs = (el: ParentNode, selector: string) =>
  [...el.querySelectorAll(selector)].map((a) => a.getAttribute('href'));

describe('HomePage', () => {
  it('states what the blog is, offers two actions, then series, latest posts and notes (he)', async () => {
    const el = await open('/he');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('לומדים פיתוח, פוסט קצר בכל פעם');
    expect(el.querySelector('h1')?.textContent).not.toContain('לום.');
    expect(el.querySelector('.home-hero__lead')?.textContent).toContain('מוריס מאור זכאי');
    expect(hrefs(el, '.home-hero__action')).toEqual(['/he/series', '/he/search']);
    const sections = [...el.querySelectorAll('section h2')].map((h) => h.textContent?.trim());
    expect(sections).toEqual(['סדרות', 'פוסטים אחרונים', 'הערות אחרונות']);
    const cards = hrefs(el, 'nb-entry-card h3 a');
    expect(cards).toContain('/he/posts/rust-borrowing');
    expect(cards).toContain('/he/notes/git-undo-last-commit');
  });

  it('links an untranslated entry to its own language and badges it (he)', async () => {
    const el = await open('/he');
    // zsh-history-search exists only in English: it is listed in /he but links to /en/...
    const zsh = el.querySelector('a[href="/en/notes/zsh-history-search"]');
    expect(zsh?.getAttribute('hreflang')).toBe('en');
    expect(el.textContent).toContain('אנגלית בלבד');
    expect(el.querySelector('a[href="/he/notes/zsh-history-search"]')).toBeNull();
  });

  it('latest posts show the newest post of each series once', () => {
    const posts = (heIndexJson as LangIndex).entries.filter((e) => e.type === 'post');
    // rust-borrowing and rust-ownership are both in learning-rust: only the newer one stays.
    expect(latestPerSeries(posts, 5).map((e) => e.slug)).toEqual(['rust-borrowing', 'angular-signals-basics']);
    expect(latestPerSeries(posts, 1).map((e) => e.slug)).toEqual(['rust-borrowing']);
  });

  it('has "all" links to the list pages and the series tiles', async () => {
    const el = await open('/en');
    expect(hrefs(el, '.page__section-head a')).toEqual(['/en/series', '/en/posts', '/en/notes']);
    expect(el.querySelector('.page__section-head a')?.textContent?.trim()).toBe('All series →');
    expect(hrefs(el, '.series-cards a')).toEqual(['/en/series/learning-rust']);
    expect(el.querySelector('.series-cards__title')?.textContent?.trim()).toBe('Learning Rust');
    expect(el.querySelector('.series-cards__meta')?.textContent?.trim()).toBe('2 parts');
  });

  it('hides the notes section while there are no notes', async () => {
    const withoutNotes: ContentLoader = async (path) => {
      const data = await fixtureContentLoader(path);
      if (!path.endsWith('index.json')) return data;
      const index = data as LangIndex;
      return { ...index, entries: index.entries.filter((e) => e.type !== 'note') };
    };
    const el = await open('/en', withoutNotes);
    const sections = [...el.querySelectorAll('section h2')].map((h) => h.textContent?.trim());
    expect(sections).toEqual(['Series', 'Latest posts']);
    expect(hrefs(el, '.page__section-head a')).toEqual(['/en/series', '/en/posts']);
  });

  it('sets title, description, canonical and hreflang alternates', async () => {
    await open('/en');
    expect(TestBed.inject(Title).getTitle()).toBe('Loom');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://mnmz81.github.io/loom/en/',
    );
    const alt = [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.getAttribute('hreflang'));
    expect(alt).toEqual(['he', 'en', 'x-default']);
  });

  it('is excluded from the search index', async () => {
    const el = await open('/he');
    expect(el.hasAttribute('data-pagefind-ignore') || el.closest('[data-pagefind-ignore]') !== null).toBe(true);
  });
});
