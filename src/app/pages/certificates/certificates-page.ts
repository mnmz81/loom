import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
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

import { Button } from '@mushilu-san/ui/primitives';

/** `/:lang/certificates` — course certificates, newest first. */
@Component({
  selector: 'nb-certificates-page',
  imports: [TagList, Button],
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
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** Opens the large view (browser only: it runs from a click). */
  protected enlarge(card: CertificateCard): void {
    this.selected.set(card);
    this.dialog().nativeElement.showModal();
  }

  /** A click on the backdrop (the dialog element itself, outside its content) closes it. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.dialog().nativeElement.close();
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
