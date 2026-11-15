import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  afterRenderEffect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TocItem } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { uniqueId } from '../unique-id';

/** Same breakpoint as the two-column post layout (pages/entry/entry-page.scss). */
const WIDE = '(min-width: 64rem)';

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
  private readonly details = viewChild<ElementRef<HTMLDetailsElement>>('details');

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    // Browser only (after-render hooks never run in SSR): wide screens show the TOC beside the text,
    // so open it there; small screens keep it closed above the article.
    afterRenderEffect(() => {
      const details = this.details()?.nativeElement;
      if (details && view?.matchMedia?.(WIDE).matches) details.open = true;
    });
  }
}
