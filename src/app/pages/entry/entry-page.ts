import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input } from '@angular/core';
import { LANGS, type Entry, type LangIndex } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';
import { SITE, pageUrl } from '../../core/site.config';
import { ArticleBody } from '../../shared/article-body/article-body';
import { EntryMeta } from '../../shared/entry-meta/entry-meta';
import { RelatedList } from '../../shared/related-list/related-list';
import { SeriesNav } from '../../shared/series-nav/series-nav';
import { TagList } from '../../shared/tag-list/tag-list';
import { Toc } from '../../shared/toc/toc';
import { describeHtml } from '../seo-helpers';

/**
 * `/:lang/posts/:slug` and `/:lang/notes/:slug`. `entry` comes from `entryResolver` (always in the route
 * language), `index` from `langIndexResolver` (tag labels).
 */
@Component({
  selector: 'nb-entry-page',
  imports: [ArticleBody, EntryMeta, RelatedList, SeriesNav, TagList, Toc],
  templateUrl: './entry-page.html',
  styleUrl: './entry-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryPage {
  readonly entry = input.required<Entry>();
  readonly index = input.required<LangIndex>();

  protected readonly locale = inject(LocaleService);
  protected readonly typeLabel = computed(() => this.locale.t(`type.${this.entry().type}`));
  protected readonly tagLabels = computed(() => Object.fromEntries(this.index().tags.map((t) => [t.tag, t.label])));

  constructor() {
    const seo = inject(SeoService);
    const locale = this.locale;
    let ownAlternate: string | null = null;

    effect(() => {
      const entry = this.entry();
      const lang = locale.lang();
      const otherLang = locale.otherLang();
      const path = PATHS.entry(lang, entry.type, entry.slug);

      // Language switch target: the translation when it exists, else the other language's list
      // (where this entry shows as an "only in <lang>" card). There is no /<other>/ page for it.
      ownAlternate = entry.availableLangs.includes(otherLang)
        ? PATHS.entry(otherLang, entry.type, entry.slug)
        : entry.type === 'post'
          ? PATHS.posts(otherLang)
          : PATHS.notes(otherLang);
      locale.alternateUrl.set(ownAlternate);

      const alternates = Object.fromEntries(
        LANGS.filter((l) => entry.availableLangs.includes(l)).map((l) => [l, PATHS.entry(l, entry.type, entry.slug)]),
      );
      const description = entry.summary ?? describeHtml(entry.html);
      seo.set({
        lang,
        title: entry.title,
        description,
        path,
        alternates,
        type: 'article',
        publishedTime: entry.date,
        modifiedTime: entry.updated,
        tags: entry.tags,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: entry.title,
          description,
          inLanguage: lang,
          datePublished: entry.date,
          dateModified: entry.updated ?? entry.date,
          url: pageUrl(path),
          mainEntityOfPage: pageUrl(path),
          keywords: entry.tags.join(', '),
          author: { '@type': 'Person', name: SITE.author, url: SITE.url },
        },
      });
    });

    // Reused routes do not re-run langGuard, so clear our switch target when leaving the page.
    inject(DestroyRef).onDestroy(() => {
      if (ownAlternate !== null && locale.alternateUrl() === ownAlternate) locale.alternateUrl.set(null);
    });
  }
}
