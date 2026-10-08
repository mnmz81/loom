import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { LangIndex, SeriesIndex } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';
import { SITE } from '../../core/site.config';
import { EntryList } from '../../shared/entry-list/entry-list';
import { pageCount } from '../page-text';
import { allLangPaths } from '../seo-helpers';

const LATEST_POSTS = 4;
const LATEST_NOTES = 5;

/** `/:lang` — latest posts and notes, plus a teaser of the series. */
@Component({
  selector: 'nb-home-page',
  imports: [RouterLink, EntryList],
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
  protected readonly title = computed(() => SITE.title[this.locale.lang()]);
  protected readonly description = computed(() => SITE.description[this.locale.lang()]);
  protected readonly tagLabels = computed(() => Object.fromEntries(this.index().tags.map((t) => [t.tag, t.label])));
  protected readonly posts = computed(() =>
    this.index().entries.filter((e) => e.type === 'post').slice(0, LATEST_POSTS),
  );
  protected readonly notes = computed(() =>
    this.index().entries.filter((e) => e.type === 'note').slice(0, LATEST_NOTES),
  );
  protected readonly seriesCards = computed(() => {
    const lang = this.locale.lang();
    return this.series().map((s) => ({
      key: s.key,
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
        title: SITE.title[lang],
        description: SITE.description[lang],
        path: PATHS.home(lang),
        alternates: allLangPaths(PATHS.home),
      });
    });
  }
}
