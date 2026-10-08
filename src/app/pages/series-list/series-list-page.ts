import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SeriesIndex } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';
import { pageCount } from '../page-text';
import { allLangPaths } from '../seo-helpers';

/** `/:lang/series` — all series. */
@Component({
  selector: 'nb-series-list-page',
  imports: [RouterLink],
  templateUrl: './series-list-page.html',
  styleUrl: './series-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-pagefind-ignore': '' },
})
export class SeriesListPage {
  readonly series = input.required<SeriesIndex>();

  protected readonly locale = inject(LocaleService);
  protected readonly cards = computed(() => {
    const lang = this.locale.lang();
    return this.series().map((s) => ({
      key: s.key,
      path: PATHS.series(lang, s.key),
      title: s.title[lang],
      description: s.description[lang] ?? '',
      parts: pageCount(lang, s.slugs.length, 'series.partsOne', 'series.partsOther'),
    }));
  });

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const lang = this.locale.lang();
      seo.set({
        lang,
        title: this.locale.t('series.title'),
        description: this.locale.t('series.title'),
        path: PATHS.seriesList(lang),
        alternates: allLangPaths(PATHS.seriesList),
      });
    });
  }
}
