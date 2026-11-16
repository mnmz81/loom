import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { Empty } from '@mushilu-san/ui/data-display';
import type { SeriesIndex } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';
import { SeriesTiles } from '../../shared/series-tiles/series-tiles';
import { allLangPaths } from '../seo-helpers';

/** `/:lang/series` — all series in their explicit order, tracks as one numbered tile. */
@Component({
  selector: 'nb-series-list-page',
  imports: [SeriesTiles, Empty],
  templateUrl: './series-list-page.html',
  styleUrl: './series-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-pagefind-ignore': '' },
})
export class SeriesListPage {
  readonly series = input.required<SeriesIndex>();

  protected readonly locale = inject(LocaleService);

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
