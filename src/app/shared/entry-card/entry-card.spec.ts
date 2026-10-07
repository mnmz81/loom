import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { EntryMeta, Lang, LangIndex } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import enIndexJson from '../../../testing/fixtures/content/en/index.json';
import heIndexJson from '../../../testing/fixtures/content/he/index.json';
import { EntryCard } from './entry-card';

@Component({ template: '' })
class Blank {}

const heIndex = heIndexJson as LangIndex;
const enIndex = enIndexJson as LangIndex;
const find = (index: LangIndex, slug: string) => index.entries.find((e) => e.slug === slug)!;

async function render(lang: Lang, entry: EntryMeta, headingLevel?: 2 | 3) {
  TestBed.inject(LocaleService).setLang(lang);
  const fixture = TestBed.createComponent(EntryCard);
  fixture.componentRef.setInput('entry', entry);
  if (headingLevel) fixture.componentRef.setInput('headingLevel', headingLevel);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('EntryCard', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    }),
  );
  afterEach(() => TestBed.inject(LocaleService).setLang('he'));

  it('renders a Hebrew post: type, date, h2 title link, summary, tags (he)', async () => {
    const entry = find(heIndex, 'rust-borrowing');
    const { el } = await render('he', entry);
    expect(el.querySelector('.entry-card__type')?.textContent?.trim()).toBe('פוסט');
    const time = el.querySelector('time');
    expect(time?.getAttribute('datetime')).toBe('2026-10-05');
    expect(time?.textContent?.trim()).toBe(
      TestBed.inject(LocaleService).formatDate('2026-10-05', 'he'),
    );
    const heading = el.querySelector('h2.entry-card__title');
    expect(heading).not.toBeNull();
    const link = heading?.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/he/posts/rust-borrowing');
    expect(link?.textContent?.trim()).toBe(entry.title);
    expect(el.querySelector('.entry-card__summary')?.textContent?.trim()).toBe(entry.summary);
    expect(el.querySelector('nb-tag-list a')?.getAttribute('href')).toBe('/he/tags/rust');
  });

  it('renders an English note without a summary (en)', async () => {
    const entry = find(enIndex, 'git-undo-last-commit');
    const { el } = await render('en', entry);
    expect(el.querySelector('.entry-card__type')?.textContent?.trim()).toBe('Note');
    expect(el.querySelector('time')?.textContent?.trim()).toBe('September 28, 2026');
    expect(el.querySelector('.entry-card__link')?.getAttribute('href')).toBe(
      '/en/notes/git-undo-last-commit',
    );
    expect(el.querySelector('.entry-card__summary')).toBeNull();
  });

  it('no badge, hreflang or lang for an entry in the UI language', async () => {
    const { el } = await render('en', find(enIndex, 'git-undo-last-commit'));
    expect(el.querySelector('nb-lang-badge')).toBeNull();
    expect(el.querySelector('.entry-card__link')?.hasAttribute('hreflang')).toBe(false);
    expect(el.querySelector('.entry-card__title')?.hasAttribute('lang')).toBe(false);
    expect(el.querySelector('.entry-card__title')?.hasAttribute('dir')).toBe(false);
  });

  it('marks a Hebrew-only fallback entry in the English UI (en)', async () => {
    const entry = find(enIndex, 'rust-ownership');
    expect(entry.lang).toBe('he');
    const { el } = await render('en', entry);
    expect(el.querySelector('nb-lang-badge')?.textContent?.trim()).toBe('Hebrew only');
    const link = el.querySelector('.entry-card__link');
    expect(link?.getAttribute('href')).toBe('/he/posts/rust-ownership');
    expect(link?.getAttribute('hreflang')).toBe('he');
    expect(el.querySelector('.entry-card__title')?.getAttribute('lang')).toBe('he');
    expect(el.querySelector('.entry-card__summary')?.getAttribute('lang')).toBe('he');
    expect(el.querySelector('.entry-card__title')?.getAttribute('dir')).toBe('rtl');
    expect(el.querySelector('.entry-card__summary')?.getAttribute('dir')).toBe('rtl');
    // Tags still lead to the UI-language tag page.
    expect(el.querySelector('nb-tag-list a')?.getAttribute('href')).toBe('/en/tags/rust');
  });

  it('marks an English-only fallback entry in the Hebrew UI (he)', async () => {
    const entry = find(heIndex, 'zsh-history-search');
    const { el } = await render('he', entry);
    expect(el.querySelector('nb-lang-badge')?.textContent?.trim()).toBe('אנגלית בלבד');
    expect(el.querySelector('.entry-card__link')?.getAttribute('href')).toBe(
      '/en/notes/zsh-history-search',
    );
    expect(el.querySelector('.entry-card__link')?.getAttribute('hreflang')).toBe('en');
    expect(el.querySelector('.entry-card__title')?.getAttribute('lang')).toBe('en');
    expect(el.querySelector('.entry-card__title')?.getAttribute('dir')).toBe('ltr');
  });

  it('renders an h3 when headingLevel is 3', async () => {
    const { el } = await render('he', find(heIndex, 'rust-ownership'), 3);
    expect(el.querySelector('h3.entry-card__title a')).not.toBeNull();
    expect(el.querySelector('h2')).toBeNull();
  });

  it('passes tag labels to the tag list', async () => {
    const { fixture, el } = await render('he', find(heIndex, 'rust-ownership'));
    fixture.componentRef.setInput('tagLabels', { rust: 'ראסט' });
    await fixture.whenStable();
    expect(el.querySelector('nb-tag-list a')?.textContent?.trim()).toBe('#ראסט');
  });
});
