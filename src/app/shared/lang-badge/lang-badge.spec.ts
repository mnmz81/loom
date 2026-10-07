import { TestBed } from '@angular/core/testing';
import type { Lang } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { LangBadge } from './lang-badge';

async function render(uiLang: Lang, lang: Lang) {
  TestBed.inject(LocaleService).setLang(uiLang);
  const fixture = TestBed.createComponent(LangBadge);
  fixture.componentRef.setInput('lang', lang);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('LangBadge', () => {
  afterEach(() => TestBed.inject(LocaleService).setLang('he'));

  it('says "Hebrew only" in the English UI (en)', async () => {
    const { el } = await render('en', 'he');
    expect(el.textContent?.trim()).toBe('Hebrew only');
  });

  it('says "אנגלית בלבד" in the Hebrew UI (he)', async () => {
    const { el } = await render('he', 'en');
    expect(el.textContent?.trim()).toBe('אנגלית בלבד');
  });

  it('updates when the input or UI language changes', async () => {
    const { fixture, el } = await render('he', 'en');
    fixture.componentRef.setInput('lang', 'he');
    await fixture.whenStable();
    expect(el.textContent?.trim()).toBe('עברית בלבד');
    TestBed.inject(LocaleService).setLang('en');
    await fixture.whenStable();
    expect(el.textContent?.trim()).toBe('Hebrew only');
  });
});
