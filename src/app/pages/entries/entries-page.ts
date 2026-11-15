import { ChangeDetectionStrategy, Component, computed, effect, inject, input, numberAttribute } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EntryType, LangIndex } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';
import { EntryList } from '../../shared/entry-list/entry-list';
import { pageItems, pageTotal } from '../pagination';
import { allLangPaths } from '../seo-helpers';

const TOP_TAGS = 10;

/**
 * `/:lang/posts`, `/:lang/notes` and their `/page/:page` pages — one page of entries of one type
 * (route `data: { type }`, `page` from `listPageResolver`).
 */
@Component({
  selector: 'nb-entries-page',
  imports: [RouterLink, EntryList],
  templateUrl: './entries-page.html',
  styleUrl: './entries-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-pagefind-ignore': '' },
})
export class EntriesPage {
  readonly index = input.required<LangIndex>();
  readonly type = input.required<EntryType>();
  /** 1-based page number. */
  readonly page = input(1, { transform: numberAttribute });

  protected readonly locale = inject(LocaleService);
  protected readonly title = computed(() => this.locale.t(this.type() === 'post' ? 'nav.posts' : 'nav.notes'));
  protected readonly entries = computed(() => this.index().entries.filter((e) => e.type === this.type()));
  protected readonly pageEntries = computed(() => pageItems(this.entries(), this.page()));
  protected readonly pages = computed(() => Array.from({ length: pageTotal(this.entries().length) }, (_, i) => i + 1));
  protected readonly tagLabels = computed(() => Object.fromEntries(this.index().tags.map((t) => [t.tag, t.label])));
  protected readonly topTags = computed(() => this.index().tags.slice(0, TOP_TAGS));
  protected readonly moreTags = computed(() => this.index().tags.slice(TOP_TAGS));

  protected tagPath(tag: string): string {
    return PATHS.tag(this.locale.lang(), tag);
  }

  protected pagePath(page: number): string {
    return (this.type() === 'post' ? PATHS.posts : PATHS.notes)(this.locale.lang(), page);
  }

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const lang = this.locale.lang();
      const post = this.type() === 'post';
      const page = this.page();
      const paths = post ? PATHS.posts : PATHS.notes;
      seo.set({
        lang,
        title: page > 1 ? this.locale.t('pager.title', { title: this.title(), n: page }) : this.title(),
        description: this.locale.t(post ? 'list.latestPosts' : 'list.latestNotes'),
        path: paths(lang, page),
        alternates: allLangPaths((l) => paths(l, page)),
      });
    });
  }
}
