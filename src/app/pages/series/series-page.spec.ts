import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CONTENT_LOADER, type ContentLoader } from '../../core/content-loader';
import type { SeriesIndex } from '../../core/content.models';
import { fixtureContentLoader } from '../../core/testing/fixture-content-loader';
import { SeriesPage } from './series-page';

async function open(url: string, loader: ContentLoader = fixtureContentLoader) {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes, withComponentInputBinding()), { provide: CONTENT_LOADER, useValue: loader }],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, SeriesPage);
  await harness.fixture.whenStable();
  return harness.routeNativeElement as HTMLElement;
}

describe('SeriesPage', () => {
  it('lists the parts in series order with part labels (he)', async () => {
    const el = await open('/he/series/learning-rust');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('לומדים ראסט');
    expect(el.querySelector('.page__lead')?.textContent?.trim()).toBe('הערות מהדרך ללמוד ראסט.');
    expect(el.querySelector('.series__count')?.textContent?.trim()).toBe('2 חלקים');
    expect([...el.querySelectorAll('.series__part-label')].map((l) => l.textContent?.trim())).toEqual(['חלק 1', 'חלק 2']);
    expect([...el.querySelectorAll('nb-entry-card h2 a')].map((a) => a.getAttribute('href'))).toEqual([
      '/he/posts/rust-ownership',
      '/he/posts/rust-borrowing',
    ]);
    expect(TestBed.inject(Title).getTitle()).toBe('לומדים ראסט · המחברת');
  });

  it('shows the untranslated part as a fallback card in /en', async () => {
    const el = await open('/en/series/learning-rust');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Learning Rust');
    const links = [...el.querySelectorAll('nb-entry-card h2 a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/he/posts/rust-ownership', '/en/posts/rust-borrowing']);
    expect(el.textContent).toContain('Hebrew only');
  });

  it('uses the summary fallback description and the empty state for a series without parts', async () => {
    const custom: ContentLoader = async (path) =>
      path === 'series.json'
        ? ([{ key: 'ghost', title: { he: 'רוח', en: 'Ghost' }, description: {}, slugs: ['missing'] }] satisfies SeriesIndex)
        : fixtureContentLoader(path);
    const el = await open('/en/series/ghost', custom);
    expect(el.querySelector('.series__empty')?.textContent?.trim()).toBe('Nothing here yet.');
    expect(el.querySelector('.page__lead')).toBeNull();
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Ghost — 0 parts');
  });
});
