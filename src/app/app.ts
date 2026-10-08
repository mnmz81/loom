import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme.service';
import { SiteFooter } from './shared/layout/site-footer/site-footer';
import { SiteHeader } from './shared/layout/site-header/site-header';
import { SkipLink } from './shared/layout/skip-link/skip-link';

/** Layout shell: skip link, header, <main> with the routed page, footer. */
@Component({
  selector: 'nb-root',
  imports: [RouterOutlet, SkipLink, SiteHeader, SiteFooter],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly theme = inject(ThemeService);
}
