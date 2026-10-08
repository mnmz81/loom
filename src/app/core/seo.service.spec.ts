import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { PATHS } from './routes.const';
import { SeoService, formatTitle } from './seo.service';

const BASE = 'https://mnmz81.github.io/loom';

const meta = (attr: 'name' | 'property', key: string) =>
  document.head.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content') ?? undefined;
const metas = (property: string) =>
  Array.from(document.head.querySelectorAll(`meta[property="${property}"]`)).map((m) => m.getAttribute('content'));
const hreflangs = () =>
  Object.fromEntries(
    Array.from(document.head.querySelectorAll('link[rel="alternate"][hreflang]')).map((l) => [
      l.getAttribute('hreflang'),
      l.getAttribute('href'),
    ]),
  );

describe('formatTitle', () => {
  it('keeps the site title unchanged', () => {
    expect(formatTitle('לום', 'he')).toBe('לום');
    expect(formatTitle('Loom', 'en')).toBe('Loom');
  });

  it('suffixes page titles with the site title of the language', () => {
    expect(formatTitle('פוסטים', 'he')).toBe('פוסטים · לום');
    expect(formatTitle('Posts', 'en')).toBe('Posts · Loom');
  });
});

describe('SeoService', () => {
  let seo: SeoService;
  beforeEach(() => {
    document.head
      .querySelectorAll('meta, link[rel="canonical"], link[rel="alternate"], script[type="application/ld+json"]')
      .forEach((n) => n.remove());
    seo = TestBed.inject(SeoService);
  });

  it('sets title, description and canonical with a trailing slash under the base path', () => {
    seo.set({ lang: 'en', title: 'Posts', description: 'All posts', path: PATHS.posts('en') });
    expect(TestBed.inject(Title).getTitle()).toBe('Posts · Loom');
    expect(meta('name', 'description')).toBe('All posts');
    const canonicals = document.head.querySelectorAll('link[rel="canonical"]');
    expect(canonicals).toHaveLength(1);
    expect(canonicals[0].getAttribute('href')).toBe(`${BASE}/en/posts/`);
  });

  it('updates the single canonical link between pages', () => {
    seo.set({ lang: 'he', title: 'a', description: 'd', path: '/he' });
    seo.set({ lang: 'he', title: 'b', description: 'd', path: '/he/notes' });
    const canonicals = document.head.querySelectorAll('link[rel="canonical"]');
    expect(canonicals).toHaveLength(1);
    expect(canonicals[0].getAttribute('href')).toBe(`${BASE}/he/notes/`);
  });

  it('sets Open Graph and Twitter tags with an absolute default image', () => {
    seo.set({ lang: 'he', title: 'לום', description: 'תיאור', path: '/he' });
    expect(meta('property', 'og:title')).toBe('לום');
    expect(meta('property', 'og:description')).toBe('תיאור');
    expect(meta('property', 'og:url')).toBe(`${BASE}/he/`);
    expect(meta('property', 'og:type')).toBe('website');
    expect(meta('property', 'og:image')).toBe(`${BASE}/og/default.png`);
    expect(meta('property', 'og:site_name')).toBe('לום');
    expect(meta('property', 'og:locale')).toBe('he_IL');
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
    expect(meta('name', 'twitter:title')).toBe('לום');
    expect(meta('name', 'twitter:description')).toBe('תיאור');
    expect(meta('name', 'twitter:image')).toBe(`${BASE}/og/default.png`);
  });

  it('writes hreflang alternates for every language plus x-default → he', () => {
    seo.set({
      lang: 'en',
      title: 'Rust: borrowing',
      description: 'd',
      path: PATHS.entry('en', 'post', 'rust-borrowing'),
      alternates: { he: PATHS.entry('he', 'post', 'rust-borrowing') },
    });
    expect(hreflangs()).toEqual({
      he: `${BASE}/he/posts/rust-borrowing/`,
      en: `${BASE}/en/posts/rust-borrowing/`,
      'x-default': `${BASE}/he/posts/rust-borrowing/`,
    });
    expect(meta('property', 'og:locale')).toBe('en_US');
    expect(metas('og:locale:alternate')).toEqual(['he_IL']);
  });

  it('removes stale alternates; a single-language page has no x-default unless it is he', () => {
    seo.set({ lang: 'he', title: 'x', description: 'd', path: '/he/posts/a', alternates: { en: '/en/posts/a' } });
    seo.set({ lang: 'en', title: 'zsh', description: 'd', path: '/en/notes/zsh-history-search' });
    expect(hreflangs()).toEqual({ en: `${BASE}/en/notes/zsh-history-search/` });
    expect(metas('og:locale:alternate')).toEqual([]);

    seo.set({ lang: 'he', title: 'own', description: 'd', path: '/he/posts/rust-ownership' });
    expect(hreflangs()).toEqual({
      he: `${BASE}/he/posts/rust-ownership/`,
      'x-default': `${BASE}/he/posts/rust-ownership/`,
    });
  });

  it('always includes the current page in the alternates', () => {
    seo.set({ lang: 'he', title: 'x', description: 'd', path: '/he/posts', alternates: { he: '/wrong', en: '/en/posts' } });
    expect(hreflangs()['he']).toBe(`${BASE}/he/posts/`);
    expect(hreflangs()['en']).toBe(`${BASE}/en/posts/`);
  });

  it('points a single RSS alternate link at the feed of the page language', () => {
    seo.set({ lang: 'he', title: 'x', description: 'd', path: '/he' });
    seo.set({ lang: 'en', title: 'x', description: 'd', path: '/en' });
    const feeds = document.head.querySelectorAll('link[rel="alternate"][type="application/rss+xml"]');
    expect(feeds).toHaveLength(1);
    expect(feeds[0].getAttribute('href')).toBe(`${BASE}/rss-en.xml`);
    expect(feeds[0].getAttribute('title')).toBe('Loom');
    expect(feeds[0].hasAttribute('hreflang')).toBe(false);
  });

  it('sets article meta and replaces tags between pages', () => {
    seo.set({
      lang: 'he',
      title: 'Post',
      description: 'd',
      path: '/he/posts/x',
      type: 'article',
      image: '/og/he/posts/x.png',
      publishedTime: '2026-10-01',
      modifiedTime: '2026-10-02',
      tags: ['rust', 'git'],
    });
    expect(meta('property', 'og:type')).toBe('article');
    expect(meta('property', 'og:image')).toBe(`${BASE}/og/he/posts/x.png`);
    expect(meta('property', 'article:published_time')).toBe('2026-10-01');
    expect(meta('property', 'article:modified_time')).toBe('2026-10-02');
    expect(metas('article:tag')).toEqual(['rust', 'git']);

    seo.set({ lang: 'he', title: 'About', description: 'd', path: '/he' });
    expect(metas('article:tag')).toEqual([]);
    expect(meta('property', 'article:published_time')).toBeUndefined();
    expect(meta('property', 'article:modified_time')).toBeUndefined();
  });

  it('writes a single JSON-LD script and removes it when absent', () => {
    seo.set({ lang: 'he', title: 'a', description: 'd', path: '/he', jsonLd: { '@type': 'Blog', name: 'A' } });
    seo.set({ lang: 'he', title: 'a', description: 'd', path: '/he', jsonLd: { '@type': 'Blog', name: 'B' } });
    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0].textContent ?? '')).toEqual({ '@type': 'Blog', name: 'B' });

    seo.set({ lang: 'he', title: 'a', description: 'd', path: '/he' });
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('escapes "<" inside JSON-LD', () => {
    seo.set({ lang: 'en', title: 'a', description: 'd', path: '/en', jsonLd: { name: 'A </script>' } });
    const script = document.head.querySelector('script[type="application/ld+json"]');
    expect(script?.textContent).not.toContain('</script>');
    expect(JSON.parse(script?.textContent ?? '')).toEqual({ name: 'A </script>' });
  });
});
