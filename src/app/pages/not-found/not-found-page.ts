import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { type Lang } from '../../core/content.models';
import { en } from '../../core/i18n/en';
import { he } from '../../core/i18n/he';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';

const ROBOTS = 'name="robots"';

/**
 * 404 for `/404`, unknown paths and unknown `/:lang/...` paths. GitHub Pages serves the prerendered `/404`
 * for any unknown URL, whatever language the visitor expected, so the other language is offered too.
 */
@Component({
  selector: 'nb-not-found-page',
  imports: [RouterLink],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-pagefind-ignore': '' },
})
export class NotFoundPage {
  protected readonly locale = inject(LocaleService);
  protected readonly paths = PATHS;
  protected readonly otherLang = this.locale.otherLang;
  protected readonly other = computed(() => {
    const lang: Lang = this.locale.otherLang();
    const dict = lang === 'he' ? he : en;
    return { lang, title: dict['notFound.title'], home: dict['notFound.home'], path: PATHS.home(lang) };
  });

  constructor() {
    const seo = inject(SeoService);
    const meta = inject(Meta);
    effect(() => {
      const lang = this.locale.lang();
      seo.set({
        lang,
        title: this.locale.t('notFound.title'),
        description: this.locale.t('notFound.body'),
        path: PATHS.notFound(),
      });
      meta.updateTag({ name: 'robots', content: 'noindex' });
    });
    inject(DestroyRef).onDestroy(() => meta.removeTag(ROBOTS));
  }
}
