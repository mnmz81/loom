import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EntryType, LangIndex } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';
import { EntryList } from '../../shared/entry-list/entry-list';
import { allLangPaths } from '../seo-helpers';

/** `/:lang/posts` and `/:lang/notes` — every entry of one type (route `data: { type }`). */
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

  protected readonly locale = inject(LocaleService);
  protected readonly title = computed(() => this.locale.t(this.type() === 'post' ? 'nav.posts' : 'nav.notes'));
  protected readonly entries = computed(() => this.index().entries.filter((e) => e.type === this.type()));
  protected readonly tagLabels = computed(() => Object.fromEntries(this.index().tags.map((t) => [t.tag, t.label])));
  protected tagPath(tag: string): string {
    return PATHS.tag(this.locale.lang(), tag);
  }

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const lang = this.locale.lang();
      const post = this.type() === 'post';
      seo.set({
        lang,
        title: this.title(),
        description: this.locale.t(post ? 'list.latestPosts' : 'list.latestNotes'),
        path: post ? PATHS.posts(lang) : PATHS.notes(lang),
        alternates: allLangPaths(post ? PATHS.posts : PATHS.notes),
      });
    });
  }
}
