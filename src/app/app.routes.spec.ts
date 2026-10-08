import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlSegment, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { langMatch, routes } from './app.routes';
import { CONTENT_LOADER } from './core/content-loader';
import { LocaleService } from './core/i18n/locale.service';
import { fixtureContentLoader } from './core/testing/fixture-content-loader';
import { EntriesPage } from './pages/entries/entries-page';
import { EntryPage } from './pages/entry/entry-page';
import { HomePage } from './pages/home/home-page';
import { NotFoundPage } from './pages/not-found/not-found-page';
import { SearchPage } from './pages/search/search-page';
import { SeriesListPage } from './pages/series-list/series-list-page';
import { SeriesPage } from './pages/series/series-page';
import { TagPage } from './pages/tag/tag-page';

async function open<T>(url: string, type: Type<T>) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: CONTENT_LOADER, useValue: fixtureContentLoader },
    ],
  });
  const harness = await RouterTestingHarness.create();
  const component = await harness.navigateByUrl(url, type);
  await harness.fixture.whenStable();
  return { harness, component, url: TestBed.inject(Router).url };
}

describe('app routes', () => {
  it('redirects / to /he', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), { provide: CONTENT_LOADER, useValue: fixtureContentLoader }],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', HomePage);
    expect(TestBed.inject(Router).url).toBe('/he');
  });

  it.each([
    ['/he', HomePage],
    ['/en', HomePage],
    ['/he/posts', EntriesPage],
    ['/en/notes', EntriesPage],
    ['/he/posts/rust-borrowing', EntryPage],
    ['/en/notes/git-undo-last-commit', EntryPage],
    ['/he/series', SeriesListPage],
    ['/en/series/learning-rust', SeriesPage],
    ['/he/tags/rust', TagPage],
    ['/en/search', SearchPage],
  ] as [string, Type<unknown>][])('%s renders its page', async (url, type) => {
    const { component, url: finalUrl } = await open(url, type);
    expect(component).toBeInstanceOf(type);
    expect(finalUrl).toBe(url);
  });

  it('sets the locale from the :lang segment', async () => {
    await open('/en/posts', EntriesPage);
    expect(TestBed.inject(LocaleService).lang()).toBe('en');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });

  it('shows the not-found page for unknown paths, keeping the language of /:lang/...', async () => {
    const { url } = await open('/en/does-not-exist', NotFoundPage);
    expect(url).toBe('/en/does-not-exist');
    expect(TestBed.inject(LocaleService).lang()).toBe('en');
  });

  it('shows the not-found page for an unknown language segment instead of redirecting', async () => {
    const { url } = await open('/fr/posts', NotFoundPage);
    expect(url).toBe('/fr/posts');
  });

  it('serves /404 as the not-found page', async () => {
    await open('/404', NotFoundPage);
  });

  it('redirects a he-only post requested in /en to its /he URL', async () => {
    const { url } = await open('/en/posts/rust-ownership', EntryPage);
    expect(url).toBe('/he/posts/rust-ownership');
  });

  it('redirects unknown tags and series to /404', async () => {
    expect((await open('/he/tags/nope', NotFoundPage)).url).toBe('/404');
    TestBed.resetTestingModule();
    expect((await open('/he/series/nope', NotFoundPage)).url).toBe('/404');
  });
});

describe('langMatch', () => {
  const match = (...paths: string[]) =>
    TestBed.runInInjectionContext(() =>
      langMatch({} as never, paths.map((p) => new UrlSegment(p, {})), {} as never),
    );

  it('accepts supported languages only', () => {
    expect(match('he', 'posts')).toBe(true);
    expect(match('en')).toBe(true);
    expect(match('fr')).toBe(false);
    expect(match()).toBe(false);
  });
});
