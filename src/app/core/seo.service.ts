import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DEFAULT_LANG, LANGS, type Lang } from './content.models';
import { PATHS } from './routes.const';
import { SITE, fileUrl, pageUrl } from './site.config';

export interface PageSeo {
  lang: Lang;
  title: string;
  description: string;
  /** In-app path of this page, e.g. PATHS.entry('he', 'post', 'x'). */
  path: string;
  /**
   * In-app path of this page per language it exists in (hreflang links). The current page
   * (`lang` → `path`) is always included, so pass only the translations if that is simpler.
   */
  alternates?: Partial<Record<Lang, string>>;
  /** Site-root relative image path ('/og/x.png'); defaults to SITE.defaultOgImage. */
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  jsonLd?: Record<string, unknown>;
}

/** '<title> · <site title>', or just the site title when they are equal. */
export function formatTitle(title: string, lang: Lang): string {
  const site = SITE.title[lang];
  return title === site ? title : `${title} · ${site}`;
}

const JSON_LD_ID = 'seo-jsonld';
const HREFLANG_SELECTOR = 'link[rel="alternate"][hreflang]';
const RSS_SELECTOR = 'link[rel="alternate"][type="application/rss+xml"]';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  set(page: PageSeo): void {
    const title = formatTitle(page.title, page.lang);
    const url = pageUrl(page.path);
    const image = fileUrl(page.image ?? SITE.defaultOgImage);
    const alternates: Partial<Record<Lang, string>> = { ...page.alternates, [page.lang]: page.path };

    this.titleService.setTitle(title);
    this.meta.updateTag({ name: 'description', content: page.description });

    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:type', content: page.type ?? 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE.title[page.lang] });
    this.meta.updateTag({ property: 'og:locale', content: SITE.ogLocale[page.lang] });
    this.replaceProperty(
      'og:locale:alternate',
      LANGS.filter((l) => l !== page.lang && alternates[l]).map((l) => SITE.ogLocale[l]),
    );

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.setOptionalProperty('article:published_time', page.publishedTime);
    this.setOptionalProperty('article:modified_time', page.modifiedTime);
    this.replaceProperty('article:tag', page.tags ?? []);

    this.setCanonical(url);
    this.setHreflang(alternates);
    this.setRss(page.lang);
    this.setJsonLd(page.jsonLd);
  }

  private setOptionalProperty(property: string, content: string | undefined): void {
    if (content) this.meta.updateTag({ property, content });
    else this.meta.removeTag(`property="${property}"`);
  }

  /** Replaces every `<meta property>` with one tag per value (repeatable OG properties). */
  private replaceProperty(property: string, values: readonly string[]): void {
    this.meta.getTags(`property="${property}"`).forEach((tag) => this.meta.removeTagElement(tag));
    for (const content of values) this.meta.addTag({ property, content }, true);
  }

  private setCanonical(url: string): void {
    this.upsertLink('link[rel="canonical"]', { rel: 'canonical', href: url });
  }

  private setHreflang(alternates: Partial<Record<Lang, string>>): void {
    this.document.head.querySelectorAll(HREFLANG_SELECTOR).forEach((link) => link.remove());
    for (const lang of LANGS) {
      const path = alternates[lang];
      if (path !== undefined) this.appendLink({ rel: 'alternate', hreflang: lang, href: pageUrl(path) });
    }
    const fallback = alternates[DEFAULT_LANG];
    if (fallback !== undefined) this.appendLink({ rel: 'alternate', hreflang: 'x-default', href: pageUrl(fallback) });
  }

  private setRss(lang: Lang): void {
    this.upsertLink(RSS_SELECTOR, {
      rel: 'alternate',
      type: 'application/rss+xml',
      title: SITE.title[lang],
      href: fileUrl(PATHS.rss(lang)),
    });
  }

  private upsertLink(selector: string, attrs: Record<string, string>): void {
    const link = this.document.head.querySelector<HTMLLinkElement>(selector) ?? this.appendLink({});
    for (const [name, value] of Object.entries(attrs)) link.setAttribute(name, value);
  }

  private appendLink(attrs: Record<string, string>): HTMLLinkElement {
    const link = this.document.createElement('link');
    for (const [name, value] of Object.entries(attrs)) link.setAttribute(name, value);
    this.document.head.appendChild(link);
    return link;
  }

  private setJsonLd(data: Record<string, unknown> | undefined): void {
    this.document.getElementById(JSON_LD_ID)?.remove();
    if (!data) return;
    const script = this.document.createElement('script');
    script.id = JSON_LD_ID;
    script.type = 'application/ld+json';
    // Escape '<' so a string value can never close the script element.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }
}
