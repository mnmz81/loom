import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LocaleService } from '../../../core/i18n/locale.service';

import { SkipLink as MuiSkipLink } from '@mushilu-san/ui/navigation';
@Component({
  selector: 'nb-skip-link',
  imports: [MuiSkipLink],
  templateUrl: './skip-link.html',
  styleUrl: './skip-link.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkipLink {
  /** id of the element to jump to (usually <main id="main">). */
  readonly target = input('main');

  protected readonly locale = inject(LocaleService);
}
