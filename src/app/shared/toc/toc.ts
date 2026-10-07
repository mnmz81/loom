import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TocItem } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { uniqueId } from '../unique-id';

@Component({
  selector: 'nb-toc',
  imports: [RouterLink],
  templateUrl: './toc.html',
  styleUrl: './toc.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toc {
  readonly items = input.required<TocItem[]>();

  protected readonly locale = inject(LocaleService);
  protected readonly titleId = uniqueId('nb-toc-title');
}
