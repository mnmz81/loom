import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CONTENT_LOADER, type ContentLoader } from '../../core/content-loader';
import { fixtureContentLoader } from '../../core/testing/fixture-content-loader';
import { SeriesListPage } from './series-list-page';

async function open(url: string, loader: ContentLoader = fixtureContentLoader) {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes, withComponentInputBinding()), { provide: CONTENT_LOADER, useValue: loader }],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, SeriesListPage);
  await harness.fixture.whenStable();
  return harness.routeNativeElement as HTMLElement;
}

describe('SeriesListPage', () => {
  it('lists each series with title, description and part count (he)', async () => {
    const el = await open('/he/series');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('סדרות');
    const link = el.querySelector<HTMLAnchorElement>('.series-cards__title a');
    expect(link?.getAttribute('href')).toBe('/he/series/learning-rust');
    expect(link?.textContent?.trim()).toBe('לומדים ראסט');
    expect(el.querySelector('.series-cards__text')?.textContent?.trim()).toBe('הערות מהדרך ללמוד ראסט.');
    expect(el.querySelector('.series-cards__meta')?.textContent?.trim()).toBe('2 חלקים');
    expect(TestBed.inject(Title).getTitle()).toBe('סדרות · המחברת');
  });

  it('uses the English texts (en)', async () => {
    const el = await open('/en/series');
    expect(el.querySelector('.series-cards__title a')?.textContent?.trim()).toBe('Learning Rust');
    expect(el.querySelector('.series-cards__meta')?.textContent?.trim()).toBe('2 parts');
  });

  it('shows the empty text and omits a missing description', async () => {
    const empty: ContentLoader = async (path) =>
      path === 'series.json' ? [] : fixtureContentLoader(path);
    const el = await open('/en/series', empty);
    expect(el.querySelector('.series-cards__empty')?.textContent?.trim()).toBe('No series yet.');
    expect(el.querySelector('.series-cards')).toBeNull();
  });

  it('renders a series without a description in the page language', async () => {
    const bare: ContentLoader = async (path) =>
      path === 'series.json'
        ? [{ key: 'x', title: { he: 'איקס', en: 'X' }, description: {}, slugs: ['a'] }]
        : fixtureContentLoader(path);
    const el = await open('/en/series', bare);
    expect(el.querySelector('.series-cards__text')).toBeNull();
    expect(el.querySelector('.series-cards__meta')?.textContent?.trim()).toBe('1 part');
  });
});
