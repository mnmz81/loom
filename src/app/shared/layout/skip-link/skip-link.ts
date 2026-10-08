import { ChangeDetectionStrategy, Component, DOCUMENT, inject, input } from '@angular/core';
import { LocaleService } from '../../../core/i18n/locale.service';

@Component({
  selector: 'nb-skip-link',
  templateUrl: './skip-link.html',
  styleUrl: './skip-link.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkipLink {
  /** id of the element to jump to (usually <main id="main">). */
  readonly target = input('main');

  protected readonly locale = inject(LocaleService);
  private readonly document = inject(DOCUMENT);

  /**
   * A bare "#main" href resolves against <base href="/loom/"> and would leave the page, so the click
   * moves focus itself. tabindex="-1" makes non-interactive targets focusable.
   */
  protected skip(event: Event): void {
    const target = this.document.getElementById(this.target());
    if (!target) return;
    event.preventDefault();
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus();
  }
}
