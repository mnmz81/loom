import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import type { Certificate, CertificateIndex, LangIndex } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';
import { assetPath } from '../../core/site.config';
import { TagList } from '../../shared/tag-list/tag-list';
import { allLangPaths } from '../seo-helpers';

interface CertificateCard extends Certificate {
  src: string;
  href: string;
  alt: string;
  enlarge: string;
  dateText: string;
}

import { Dialog } from '@mushilu-san/ui/feedback';

import { Empty } from '@mushilu-san/ui/data-display';
/** `/:lang/certificates` — course certificates, newest first. */
@Component({
  selector: 'nb-certificates-page',
  imports: [TagList, Dialog, Empty],
  templateUrl: './certificates-page.html',
  styleUrl: './certificates-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-pagefind-ignore': '' },
})
export class CertificatesPage {
  readonly certificates = input.required<CertificateIndex>();
  readonly index = input.required<LangIndex>();

  protected readonly locale = inject(LocaleService);
  protected readonly tagLabels = computed(() => Object.fromEntries(this.index().tags.map((t) => [t.tag, t.label])));
  protected readonly cards = computed<CertificateCard[]>(() =>
    this.certificates().map((c) => ({
      ...c,
      src: assetPath(c.image),
      href: assetPath(c.file ?? c.image),
      alt: this.locale.t('certificates.image', { title: c.title }),
      enlarge: this.locale.t('certificates.enlarge', { title: c.title }),
      dateText: this.locale.formatDate(c.date),
    })),
  );

  protected readonly selected = signal<CertificateCard | null>(null);
  protected readonly dialogOpen = signal(false);

  /** Opens the large view (browser only: it runs from a click). */
  protected enlarge(card: CertificateCard): void {
    this.selected.set(card);
    this.dialogOpen.set(true);
  }

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const lang = this.locale.lang();
      seo.set({
        lang,
        title: this.locale.t('certificates.title'),
        description: this.locale.t('certificates.title'),
        path: PATHS.certificates(lang),
        alternates: allLangPaths(PATHS.certificates),
      });
    });
  }
}
