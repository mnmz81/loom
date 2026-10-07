import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Entry, Lang, SeriesNav as SeriesNavModel } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import enBorrowingJson from '../../../testing/fixtures/content/en/posts/rust-borrowing.json';
import heBorrowingJson from '../../../testing/fixtures/content/he/posts/rust-borrowing.json';
import { SeriesNav } from './series-nav';

@Component({ template: '' })
class Blank {}

const heNav = (heBorrowingJson as Entry).seriesNav!;
const enNav = (enBorrowingJson as Entry).seriesNav!;

async function render(lang: Lang, nav: SeriesNavModel) {
  TestBed.inject(LocaleService).setLang(lang);
  const fixture = TestBed.createComponent(SeriesNav);
  fixture.componentRef.setInput('nav', nav);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('SeriesNav', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    }),
  );
  afterEach(() => TestBed.inject(LocaleService).setLang('he'));

  it('labels the nav, links the series and shows the part in Hebrew (he)', async () => {
    const el = await render('he', heNav);
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('סדרות: לומדים ראסט');
    const title = el.querySelector('.series-nav__title');
    expect(title?.getAttribute('href')).toBe('/he/series/learning-rust');
    expect(title?.textContent?.trim()).toBe('לומדים ראסט');
    expect(el.querySelector('.series-nav__part')?.textContent?.trim()).toBe('חלק 2 מתוך 2');
  });

  it('shows a same-language prev link without lang/hreflang and no next (he)', async () => {
    const el = await render('he', heNav);
    const prev = el.querySelector('a[rel="prev"]');
    expect(prev?.getAttribute('href')).toBe('/he/posts/rust-ownership');
    expect(prev?.textContent).toContain('הקודם');
    expect(prev?.querySelector('.series-nav__ref')?.textContent?.trim()).toBe(
      'ראסט: בעלות (Ownership)',
    );
    expect(prev?.hasAttribute('hreflang')).toBe(false);
    expect(prev?.querySelector('[lang]')).toBeNull();
    expect(prev?.querySelector('[dir]')).toBeNull();
    expect(el.querySelector('a[rel="next"]')).toBeNull();
  });

  it('links a fallback-language part with its own lang, marked with lang/hreflang (en)', async () => {
    expect(enNav.prev?.lang).toBe('he');
    const el = await render('en', enNav);
    expect(el.querySelector('.series-nav__part')?.textContent?.trim()).toBe('Part 2 of 2');
    expect(el.querySelector('.series-nav__title')?.getAttribute('href')).toBe(
      '/en/series/learning-rust',
    );
    const prev = el.querySelector('a[rel="prev"]');
    expect(prev?.getAttribute('href')).toBe('/he/posts/rust-ownership');
    expect(prev?.getAttribute('hreflang')).toBe('he');
    expect(prev?.querySelector('.series-nav__ref')?.getAttribute('lang')).toBe('he');
    expect(prev?.querySelector('.series-nav__ref')?.getAttribute('dir')).toBe('rtl');
    expect(prev?.textContent).toContain('Previous');
  });

  it('shows a next link (en)', async () => {
    const nav: SeriesNavModel = {
      ...enNav,
      index: 1,
      prev: null,
      next: { type: 'post', slug: 'rust-borrowing', lang: 'en', title: 'Rust: Borrowing' },
    };
    const el = await render('en', nav);
    expect(el.querySelector('a[rel="prev"]')).toBeNull();
    const next = el.querySelector('a[rel="next"]');
    expect(next?.getAttribute('href')).toBe('/en/posts/rust-borrowing');
    expect(next?.textContent).toContain('Next');
    expect(next?.hasAttribute('hreflang')).toBe(false);
  });

  it('omits the link list for a one-part series and hides arrows from screen readers', async () => {
    const lone = await render('en', { ...enNav, index: 1, total: 1, prev: null, next: null });
    expect(lone.querySelector('ul')).toBeNull();
    const el = await render('he', heNav);
    const arrows = [...el.querySelectorAll('svg')];
    expect(arrows.every((svg) => svg.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
});
