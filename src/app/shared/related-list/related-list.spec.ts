import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Entry, EntryRef, Lang } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import hePostJson from '../../../testing/fixtures/content/he/posts/rust-borrowing.json';
import { RelatedList } from './related-list';

@Component({ template: '' })
class Blank {}

const heRelated = (hePostJson as Entry).related;

async function render(lang: Lang, items: EntryRef[]) {
  TestBed.inject(LocaleService).setLang(lang);
  const fixture = TestBed.createComponent(RelatedList);
  fixture.componentRef.setInput('items', items);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('RelatedList', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    }),
  );
  afterEach(() => TestBed.inject(LocaleService).setLang('he'));

  it('is a section labelled by its Hebrew heading and links entries (he)', async () => {
    const el = await render('he', heRelated);
    const section = el.querySelector('section');
    const title = el.querySelector('h2');
    expect(title?.textContent?.trim()).toBe('קשור');
    expect(section?.getAttribute('aria-labelledby')).toBe(title?.id);
    const link = el.querySelector('.related__link');
    expect(link?.getAttribute('href')).toBe('/he/posts/rust-ownership');
    expect(link?.querySelector('.related__type')?.textContent?.trim()).toBe('פוסט');
    expect(link?.querySelector('.related__ref')?.textContent?.trim()).toBe(
      'ראסט: בעלות (Ownership)',
    );
    expect(link?.hasAttribute('hreflang')).toBe(false);
  });

  it('marks fallback-language items and labels notes in English (en)', async () => {
    const items: EntryRef[] = [
      ...heRelated,
      { type: 'note', slug: 'git-undo-last-commit', lang: 'en', title: 'Undo the last git commit' },
    ];
    const el = await render('en', items);
    expect(el.querySelector('h2')?.textContent?.trim()).toBe('Related');
    const links = [...el.querySelectorAll('.related__link')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/he/posts/rust-ownership',
      '/en/notes/git-undo-last-commit',
    ]);
    expect(links[0].getAttribute('hreflang')).toBe('he');
    expect(links[0].querySelector('.related__ref')?.getAttribute('lang')).toBe('he');
    expect(links[0].querySelector('.related__ref')?.getAttribute('dir')).toBe('rtl');
    expect(links[1].querySelector('.related__type')?.textContent?.trim()).toBe('Note');
    expect(links[1].querySelector('.related__ref')?.hasAttribute('lang')).toBe(false);
    expect(links[1].querySelector('.related__ref')?.hasAttribute('dir')).toBe(false);
  });

  it('is hidden when empty', async () => {
    const el = await render('en', []);
    expect(el.querySelector('section')).toBeNull();
  });
});
