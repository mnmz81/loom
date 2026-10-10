import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Lang } from '../../../core/content.models';
import { LocaleService } from '../../../core/i18n/locale.service';
import { SiteHeader } from './site-header';

@Component({ template: '' })
class Blank {}

async function render(lang: Lang, theme: 'light' | 'dark' = 'light') {
  TestBed.inject(LocaleService).setLang(lang);
  const fixture = TestBed.createComponent(SiteHeader);
  fixture.componentRef.setInput('theme', theme);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

const navHrefs = (el: HTMLElement) =>
  [...el.querySelectorAll('nav a')].map((a) => a.getAttribute('href'));

describe('SiteHeader', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    }),
  );
  afterEach(() => TestBed.inject(LocaleService).setLang('he'));

  it('renders the Hebrew title and nav links (he)', async () => {
    const { el } = await render('he');
    expect(el.querySelector('.site-header__brand')?.getAttribute('href')).toBe('/he');
    expect(el.querySelector('.site-header__name')?.textContent?.trim()).toBe('לום');
    expect(navHrefs(el)).toEqual(['/he', '/he/posts', '/he/notes', '/he/series', '/he/search']);
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('ניווט ראשי');
    expect(el.querySelector('nav a')?.textContent?.trim()).toBe('בית');
  });

  it('renders the English title and nav links (en)', async () => {
    const { el } = await render('en');
    expect(el.querySelector('.site-header__name')?.textContent?.trim()).toBe('Loom');
    expect(navHrefs(el)).toEqual(['/en', '/en/posts', '/en/notes', '/en/series', '/en/search']);
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Main navigation');
    expect([...el.querySelectorAll('nav a')].map((a) => a.textContent?.trim())).toEqual([
      'Home',
      'Posts',
      'Notes',
      'Series',
      'Search',
    ]);
  });

  it('marks only the active section with aria-current="page"', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/en/posts/rust-borrowing');
    const { el } = await render('en');
    const current = [...el.querySelectorAll('nav a[aria-current="page"]')];
    expect(current.map((a) => a.getAttribute('href'))).toEqual(['/en/posts']);
  });

  it('marks Home active only on the exact home URL', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/he');
    const { el } = await render('he');
    const current = [...el.querySelectorAll('nav a[aria-current="page"]')];
    expect(current.map((a) => a.getAttribute('href'))).toEqual(['/he']);
  });

  it('language switch swaps the current URL and names the other language (he → en)', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/he/posts?x=1');
    const { el } = await render('he');
    const link = el.querySelector('.site-header__lang');
    expect(link?.getAttribute('href')).toBe('/en/posts');
    expect(link?.textContent?.trim()).toBe('English');
    expect(link?.getAttribute('hreflang')).toBe('en');
    expect(link?.getAttribute('lang')).toBe('en');
    expect(link?.getAttribute('title')).toBe('החלפת שפה');
  });

  it('language switch follows navigation (en → he)', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/en/notes');
    const { fixture, el } = await render('en');
    expect(el.querySelector('.site-header__lang')?.getAttribute('href')).toBe('/he/notes');
    expect(el.querySelector('.site-header__lang')?.textContent?.trim()).toBe('עברית');
    expect(el.querySelector('.site-header__lang')?.getAttribute('title')).toBe('Switch language');

    await harness.navigateByUrl('/en/series');
    await fixture.whenStable();
    expect(el.querySelector('.site-header__lang')?.getAttribute('href')).toBe('/he/series');
  });

  it('language switch prefers locale.alternateUrl', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/he/posts/rust-ownership');
    const { fixture, el } = await render('he');
    TestBed.inject(LocaleService).alternateUrl.set('/en');
    await fixture.whenStable();
    expect(el.querySelector('.site-header__lang')?.getAttribute('href')).toBe('/en');
  });

  it('theme toggle is labelled with the action and emits themeToggle (he)', async () => {
    const { fixture, el } = await render('he', 'light');
    const button = el.querySelector<HTMLButtonElement>('.site-header__theme-btn')!;
    expect(button.getAttribute('aria-label')).toBe('מעבר למצב כהה');
    let emitted = 0;
    fixture.componentInstance.themeToggle.subscribe(() => emitted++);
    button.click();
    expect(emitted).toBe(1);

    fixture.componentRef.setInput('theme', 'dark');
    await fixture.whenStable();
    expect(button.getAttribute('aria-label')).toBe('מעבר למצב בהיר');
  });

  it('theme toggle label in English', async () => {
    const { el } = await render('en', 'dark');
    const button = el.querySelector('.site-header__theme-btn');
    expect(button?.getAttribute('aria-label')).toBe('Switch to light mode');
    expect(button?.getAttribute('title')).toBe('Switch to light mode');
  });

  it('menu button toggles aria-expanded and controls the nav', async () => {
    const { fixture, el } = await render('en');
    const button = el.querySelector<HTMLButtonElement>('.site-header__menu-btn')!;
    expect(button.getAttribute('aria-controls')).toBe('nb-site-nav');
    expect(el.querySelector('#nb-site-nav')).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBe('Menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');

    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('.site-header--open')).not.toBeNull();

    el.querySelector<HTMLAnchorElement>('nav a')!.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape closes the open menu and returns focus to the menu button', async () => {
    const { fixture, el } = await render('he');
    document.body.appendChild(el);
    const button = el.querySelector<HTMLButtonElement>('.site-header__menu-btn')!;
    button.style.display = 'inline-grid'; // shown only below 640px; jsdom ignores media queries
    const firstLink = el.querySelector<HTMLAnchorElement>('nav a')!;

    button.click();
    await fixture.whenStable();
    firstLink.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);

    // Escape while closed must not steal focus.
    firstLink.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(firstLink);
    el.remove();
  });
});
