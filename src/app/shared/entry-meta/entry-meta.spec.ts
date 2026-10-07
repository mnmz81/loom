import { TestBed } from '@angular/core/testing';
import type { Entry, EntryMeta as EntryMetaModel, Lang } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import enNoteJson from '../../../testing/fixtures/content/en/notes/git-undo-last-commit.json';
import hePostJson from '../../../testing/fixtures/content/he/posts/rust-borrowing.json';
import { EntryMeta } from './entry-meta';

const hePost = hePostJson as Entry;
const enNote = enNoteJson as Entry;

async function render(lang: Lang, entry: EntryMetaModel) {
  TestBed.inject(LocaleService).setLang(lang);
  const fixture = TestBed.createComponent(EntryMeta);
  fixture.componentRef.setInput('entry', entry);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('EntryMeta', () => {
  afterEach(() => TestBed.inject(LocaleService).setLang('he'));

  it('shows the Hebrew date and reading time of a post (he)', async () => {
    const el = await render('he', hePost);
    const time = el.querySelector('.entry-meta__date');
    expect(time?.getAttribute('datetime')).toBe('2026-10-05');
    expect(time?.textContent?.trim()).toBe(
      TestBed.inject(LocaleService).formatDate('2026-10-05', 'he'),
    );
    expect(el.querySelector('.entry-meta__reading')?.textContent?.trim()).toBe('1 דק׳ קריאה');
    expect(el.querySelector('.entry-meta__updated')).toBeNull();
  });

  it('shows the English updated date and no reading time for a note (en)', async () => {
    const el = await render('en', enNote);
    expect(el.querySelector('.entry-meta__date')?.textContent?.trim()).toBe('September 28, 2026');
    const updated = el.querySelector('.entry-meta__updated');
    expect(updated?.getAttribute('datetime')).toBe('2026-10-02');
    expect(updated?.textContent?.trim()).toBe('Updated October 2, 2026');
    expect(el.querySelector('.entry-meta__reading')).toBeNull();
  });

  it('shows the reading time of a post in English (en)', async () => {
    const el = await render('en', { ...hePost, readingMinutes: 7 });
    expect(el.querySelector('.entry-meta__reading')?.textContent?.trim()).toBe('7 min read');
  });

  it('hides separators from screen readers', async () => {
    const el = await render('en', { ...enNote, type: 'post' });
    const seps = [...el.querySelectorAll('.entry-meta__sep')];
    expect(seps.length).toBe(2);
    expect(seps.every((s) => s.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
});
