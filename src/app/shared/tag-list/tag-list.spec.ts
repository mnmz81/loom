import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Lang, LangIndex } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import heIndexJson from '../../../testing/fixtures/content/he/index.json';
import { TagList } from './tag-list';

@Component({ template: '' })
class Blank {}

const heIndex = heIndexJson as LangIndex;

async function render(lang: Lang, tags: string[], labels?: Record<string, string>) {
  TestBed.inject(LocaleService).setLang(lang);
  const fixture = TestBed.createComponent(TagList);
  fixture.componentRef.setInput('tags', tags);
  if (labels) fixture.componentRef.setInput('labels', labels);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('TagList', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    }),
  );
  afterEach(() => TestBed.inject(LocaleService).setLang('he'));

  it('links each tag to its Hebrew tag page with a labelled list (he)', async () => {
    const el = await render('he', ['shell', 'zsh']);
    const list = el.querySelector('ul');
    expect(list?.getAttribute('aria-label')).toBe('תגיות');
    const links = [...el.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/he/tags/shell', '/he/tags/zsh']);
    expect(links.map((a) => a.textContent?.trim())).toEqual(['#shell', '#zsh']);
  });

  it('uses English tag URLs and list label (en)', async () => {
    const el = await render('en', ['git']);
    expect(el.querySelector('ul')?.getAttribute('aria-label')).toBe('Tags');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/en/tags/git');
  });

  it('uses display labels when given and falls back to the key', async () => {
    const labels = Object.fromEntries(heIndex.tags.map((t) => [t.tag, `${t.label}!`]));
    const el = await render('he', ['rust', 'unknown'], { rust: labels['rust'] });
    const texts = [...el.querySelectorAll('a')].map((a) => a.textContent?.trim());
    expect(texts).toEqual([`#${labels['rust']}`, '#unknown']);
  });

  it('hides the decorative # from screen readers', async () => {
    const el = await render('en', ['git']);
    expect(el.querySelector('a span')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders nothing for an empty list', async () => {
    const el = await render('en', []);
    expect(el.querySelector('ul')).toBeNull();
  });
});
