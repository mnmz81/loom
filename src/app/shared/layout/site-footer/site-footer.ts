import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../../core/i18n/locale.service';
import { PATHS } from '../../../core/routes.const';
import { SITE, assetPath } from '../../../core/site.config';

@Component({
  selector: 'nb-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  protected readonly locale = inject(LocaleService);
  protected readonly year = new Date().getFullYear();
  protected readonly author = SITE.author;
  protected readonly repo = SITE.repo;
  protected readonly sections = computed(() => {
    const lang = this.locale.lang();
    return [
      { key: 'nav.posts', path: PATHS.posts(lang) },
      { key: 'nav.series', path: PATHS.seriesList(lang) },
      { key: 'nav.certificates', path: PATHS.certificates(lang) },
      { key: 'nav.search', path: PATHS.search(lang) },
    ] as const;
  });
  protected readonly accessibilityPath = computed(() => PATHS.accessibility(this.locale.lang()));
  /** Static file: relative href so <base href="/loom/"> applies (not a router link). */
  protected readonly rssHref = computed(() => assetPath(PATHS.rss(this.locale.lang())));
}
