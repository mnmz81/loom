import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import type { LangIndex, TagCount } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';
import { EntryList } from '../../shared/entry-list/entry-list';
import { pageCount } from '../page-text';
import { allLangPaths } from '../seo-helpers';

/** `/:lang/tags/:tag` — entries with one tag. `tagInfo` comes from `tagResolver`. */
@Component({
  selector: 'nb-tag-page',
  imports: [EntryList],
  templateUrl: './tag-page.html',
  styleUrl: './tag-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-pagefind-ignore': '' },
})
export class TagPage {
  readonly index = input.required<LangIndex>();
  readonly tagInfo = input.required<TagCount>();

  protected readonly locale = inject(LocaleService);
  protected readonly entries = computed(() => this.index().entries.filter((e) => e.tags.includes(this.tagInfo().tag)));
  protected readonly tagLabels = computed(() => Object.fromEntries(this.index().tags.map((t) => [t.tag, t.label])));
  protected readonly title = computed(() => this.locale.t('tag.title', { tag: this.tagInfo().label }));
  protected readonly count = computed(() =>
    pageCount(this.locale.lang(), this.entries().length, 'entries.one', 'entries.other'),
  );

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const lang = this.locale.lang();
      const tag = this.tagInfo().tag;
      seo.set({
        lang,
        title: this.title(),
        description: `${this.title()} — ${this.count()}`,
        path: PATHS.tag(lang, tag),
        alternates: allLangPaths((l) => PATHS.tag(l, tag)),
      });
    });
  }
}
