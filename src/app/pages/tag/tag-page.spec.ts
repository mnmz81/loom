import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CONTENT_LOADER } from '../../core/content-loader';
import { fixtureContentLoader } from '../../core/testing/fixture-content-loader';
import { TagPage } from './tag-page';

async function open(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: CONTENT_LOADER, useValue: fixtureContentLoader },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, TagPage);
  await harness.fixture.whenStable();
  return harness.routeNativeElement as HTMLElement;
}

describe('TagPage', () => {
  it('lists the entries with the tag, with the localized label in the title (he)', async () => {
    const el = await open('/he/tags/rust');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('תגית: ראסט');
    expect(el.querySelector('.page__lead')?.textContent?.trim()).toBe('2 רשומות');
    expect([...el.querySelectorAll('nb-entry-card h2 a')].map((a) => a.getAttribute('href'))).toEqual([
      '/he/posts/rust-borrowing',
      '/he/posts/rust-ownership',
    ]);
    expect(TestBed.inject(Title).getTitle()).toBe('תגית: ראסט · המחברת');
  });

  it('uses the singular count and English label (en)', async () => {
    const el = await open('/en/tags/angular');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Tag: Angular');
    expect(el.querySelector('.page__lead')?.textContent?.trim()).toBe('1 entry');
  });

  it('includes untranslated entries of the tag, linking to their language (en)', async () => {
    const el = await open('/en/tags/rust');
    expect(el.querySelector('a[href="/he/posts/rust-ownership"]')).not.toBeNull();
    expect(el.querySelector('a[href="/en/posts/rust-borrowing"]')).not.toBeNull();
  });

  it('sets canonical and both hreflang alternates', async () => {
    await open('/en/tags/rust');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://mnmz81.github.io/notebook/en/tags/rust/',
    );
    expect(document.head.querySelector('link[hreflang="he"]')?.getAttribute('href')).toBe(
      'https://mnmz81.github.io/notebook/he/tags/rust/',
    );
  });
});
