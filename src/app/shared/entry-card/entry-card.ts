import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EntryMeta, Lang } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { LangBadge } from '../lang-badge/lang-badge';
import { dirOf } from '../lang-dir';
import { TagList } from '../tag-list/tag-list';

@Component({
  selector: 'nb-entry-card',
  imports: [RouterLink, NgTemplateOutlet, LangBadge, TagList],
  templateUrl: './entry-card.html',
  styleUrl: './entry-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryCard {
  readonly entry = input.required<EntryMeta>();
  readonly headingLevel = input<2 | 3>(2);
  /** Extra (not in the contract table): tag display labels for nb-tag-list, e.g. from LangIndex.tags. */
  readonly tagLabels = input<Record<string, string> | undefined>(undefined);

  protected readonly locale = inject(LocaleService);
  protected readonly href = computed(() => {
    const e = this.entry();
    return PATHS.entry(e.lang, e.type, e.slug);
  });
  protected readonly typeLabel = computed(() => this.locale.t(`type.${this.entry().type}`));
  protected readonly date = computed(() => this.locale.formatDate(this.entry().date));
  /** The entry's language when it differs from the UI language (untranslated fallback), else null. */
  protected readonly foreignLang = computed<Lang | null>(() =>
    this.entry().lang !== this.locale.lang() ? this.entry().lang : null,
  );
  protected readonly foreignDir = computed(() => dirOf(this.foreignLang()));
}
