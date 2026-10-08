import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CONTENT_LOADER } from '../../core/content-loader';
import { fixtureContentLoader } from '../../core/testing/fixture-content-loader';
import { EntriesPage } from './entries-page';

async function open(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: CONTENT_LOADER, useValue: fixtureContentLoader },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, EntriesPage);
  await harness.fixture.whenStable();
  return harness.routeNativeElement as HTMLElement;
}

const titles = (el: HTMLElement) => [...el.querySelectorAll('nb-entry-card h2 a')].map((a) => a.getAttribute('href'));

describe('EntriesPage', () => {
  it('lists only posts on /posts, newest first (he)', async () => {
    const el = await open('/he/posts');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('פוסטים');
    expect(titles(el)).toEqual([
      '/he/posts/rust-borrowing',
      '/he/posts/rust-ownership',
      '/he/posts/angular-signals-basics',
    ]);
    expect(TestBed.inject(Title).getTitle()).toBe('פוסטים · המחברת');
  });

  it('lists only notes on /notes, including an untranslated one linking to its language (he)', async () => {
    const el = await open('/he/notes');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('הערות');
    expect(titles(el)).toEqual(['/en/notes/zsh-history-search', '/he/notes/git-undo-last-commit']);
    expect(el.textContent).toContain('אנגלית בלבד');
  });

  it('shows the fallback badge for a Hebrew-only post in /en/posts', async () => {
    const el = await open('/en/posts');
    expect(titles(el)).toContain('/he/posts/rust-ownership');
    expect(el.textContent).toContain('Hebrew only');
    expect(TestBed.inject(Title).getTitle()).toBe('Posts · Notebook');
  });

  it('offers tag links with localized labels', async () => {
    const el = await open('/he/posts');
    const rust = el.querySelector<HTMLAnchorElement>('.chips a[href="/he/tags/rust"]');
    expect(rust?.textContent?.trim()).toBe('ראסט');
    expect(el.querySelectorAll('.chips a').length).toBe(6);
  });
});
