import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Card } from '@mushilu-san/ui/data-display';
import { RouterLink } from '@angular/router';
import type { Lang, SeriesIndex } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';

/** Number of series identity colors in styles/_tokens.scss (--nb-tag-0 … --nb-tag-5). */
export const COLOR_COUNT = 6;

export interface SeriesTile {
  key: string;
  path: string;
  title: string;
  description: string;
  parts: number;
  /** Identity color slot (data-c, one of COLOR_COUNT) of the series marker. */
  color: number;
}

/** A single series, or a learning track: consecutive series that share `track` (numbered steps). */
export interface SeriesGroup {
  track: string | null;
  tiles: SeriesTile[];
}

/**
 * Groups an already ordered series index into tiles: consecutive series with the same track title
 * become one group. Inside a track the "<track>: " prefix of a title is dropped (the group says it).
 */
export function seriesGroups(series: SeriesIndex, lang: Lang): SeriesGroup[] {
  const groups: SeriesGroup[] = [];
  for (const [i, s] of series.entries()) {
    const track = s.track?.[lang] ?? null;
    const title =
      track && s.title[lang].startsWith(`${track}:`)
        ? s.title[lang].slice(track.length + 1).trim()
        : s.title[lang];
    const tile: SeriesTile = {
      key: s.key,
      path: PATHS.series(lang, s.key),
      title,
      description: s.description[lang] ?? '',
      parts: s.slugs.length,
      // By position, not by hashing the key: neighbours never share a color (up to COLOR_COUNT in a row).
      color: i % COLOR_COUNT,
    };
    const last = groups.at(-1);
    if (track && last?.track === track) last.tiles.push(tile);
    else groups.push({ track, tiles: [tile] });
  }
  return groups;
}

/** Series entry points (home and series list): one tile per series, one wide numbered tile per track. */
@Component({
  selector: 'nb-series-tiles',
  imports: [RouterLink, Card],
  templateUrl: './series-tiles.html',
  styleUrl: './series-tiles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeriesTiles {
  readonly series = input.required<SeriesIndex>();
  readonly headingLevel = input<2 | 3>(2);

  protected readonly locale = inject(LocaleService);
  protected readonly groups = computed(() => seriesGroups(this.series(), this.locale.lang()));

  protected parts(n: number): string {
    return n === 1 ? this.locale.t('series.partsOne') : this.locale.t('series.partsOther', { n });
  }
}
