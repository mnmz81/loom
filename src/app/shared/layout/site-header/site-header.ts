import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  computed,
  type Signal,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, isActive } from '@angular/router';
import { filter, map } from 'rxjs';
import type { DictKey } from '../../../core/i18n/i18n.types';
import { LocaleService } from '../../../core/i18n/locale.service';
import { PATHS, swapLang } from '../../../core/routes.const';
import { SITE } from '../../../core/site.config';

interface NavLink {
  key: DictKey;
  path: string;
  /** Current page or section; a signal, so the OnPush header follows navigation. */
  active: Signal<boolean>;
  /** aria-keyshortcuts value, when the link has a keyboard shortcut. */
  shortcut?: string;
}

import { Button } from '@mushilu-san/ui/primitives';
import { NavLink as MuiNavLink } from '@mushilu-san/ui/navigation';

@Component({
  selector: 'nb-site-header',
  imports: [RouterLink, Button, MuiNavLink],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()', '(document:keydown)': 'onShortcut($event)' },
})
export class SiteHeader {
  readonly theme = input.required<'light' | 'dark'>();
  readonly themeToggle = output<void>();

  protected readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  /** router.url is not a signal: track it so the language switch follows navigation under OnPush. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly siteTitle = computed(() => SITE.title[this.locale.lang()]);
  protected readonly homePath = computed(() => PATHS.home(this.locale.lang()));
  protected readonly links = computed<NavLink[]>(() => {
    const lang = this.locale.lang();
    const link = (key: DictKey, path: string, exact = false, shortcut?: string): NavLink => ({
      key,
      path,
      shortcut,
      active: isActive(path, this.router, {
        paths: exact ? 'exact' : 'subset',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored',
      }),
    });
    return [
      link('nav.home', PATHS.home(lang), true),
      link('nav.posts', PATHS.posts(lang)),
      link('nav.series', PATHS.seriesList(lang)),
      link('nav.certificates', PATHS.certificates(lang)),
      link('nav.search', PATHS.search(lang), false, 'Control+K Meta+K'),
    ];
  });

  protected readonly otherLang = this.locale.otherLang;
  protected readonly switchUrl = computed(
    () => this.locale.alternateUrl() ?? swapLang(this.url(), this.locale.otherLang()),
  );
  protected readonly otherLangName = computed(() =>
    this.locale.t(`lang.name.${this.locale.otherLang()}`),
  );
  protected readonly themeLabel = computed(() =>
    this.locale.t(this.theme() === 'dark' ? 'theme.toLight' : 'theme.toDark'),
  );

  protected readonly menuOpen = signal(false);
  private readonly menuButton = viewChild.required('menuButton', { read: ElementRef<HTMLButtonElement> });

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  /** Ctrl/⌘+K opens search from any page and focuses the field. No single-key shortcut: WCAG 2.1.4. */
  protected onShortcut(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey) return;
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
    event.preventDefault();
    this.closeMenu();
    void this.router
      .navigateByUrl(PATHS.search(this.locale.lang()))
      .then(() => this.document.getElementById('search-input')?.focus());
  }

  protected onEscape(): void {
    if (!this.menuOpen()) return;
    this.closeMenu();
    this.menuButton().nativeElement.focus();
  }
}
