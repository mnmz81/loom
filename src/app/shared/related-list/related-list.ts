import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EntryRef, Lang } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { dirOf } from '../lang-dir';
import { uniqueId } from '../unique-id';

@Component({
  selector: 'nb-related-list',
  imports: [RouterLink],
  templateUrl: './related-list.html',
  styleUrl: './related-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelatedList {
  readonly items = input.required<EntryRef[]>();

  protected readonly locale = inject(LocaleService);
  protected readonly titleId = uniqueId('nb-related-title');

  protected path(ref: EntryRef): string {
    return PATHS.entry(ref.lang, ref.type, ref.slug);
  }

  protected foreignLang(ref: EntryRef): Lang | null {
    return ref.lang !== this.locale.lang() ? ref.lang : null;
  }

  protected foreignDir(ref: EntryRef): 'rtl' | 'ltr' | null {
    return dirOf(this.foreignLang(ref));
  }
}
