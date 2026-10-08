import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CONTENT_LOADER } from '../../core/content-loader';
import { LocaleService } from '../../core/i18n/locale.service';
import { fixtureContentLoader } from '../../core/testing/fixture-content-loader';
import { EntryPage } from './entry-page';

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: CONTENT_LOADER, useValue: fixtureContentLoader },
    ],
  });
  const harness = await RouterTestingHarness.create();
  const open = async (url: string) => {
    await harness.navigateByUrl(url, EntryPage);
    await harness.fixture.whenStable();
    return harness.routeNativeElement as HTMLElement;
  };
  return { harness, open, locale: TestBed.inject(LocaleService) };
}

const meta = (name: string) =>
  document.head.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.getAttribute('content');

describe('EntryPage', () => {
  it('renders a translated post: header, meta, tags, series nav, toc, body, related (he)', async () => {
    const { open } = await setup();
    const el = await open('/he/posts/rust-borrowing');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('ראסט: השאלה (Borrowing)');
    expect(el.querySelector('.entry__type')?.textContent?.trim()).toBe('פוסט');
    expect(el.querySelector('nb-entry-meta time')?.getAttribute('datetime')).toBe('2026-10-05');
    expect(el.querySelector('nb-tag-list a')?.getAttribute('href')).toBe('/he/tags/rust');
    expect(el.querySelector('nb-tag-list a')?.textContent).toContain('ראסט');
    expect(el.querySelector('nb-series-nav')?.textContent).toContain('לומדים ראסט');
    expect(el.querySelector('nb-article-body .prose')).not.toBeNull();
    expect(el.querySelector('nb-related-list a')?.getAttribute('href')).toBe('/he/posts/rust-ownership');
  });

  it('marks the article body and pagefind filters/meta for the search index', async () => {
    const { open } = await setup();
    const el = await open('/en/posts/rust-borrowing');
    expect(el.querySelector('[data-pagefind-body]')).not.toBeNull();
    expect(el.querySelector('h1')?.getAttribute('data-pagefind-meta')).toBe('title');
    const filter = (name: string) =>
      [...el.querySelectorAll(`[data-pagefind-filter^="${name}["]`)].map((s) => s.getAttribute('data-value'));
    expect(filter('type')).toEqual(['post']);
    expect(filter('tag')).toEqual(['rust']);
  });

  it('renders a note without summary and without a series nav', async () => {
    const { open } = await setup();
    const el = await open('/en/notes/git-undo-last-commit');
    expect(el.querySelector('.entry__type')?.textContent?.trim()).toBe('Note');
    expect(el.querySelector('.entry__summary')).toBeNull();
    expect(el.querySelector('nb-series-nav')).toBeNull();
    expect(el.querySelector('nb-entry-meta')?.textContent).toContain('Updated');
  });

  it('points the language switch at the translation when it exists', async () => {
    const { open, locale } = await setup();
    await open('/en/posts/rust-borrowing');
    expect(locale.alternateUrl()).toBe('/he/posts/rust-borrowing');
    await open('/he/notes/git-undo-last-commit');
    expect(locale.alternateUrl()).toBe('/en/notes/git-undo-last-commit');
  });

  it('points the language switch at the other language list for untranslated entries', async () => {
    const { open, locale } = await setup();
    await open('/he/posts/rust-ownership');
    expect(locale.alternateUrl()).toBe('/en/posts');
    await open('/en/notes/zsh-history-search');
    expect(locale.alternateUrl()).toBe('/he/notes');
  });

  it('clears the switch target when leaving the entry', async () => {
    const { harness, locale, open } = await setup();
    await open('/en/posts/rust-borrowing');
    await harness.navigateByUrl('/en/series');
    await harness.fixture.whenStable();
    expect(locale.alternateUrl()).toBeNull();
  });

  it('sets title, canonical, hreflang for each available language, OG article data', async () => {
    const { open } = await setup();
    await open('/en/posts/rust-borrowing');
    expect(TestBed.inject(Title).getTitle()).toBe('Rust: borrowing · Loom');
    expect(meta('description')).toBe('How & and &mut work and why the compiler complains.');
    expect(meta('og:type')).toBe('article');
    expect(meta('article:published_time')).toBe('2026-10-05');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://mnmz81.github.io/loom/en/posts/rust-borrowing/',
    );
    const alt = Object.fromEntries(
      [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [
        l.getAttribute('hreflang'),
        l.getAttribute('href'),
      ]),
    );
    expect(alt['he']).toBe('https://mnmz81.github.io/loom/he/posts/rust-borrowing/');
    expect(alt['en']).toBe('https://mnmz81.github.io/loom/en/posts/rust-borrowing/');
  });

  it('only advertises the languages an entry exists in, and derives a description for notes', async () => {
    const { open } = await setup();
    await open('/he/posts/rust-ownership');
    const langs = [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) =>
      l.getAttribute('hreflang'),
    );
    expect(langs).toEqual(['he', 'x-default']);

    await open('/en/notes/zsh-history-search');
    const description = meta('description') ?? '';
    expect(description.length).toBeGreaterThan(10);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).not.toContain('<');
    const jsonLd = JSON.parse(document.getElementById('seo-jsonld')?.textContent ?? '{}');
    expect(jsonLd).toMatchObject({ '@type': 'BlogPosting', inLanguage: 'en', headline: 'Search zsh history with Ctrl+R' });
  });
});
