import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterRenderEffect,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { LocaleService } from '../../core/i18n/locale.service';

const COPIED_MS = 2000;
const WRAPPER_CLASS = 'nb-code';
const BUTTON_CLASS = 'nb-code__copy';
const COPIED_CLASS = 'is-copied';

/**
 * Renders an entry's pipeline HTML. In the browser, wraps every <pre> with a copy-to-clipboard button
 * (styles: src/styles/_prose.scss, global because this DOM is outside view encapsulation).
 */
@Component({
  selector: 'nb-article-body',
  templateUrl: './article-body.html',
  styleUrl: './article-body.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleBody {
  readonly html = input.required<string>();

  private readonly locale = inject(LocaleService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');
  private readonly timers = new Map<HTMLButtonElement, ReturnType<typeof setTimeout>>();

  // Trusted: `html` is Entry.html, produced at build time by this repo's own content pipeline from the
  // repo's Markdown (raw HTML disabled, Shiki-highlighted). Bypassing keeps Shiki's inline
  // --shiki-light/--shiki-dark style variables, which Angular's sanitizer would strip.
  protected readonly safeHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.html()));

  constructor() {
    // Runs only in the browser (after-render hooks never run during SSR/prerender), after every render
    // that changed the HTML (innerHTML replaced → buttons gone) or the language (labels).
    afterRenderEffect(() => {
      this.html();
      this.addCopyButtons(this.locale.t('code.copy'));
    });
    inject(DestroyRef).onDestroy(() => {
      this.timers.forEach((timer) => clearTimeout(timer));
      this.timers.clear();
    });
  }

  private get clipboard(): Clipboard | undefined {
    return this.document.defaultView?.navigator.clipboard;
  }

  private addCopyButtons(label: string): void {
    if (!this.isBrowser || !this.clipboard) return;
    const root = this.body().nativeElement;
    for (const pre of Array.from(root.querySelectorAll('pre'))) {
      if (pre.parentElement?.classList.contains(WRAPPER_CLASS)) continue;
      const wrapper = this.document.createElement('div');
      wrapper.className = WRAPPER_CLASS;
      wrapper.setAttribute('dir', 'ltr');
      const button = this.document.createElement('button');
      button.type = 'button';
      button.className = BUTTON_CLASS;
      const text = this.document.createElement('span');
      text.setAttribute('aria-live', 'polite');
      button.append(text);
      pre.replaceWith(wrapper);
      wrapper.append(pre, button);
    }
    for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>(`.${BUTTON_CLASS}`))) {
      if (!this.timers.has(button)) this.setLabel(button, label);
    }
  }

  /** One delegated listener (removed by Angular with the view) instead of one per button. */
  protected onClick(event: Event): void {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>(`.${BUTTON_CLASS}`);
    const pre = button?.parentElement?.querySelector('pre');
    const clipboard = this.clipboard;
    if (!button || !pre || !clipboard) return;
    clipboard.writeText(pre.textContent ?? '').then(
      () => this.markCopied(button),
      () => undefined, // permission denied / insecure context: leave the button as is
    );
  }

  private markCopied(button: HTMLButtonElement): void {
    clearTimeout(this.timers.get(button));
    button.classList.add(COPIED_CLASS);
    this.setLabel(button, this.locale.t('code.copied'));
    this.timers.set(
      button,
      setTimeout(() => {
        this.timers.delete(button);
        button.classList.remove(COPIED_CLASS);
        this.setLabel(button, this.locale.t('code.copy'));
      }, COPIED_MS),
    );
  }

  private setLabel(button: HTMLButtonElement, label: string): void {
    const text = button.firstElementChild;
    if (text && text.textContent !== label) text.textContent = label;
  }
}
