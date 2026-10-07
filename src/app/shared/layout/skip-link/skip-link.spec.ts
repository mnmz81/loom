import { TestBed } from '@angular/core/testing';
import type { Lang } from '../../../core/content.models';
import { LocaleService } from '../../../core/i18n/locale.service';
import { SkipLink } from './skip-link';

async function render(lang: Lang, target?: string) {
  TestBed.inject(LocaleService).setLang(lang);
  const fixture = TestBed.createComponent(SkipLink);
  if (target) fixture.componentRef.setInput('target', target);
  await fixture.whenStable();
  return fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
}

describe('SkipLink', () => {
  let main: HTMLElement;

  beforeEach(() => {
    main = document.createElement('main');
    main.id = 'main';
    main.textContent = 'content';
    document.body.appendChild(main);
  });
  afterEach(() => {
    main.remove();
    TestBed.inject(LocaleService).setLang('he');
  });

  it('is labelled in Hebrew and targets #main by default (he)', async () => {
    const link = await render('he');
    expect(link.textContent?.trim()).toBe('דלג לתוכן');
    expect(link.getAttribute('href')).toBe('#main');
  });

  it('is labelled in English (en)', async () => {
    const link = await render('en');
    expect(link.textContent?.trim()).toBe('Skip to content');
  });

  it('moves focus to the target and makes it programmatically focusable', async () => {
    const link = await render('en');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(main.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(main);
  });

  it('keeps an existing tabindex and supports a custom target', async () => {
    const section = document.createElement('section');
    section.id = 'content';
    section.setAttribute('tabindex', '0');
    document.body.appendChild(section);
    const link = await render('he', 'content');
    expect(link.getAttribute('href')).toBe('#content');
    link.click();
    expect(section.getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(section);
    section.remove();
  });

  it('does nothing when the target is missing', async () => {
    const link = await render('he', 'nope');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
