import { TestBed } from '@angular/core/testing';
import type { Lang } from '../../../core/content.models';
import { LocaleService } from '../../../core/i18n/locale.service';
import { SITE } from '../../../core/site.config';
import { SiteFooter } from './site-footer';

async function render(lang: Lang) {
  TestBed.inject(LocaleService).setLang(lang);
  const fixture = TestBed.createComponent(SiteFooter);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('SiteFooter', () => {
  afterEach(() => TestBed.inject(LocaleService).setLang('he'));

  it('links the Hebrew RSS feed with a relative href (he)', async () => {
    const { el } = await render('he');
    const links = [...el.querySelectorAll<HTMLAnchorElement>('.site-footer__link')];
    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['RSS', 'rss-he.xml'],
      ['קוד מקור', SITE.repo],
    ]);
    expect(links[0].getAttribute('type')).toBe('application/rss+xml');
  });

  it('links the English RSS feed and follows language changes (en)', async () => {
    const { fixture, el } = await render('en');
    const rss = el.querySelector('.site-footer__link');
    expect(rss?.getAttribute('href')).toBe('rss-en.xml');
    expect(el.querySelectorAll('.site-footer__link')[1].textContent?.trim()).toBe('Source');

    TestBed.inject(LocaleService).setLang('he');
    await fixture.whenStable();
    expect(rss?.getAttribute('href')).toBe('rss-he.xml');
  });

  it('shows the author (marked as English) and the current year', async () => {
    const { el } = await render('he');
    const author = el.querySelector('.site-footer__copy span');
    expect(author?.textContent).toBe(SITE.author);
    expect(author?.getAttribute('lang')).toBe('en');
    expect(el.textContent).toContain(String(new Date().getFullYear()));
  });

  it('hides decorative icons from assistive tech', async () => {
    const { el } = await render('en');
    const icons = [...el.querySelectorAll('svg')];
    expect(icons.length).toBe(2);
    expect(icons.every((svg) => svg.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
});
