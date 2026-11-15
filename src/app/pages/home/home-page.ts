import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EntryMeta, LangIndex, SeriesIndex } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';
import { SITE } from '../../core/site.config';
import { EntryList } from '../../shared/entry-list/entry-list';
import { SeriesTiles } from '../../shared/series-tiles/series-tiles';
import { allLangPaths } from '../seo-helpers';

const LATEST_POSTS = 5;
const LATEST_NOTES = 5;

/** Newest entries, at most one per series (a post outside a series counts as its own), so one busy series does not fill the list. */
export function latestPerSeries(entries: readonly EntryMeta[], max: number): EntryMeta[] {
  const seen = new Set<string>();
  return entries
    .filter((e) => {
      const group = e.series?.key ?? `${e.type}/${e.slug}`;
      if (seen.has(group)) return false;
      seen.add(group);
      return true;
    })
    .slice(0, max);
}

/** `/:lang` — what the blog is and where to start: series (in order), latest posts, latest notes (hidden while there are none). */
import { Button } from '@mushilu-san/ui/primitives';

@Component({
  selector: 'nb-home-page',
  imports: [RouterLink, Button, EntryList, SeriesTiles],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-pagefind-ignore': '' },
})
export class HomePage {
  readonly index = input.required<LangIndex>();
  readonly series = input.required<SeriesIndex>();

  protected readonly locale = inject(LocaleService);
  protected readonly paths = PATHS;
  protected readonly tagLabels = computed(() => Object.fromEntries(this.index().tags.map((t) => [t.tag, t.label])));
  protected readonly posts = computed(() =>
    latestPerSeries(this.index().entries.filter((e) => e.type === 'post'), LATEST_POSTS),
  );
  protected readonly notes = computed(() =>
    this.index().entries.filter((e) => e.type === 'note').slice(0, LATEST_NOTES),
  );

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const lang = this.locale.lang();
      seo.set({
        lang,
        title: SITE.title[lang],
        description: SITE.description[lang],
        path: PATHS.home(lang),
        alternates: allLangPaths(PATHS.home),
      });
    });
  }
}
