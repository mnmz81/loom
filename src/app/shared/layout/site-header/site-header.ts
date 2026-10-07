import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import type { DictKey } from '../../../core/i18n/i18n.types';
import { LocaleService } from '../../../core/i18n/locale.service';
import { PATHS, swapLang } from '../../../core/routes.const';
import { SITE } from '../../../core/site.config';

interface NavLink {
  key: DictKey;
  path: string;
  exact: boolean;
}

@Component({
  selector: 'nb-site-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class SiteHeader {
  readonly theme = input.required<'light' | 'dark'>();
  readonly themeToggle = output<void>();

  protected readonly locale = inject(LocaleService);
  private readonly router = inject(Router);

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
    return [
      { key: 'nav.home', path: PATHS.home(lang), exact: true },
      { key: 'nav.posts', path: PATHS.posts(lang), exact: false },
      { key: 'nav.notes', path: PATHS.notes(lang), exact: false },
      { key: 'nav.series', path: PATHS.seriesList(lang), exact: false },
      { key: 'nav.search', path: PATHS.search(lang), exact: false },
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
  private readonly menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menuButton');

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected onEscape(): void {
    if (!this.menuOpen()) return;
    this.closeMenu();
    this.menuButton().nativeElement.focus();
  }
}
