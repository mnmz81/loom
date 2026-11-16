import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Empty } from '@mushilu-san/ui/data-display';
import { RouterLink } from '@angular/router';
import type { EntryMeta, Lang, LangIndex, SeriesSummary } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';
import { LangBadge } from '../../shared/lang-badge/lang-badge';
import { dirOf } from '../../shared/lang-dir';
import { pageText } from '../page-text';
import { allLangPaths } from '../seo-helpers';

/** `/:lang/series/:key` — the parts of one series in order. `series` comes from `seriesResolver`. */
@Component({
  selector: 'nb-series-page',
  imports: [RouterLink, LangBadge, Empty],
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
  /** Posts in series order; a part missing from the index is skipped. */
  protected readonly parts = computed(() => {
    const lang = this.locale.lang();
    const posts = new Map(this.index().entries.filter((e) => e.type === 'post').map((e) => [e.slug, e]));
    return this.series()
      .slugs.map((slug) => posts.get(slug))
      .filter((e): e is EntryMeta => !!e)
      .map((entry, i) => {
        const foreignLang: Lang | null = entry.lang !== lang ? entry.lang : null;
        return {
          entry,
          n: i + 1,
          label: pageText(lang, 'series.partN', { n: i + 1 }),
          path: PATHS.entry(entry.lang, entry.type, entry.slug),
          foreignLang,
          foreignDir: dirOf(foreignLang),
          reading: this.locale.t('entry.readingMinutes', { n: entry.readingMinutes }),
        };
      });
  });
  protected readonly count = computed(() =>
    this.parts().length === 1
      ? this.locale.t('series.partsOne')
      : this.locale.t('series.partsOther', { n: this.parts().length }),
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
