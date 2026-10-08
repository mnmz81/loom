import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import type { EntryMeta, LangIndex, SeriesSummary } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';
import { EntryCard } from '../../shared/entry-card/entry-card';
import { pageCount, pageText } from '../page-text';
import { allLangPaths } from '../seo-helpers';

/** `/:lang/series/:key` — the parts of one series in order. `series` comes from `seriesResolver`. */
@Component({
  selector: 'nb-series-page',
  imports: [EntryCard],
  templateUrl: './series-page.html',
  styleUrl: './series-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-pagefind-ignore': '' },
})
export class SeriesPage {
  readonly series = input.required<SeriesSummary>();
  readonly index = input.required<LangIndex>();

  protected readonly locale = inject(LocaleService);
  protected readonly title = computed(() => this.series().title[this.locale.lang()]);
  protected readonly description = computed(() => this.series().description[this.locale.lang()] ?? '');
  protected readonly tagLabels = computed(() => Object.fromEntries(this.index().tags.map((t) => [t.tag, t.label])));
  /** Posts in series order; a part missing from the index is skipped. */
  protected readonly parts = computed(() => {
    const posts = new Map(this.index().entries.filter((e) => e.type === 'post').map((e) => [e.slug, e]));
    return this.series()
      .slugs.map((slug) => posts.get(slug))
      .filter((e): e is EntryMeta => !!e)
      .map((entry, i) => ({ entry, label: pageText(this.locale.lang(), 'series.partN', { n: i + 1 }) }));
  });
  protected readonly count = computed(() =>
    pageCount(this.locale.lang(), this.parts().length, 'series.partsOne', 'series.partsOther'),
  );

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const lang = this.locale.lang();
      const key = this.series().key;
      seo.set({
        lang,
        title: this.title(),
        description: this.description() || `${this.title()} — ${this.count()}`,
        path: PATHS.series(lang, key),
        alternates: allLangPaths((l) => PATHS.series(l, key)),
      });
    });
  }
}
