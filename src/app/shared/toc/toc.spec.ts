import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Entry, Lang, TocItem } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import hePostJson from '../../../testing/fixtures/content/he/posts/rust-borrowing.json';
import { Toc } from './toc';

@Component({ template: '' })
class Blank {}

const hePost = hePostJson as Entry;
const items: TocItem[] = [
  ...hePost.toc,
  { id: 'details', text: 'פרטים', depth: 3 },
  { id: 'summary', text: 'סיכום', depth: 2 },
];

async function render(lang: Lang, tocItems: TocItem[]) {
  TestBed.inject(LocaleService).setLang(lang);
  const fixture = TestBed.createComponent(Toc);
  fixture.componentRef.setInput('items', tocItems);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('Toc', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    }),
  );
  afterEach(() => TestBed.inject(LocaleService).setLang('he'));

  it('is a nav named and titled in Hebrew (he)', async () => {
    const el = await render('he', items);
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('בעמוד הזה');
    const heading = el.querySelector('[role="heading"]');
    expect(heading?.getAttribute('aria-level')).toBe('2');
    expect(heading?.textContent?.trim()).toBe('בעמוד הזה');
  });

  it('is titled in English (en)', async () => {
    const el = await render('en', items);
    expect(el.querySelector('[role="heading"]')?.textContent?.trim()).toBe('On this page');
  });

  it('links each heading by fragment on the current page and indents h3 items', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/he/posts/rust-borrowing');
    const el = await render('he', items);
    const links = [...el.querySelectorAll<HTMLAnchorElement>('.toc__link')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/he/posts/rust-borrowing#example',
      '/he/posts/rust-borrowing#details',
      '/he/posts/rust-borrowing#summary',
    ]);
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Example', 'פרטים', 'סיכום']);
    const subs = [...el.querySelectorAll('li')].map((li) =>
      li.classList.contains('toc__item--sub'),
    );
    expect(subs).toEqual([false, true, false]);
  });

  it('is hidden with fewer than two items', async () => {
    expect((await render('he', hePost.toc)).querySelector('nav')).toBeNull();
    expect((await render('en', [])).querySelector('nav')).toBeNull();
  });

  it('starts closed (small screens) and opens on wide screens', async () => {
    const closed = await render('he', items);
    expect(closed.querySelector('button')?.getAttribute('aria-expanded')).toBe('false');

    const view = document.defaultView!;
    const original = view.matchMedia;
    view.matchMedia = ((query: string) => ({
      matches: query === '(min-width: 64rem)',
    })) as typeof view.matchMedia;
    try {
      const open = await render('he', items);
      expect(open.querySelector('button')?.getAttribute('aria-expanded')).toBe('true');
    } finally {
      view.matchMedia = original;
    }
  });
});
