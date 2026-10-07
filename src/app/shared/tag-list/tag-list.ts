import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';

@Component({
  selector: 'nb-tag-list',
  imports: [RouterLink],
  templateUrl: './tag-list.html',
  styleUrl: './tag-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagList {
  /** Tag keys (lowercase kebab-case). */
  readonly tags = input.required<string[]>();
  /** Display labels by key in the current language (LangIndex.tags); falls back to the key. */
  readonly labels = input<Record<string, string> | undefined>(undefined);

  protected readonly locale = inject(LocaleService);

  protected path(tag: string): string {
    return PATHS.tag(this.locale.lang(), tag);
  }

  protected label(tag: string): string {
    return this.labels()?.[tag] ?? tag;
  }
}
