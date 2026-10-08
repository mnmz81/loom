import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CONTENT_LOADER } from '../../core/content-loader';
import { fixtureContentLoader } from '../../core/testing/fixture-content-loader';
import { HomePage } from './home-page';

async function open(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: CONTENT_LOADER, useValue: fixtureContentLoader },
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
  it('shows the Hebrew site title, description and latest posts/notes (he)', async () => {
    const el = await open('/he');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('המחברת');
    expect(el.querySelector('.page__lead')?.textContent).toContain('פוסטים והערות קצרות');
    const sections = [...el.querySelectorAll('section h2')].map((h) => h.textContent?.trim());
    expect(sections).toEqual(['פוסטים אחרונים', 'הערות אחרונות', 'סדרות']);
    const cards = hrefs(el, 'nb-entry-card h3 a');
    expect(cards).toContain('/he/posts/rust-borrowing');
    expect(cards).toContain('/he/notes/git-undo-last-commit');
  });

  it('links an untranslated entry to its own language and badges it (en)', async () => {
    const el = await open('/en');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Notebook');
    // rust-ownership exists only in Hebrew: it is listed in /en but links to /he/...
    const ownership = el.querySelector('a[href="/he/posts/rust-ownership"]');
    expect(ownership?.getAttribute('hreflang')).toBe('he');
    expect(el.textContent).toContain('Hebrew only');
    expect(el.querySelector('a[href="/en/posts/rust-ownership"]')).toBeNull();
  });

  it('has "all" links to the list pages and a series teaser', async () => {
    const el = await open('/en');
    expect(hrefs(el, '.page__section-head a')).toEqual(['/en/posts', '/en/notes', '/en/series']);
    expect(hrefs(el, '.series-teaser a')).toEqual(['/en/series/learning-rust']);
    expect(el.querySelector('.series-teaser__title')?.textContent?.trim()).toBe('Learning Rust');
    expect(el.querySelector('.series-teaser__meta')?.textContent?.trim()).toBe('2 parts');
  });

  it('sets title, description, canonical and hreflang alternates', async () => {
    await open('/en');
    expect(TestBed.inject(Title).getTitle()).toBe('Notebook');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://mnmz81.github.io/notebook/en/',
    );
    const alt = [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.getAttribute('hreflang'));
    expect(alt).toEqual(['he', 'en', 'x-default']);
  });

  it('is excluded from the search index', async () => {
    const el = await open('/he');
    expect(el.hasAttribute('data-pagefind-ignore') || el.closest('[data-pagefind-ignore]') !== null).toBe(true);
  });
});
