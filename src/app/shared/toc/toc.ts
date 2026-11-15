import { ChangeDetectionStrategy, Component, DOCUMENT, afterNextRender, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccordionItem } from '@mushilu-san/ui/data-display';
import type { TocItem } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';

/** Same breakpoint as the two-column post layout (pages/entry/entry-page.scss). */
const WIDE = '(min-width: 64rem)';

@Component({
  selector: 'nb-toc',
  imports: [RouterLink, AccordionItem],
  templateUrl: './toc.html',
  styleUrl: './toc.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toc {
  readonly items = input.required<TocItem[]>();

  protected readonly locale = inject(LocaleService);
  protected readonly open = signal(false);

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    // Browser only (after-render hooks never run in SSR): wide screens show the TOC beside the text,
    // so open it there; small screens keep it closed above the article.
    afterNextRender(() => {
      if (view?.matchMedia?.(WIDE).matches) this.open.set(true);
    });
  }
}
