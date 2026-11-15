import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { SeriesIndex, SeriesSummary } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { SeriesTiles, seriesGroups } from './series-tiles';

const track = { he: 'בינה מלאכותית', en: 'AI' };
const s = (key: string, en: string, extra: Partial<SeriesSummary> = {}): SeriesSummary => ({
  key,
  title: { he: key, en },
  description: {},
  slugs: ['a'],
  ...extra,
});
const INDEX: SeriesIndex = [
  s('python', 'Python', { order: 1 }),
  s('ai-basics', 'AI: the basics', { order: 2, track }),
  s('ai-rag', 'AI: RAG', { order: 3, track, slugs: ['a', 'b'] }),
  s('devops', 'Dev tools', { order: 4 }),
];

describe('seriesGroups', () => {
  it('keeps the order and merges consecutive series of one track, dropping the track prefix', () => {
    const groups = seriesGroups(INDEX, 'en');
    expect(groups.map((g) => [g.track, g.tiles.map((t) => t.title)])).toEqual([
      [null, ['Python']],
      ['AI', ['the basics', 'RAG']],
      [null, ['Dev tools']],
    ]);
    expect(groups[1].tiles[1]).toMatchObject({ path: '/en/series/ai-rag', parts: 2 });
    expect(groups.flatMap((g) => g.tiles.map((t) => t.color))).toEqual([0, 1, 2, 3]);
  });
});

describe('SeriesTiles', () => {
  it('renders single tiles with a marker and a track as one numbered tile (en)', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(LocaleService).setLang('en');
    const fixture = TestBed.createComponent(SeriesTiles);
    fixture.componentRef.setInput('series', INDEX);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.series-cards__item').length).toBe(2);
    expect(el.querySelectorAll('.series-cards__item .series-cards__marker[data-c]').length).toBe(2);
    const trackTile = el.querySelector('.series-cards__track')!;
    expect(trackTile.querySelector('[role="heading"]')?.textContent?.trim()).toBe('AI');
    expect(
      [...trackTile.querySelectorAll('.series-cards__step-n')].map((n) => n.textContent?.trim()),
    ).toEqual(['1', '2']);
    expect(trackTile.textContent).toContain('2 parts');
    TestBed.inject(LocaleService).setLang('he');
  });
});
