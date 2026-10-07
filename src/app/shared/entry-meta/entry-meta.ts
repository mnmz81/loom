import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { EntryMeta as EntryMetaModel } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';

/** Date line of an entry: published date, updated date, reading time (posts only). */
@Component({
  selector: 'nb-entry-meta',
  templateUrl: './entry-meta.html',
  styleUrl: './entry-meta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryMeta {
  readonly entry = input.required<EntryMetaModel>();

  protected readonly locale = inject(LocaleService);
  protected readonly date = computed(() => this.locale.formatDate(this.entry().date));
  protected readonly updated = computed(() => {
    const updated = this.entry().updated;
    return updated
      ? {
          iso: updated,
          text: this.locale.t('entry.updated', { date: this.locale.formatDate(updated) }),
        }
      : null;
  });
  protected readonly reading = computed(() =>
    this.entry().type === 'post'
      ? this.locale.t('entry.readingMinutes', { n: this.entry().readingMinutes })
      : null,
  );
}
