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

  it('is a nav labelled by its Hebrew title (he)', async () => {
    const el = await render('he', items);
    const nav = el.querySelector('nav');
    const title = el.querySelector('.toc__title');
    expect(title?.textContent?.trim()).toBe('בעמוד הזה');
    expect(title?.id).toBeTruthy();
    expect(nav?.getAttribute('aria-labelledby')).toBe(title?.id);
  });

  it('is titled in English (en)', async () => {
    const el = await render('en', items);
    expect(el.querySelector('.toc__title')?.textContent?.trim()).toBe('On this page');
  });

  it('gives every instance its own title id', async () => {
    const a = await render('en', items);
    const b = await render('en', items);
    expect(a.querySelector('.toc__title')?.id).not.toBe(b.querySelector('.toc__title')?.id);
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
});
