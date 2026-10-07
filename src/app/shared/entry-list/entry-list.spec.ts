import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { EntryMeta, Lang, LangIndex } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import enIndexJson from '../../../testing/fixtures/content/en/index.json';
import heIndexJson from '../../../testing/fixtures/content/he/index.json';
import { EntryList } from './entry-list';

@Component({ template: '' })
class Blank {}

const heIndex = heIndexJson as LangIndex;
const enIndex = enIndexJson as LangIndex;

async function render(lang: Lang, entries: EntryMeta[], emptyText?: string) {
  TestBed.inject(LocaleService).setLang(lang);
  const fixture = TestBed.createComponent(EntryList);
  fixture.componentRef.setInput('entries', entries);
  if (emptyText !== undefined) fixture.componentRef.setInput('emptyText', emptyText);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('EntryList', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    }),
  );
  afterEach(() => TestBed.inject(LocaleService).setLang('he'));

  it('renders one list item with a card per Hebrew index entry, in order (he)', async () => {
    const { el } = await render('he', heIndex.entries);
    const items = el.querySelectorAll('ul.entry-list > li > nb-entry-card');
    expect(items.length).toBe(heIndex.entries.length);
    const titles = [...el.querySelectorAll('.entry-card__link')].map((a) => a.textContent?.trim());
    expect(titles).toEqual(heIndex.entries.map((e) => e.title));
  });

  it('renders the English index (en)', async () => {
    const { el } = await render('en', enIndex.entries);
    expect(el.querySelectorAll('nb-entry-card').length).toBe(enIndex.entries.length);
    expect(el.querySelector('.entry-list__empty')).toBeNull();
  });

  it('shows the default empty text in Hebrew (he)', async () => {
    const { el } = await render('he', []);
    expect(el.querySelector('ul')).toBeNull();
    expect(el.querySelector('.entry-list__empty')?.textContent?.trim()).toBe('אין כאן כלום עדיין.');
  });

  it('shows the default empty text in English (en)', async () => {
    const { el } = await render('en', []);
    expect(el.querySelector('.entry-list__empty')?.textContent?.trim()).toBe('Nothing here yet.');
  });

  it('prefers a custom empty text', async () => {
    const { el } = await render('en', [], 'No notes tagged "x".');
    expect(el.querySelector('.entry-list__empty')?.textContent?.trim()).toBe(
      'No notes tagged "x".',
    );
  });

  it('passes headingLevel and tagLabels to the cards', async () => {
    const { fixture, el } = await render('he', heIndex.entries.slice(0, 1));
    fixture.componentRef.setInput('headingLevel', 3);
    fixture.componentRef.setInput('tagLabels', { rust: 'ראסט' });
    await fixture.whenStable();
    expect(el.querySelector('h3.entry-card__title')).not.toBeNull();
    expect(el.querySelector('nb-tag-list a')?.textContent?.trim()).toBe('#ראסט');
  });
});
