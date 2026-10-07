import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { EntryMeta } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { EntryCard } from '../entry-card/entry-card';

@Component({
  selector: 'nb-entry-list',
  imports: [EntryCard],
  templateUrl: './entry-list.html',
  styleUrl: './entry-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryList {
  readonly entries = input.required<EntryMeta[]>();
  readonly emptyText = input<string | undefined>(undefined);
  /** Extras (not in the contract table), passed through to each nb-entry-card. */
  readonly headingLevel = input<2 | 3>(2);
  readonly tagLabels = input<Record<string, string> | undefined>(undefined);

  protected readonly locale = inject(LocaleService);
}
