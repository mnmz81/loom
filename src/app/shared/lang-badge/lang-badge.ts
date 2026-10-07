import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Lang } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';

/** "עברית בלבד / English only" pill for an entry shown without a translation in the current language. */
@Component({
  selector: 'nb-lang-badge',
  templateUrl: './lang-badge.html',
  styleUrl: './lang-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangBadge {
  /** The language the entry IS available in. */
  readonly lang = input.required<Lang>();

  private readonly locale = inject(LocaleService);
  protected readonly text = computed(() => this.locale.t(`lang.onlyIn.${this.lang()}`));
}
