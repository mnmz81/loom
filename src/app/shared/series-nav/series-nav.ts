import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EntryRef, Lang, SeriesNav as SeriesNavModel } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { dirOf } from '../lang-dir';

@Component({
  selector: 'nb-series-nav',
  imports: [RouterLink],
  templateUrl: './series-nav.html',
  styleUrl: './series-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeriesNav {
  readonly nav = input.required<SeriesNavModel>();

  protected readonly locale = inject(LocaleService);
  protected readonly seriesPath = computed(() => PATHS.series(this.locale.lang(), this.nav().key));
  protected readonly part = computed(() =>
    this.locale.t('series.part', { index: this.nav().index, total: this.nav().total }),
  );
  protected readonly label = computed(
    () => `${this.locale.t('series.title')}: ${this.nav().title}`,
  );

  /** Target URL uses the ref's own language (a fallback when the part is not translated). */
  protected path(ref: EntryRef): string {
    return PATHS.entry(ref.lang, ref.type, ref.slug);
  }

  /** The ref's language when it differs from the UI language, else null (no attribute). */
  protected foreignLang(ref: EntryRef): Lang | null {
    return ref.lang !== this.locale.lang() ? ref.lang : null;
  }

  protected foreignDir(ref: EntryRef): 'rtl' | 'ltr' | null {
    return dirOf(this.foreignLang(ref));
  }
}
