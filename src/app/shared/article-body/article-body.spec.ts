import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Entry, Lang } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import enNoteJson from '../../../testing/fixtures/content/en/notes/git-undo-last-commit.json';
import hePostJson from '../../../testing/fixtures/content/he/posts/rust-borrowing.json';
import { ArticleBody } from './article-body';

const hePost = hePostJson as Entry;
const enNote = enNoteJson as Entry;
const shikiHtml =
  '<p>x</p><pre class="shiki" dir="ltr" tabindex="0" style="--shiki-light-bg:#fff;--shiki-dark-bg:#000">' +
  '<code><span class="line"><span style="--shiki-light:#111;--shiki-dark:#eee">a</span></span>\n' +
  '<span class="line"><span>b</span></span></code></pre><pre><code>second</code></pre>';

let writeText: ReturnType<typeof vi.fn>;

function stubClipboard(impl: () => Promise<void> = () => Promise.resolve()) {
  writeText = vi.fn(impl);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

async function render(lang: Lang, html: string) {
  TestBed.inject(LocaleService).setLang(lang);
  const fixture = TestBed.createComponent(ArticleBody);
  fixture.componentRef.setInput('html', html);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));
const buttons = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('.nb-code__copy')];

describe('ArticleBody', () => {
  beforeEach(() => stubClipboard());
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'clipboard');
    TestBed.inject(LocaleService).setLang('he');
  });

  it('renders the pipeline HTML as an indexable prose block, keeping Shiki style variables', async () => {
    const { el } = await render('en', shikiHtml);
    const body = el.querySelector('.prose');
    expect(body?.hasAttribute('data-pagefind-body')).toBe(true);
    const token = body?.querySelector('.line span');
    expect(token?.getAttribute('style')).toContain('--shiki-light:#111');
    expect(body?.querySelector('pre')?.getAttribute('style')).toContain('--shiki-dark-bg:#000');
  });

  it('renders the Hebrew fixture body (he)', async () => {
    const { el } = await render('he', hePost.html);
    expect(el.querySelector('#example')?.textContent).toBe('Example');
    expect(el.querySelector('pre')?.getAttribute('dir')).toBe('ltr');
  });

  it('adds a Hebrew copy button with a polite live region after each <pre> (he)', async () => {
    const { el } = await render('he', shikiHtml);
    const wrappers = [...el.querySelectorAll('.nb-code')];
    expect(wrappers.length).toBe(2);
    expect(wrappers.every((w) => w.getAttribute('dir') === 'ltr')).toBe(true);
    expect(wrappers.every((w) => w.firstElementChild?.tagName === 'PRE')).toBe(true);
    const [button] = buttons(el);
    expect(button.type).toBe('button');
    expect(button.textContent).toBe('העתקה');
    expect(button.querySelector('span')?.getAttribute('aria-live')).toBe('polite');
  });

  it('copies the code text, says "Copied" for 2s, then resets (en)', async () => {
    const { el } = await render('en', enNote.html);
    const [button] = buttons(el);
    expect(button.textContent).toBe('Copy');
    vi.useFakeTimers();

    button.click();
    await flush();
    expect(writeText).toHaveBeenCalledWith('let x = 1;');
    expect(button.textContent).toBe('Copied');
    expect(button.classList.contains('is-copied')).toBe(true);

    vi.advanceTimersByTime(1999);
    expect(button.textContent).toBe('Copied');
    vi.advanceTimersByTime(1);
    expect(button.textContent).toBe('Copy');
    expect(button.classList.contains('is-copied')).toBe(false);
  });

  it('copies multi-line code from the clicked block only', async () => {
    const { el } = await render('en', shikiHtml);
    buttons(el)[1].click();
    await flush();
    expect(writeText).toHaveBeenCalledWith('second');
    buttons(el)[0].click();
    await flush();
    expect(writeText).toHaveBeenLastCalledWith('a\nb');
  });

  it('leaves the label alone when the clipboard write fails', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')));
    const { el } = await render('en', enNote.html);
    buttons(el)[0].click();
    await flush();
    await flush();
    expect(buttons(el)[0].textContent).toBe('Copy');
  });

  it('ignores clicks outside the copy buttons', async () => {
    const { el } = await render('en', shikiHtml);
    el.querySelector<HTMLElement>('pre')!.click();
    el.querySelector<HTMLElement>('p')!.click();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('relabels buttons when the language changes', async () => {
    const { fixture, el } = await render('he', shikiHtml);
    TestBed.inject(LocaleService).setLang('en');
    await fixture.whenStable();
    expect(buttons(el).map((b) => b.textContent)).toEqual(['Copy', 'Copy']);
    expect(el.querySelectorAll('.nb-code').length).toBe(2);
  });

  it('adds buttons again when the HTML changes', async () => {
    const { fixture, el } = await render('en', shikiHtml);
    fixture.componentRef.setInput('html', hePost.html);
    await fixture.whenStable();
    expect(buttons(el).length).toBe(1);
  });

  it('clears pending reset timers on destroy', async () => {
    const { fixture, el } = await render('en', enNote.html);
    vi.useFakeTimers();
    const [button] = buttons(el);
    button.click();
    await flush();
    expect(button.textContent).toBe('Copied');
    fixture.destroy();
    vi.advanceTimersByTime(5000);
    expect(button.textContent).toBe('Copied'); // the reset callback never ran
  });

  it('adds no buttons without the Clipboard API', async () => {
    Reflect.deleteProperty(navigator, 'clipboard');
    const { el } = await render('en', shikiHtml);
    expect(buttons(el).length).toBe(0);
    expect(el.querySelectorAll('pre').length).toBe(2);
  });

  it('adds no buttons on the server', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const { el } = await render('he', shikiHtml);
    expect(buttons(el).length).toBe(0);
    expect(el.querySelector('.nb-code')).toBeNull();
  });
});
