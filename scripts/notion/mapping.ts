// Maps Notion database pages to content/<kind>s/<slug>/<lang>.md (see docs/contracts/content-format.md).
// Pure functions only: no network, no file system.
import { extname } from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

export type Kind = 'post' | 'note';
export type Lang = 'he' | 'en';

/** The subset of a Notion page object this sync reads. */
export interface NotionPageLike {
  id: string;
  url?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
}

export interface SeriesRef {
  key: string;
  order: number;
}

/** Frontmatter exactly as written to disk (strict contract keys only). */
export interface Frontmatter {
  title: string;
  summary?: string;
  date: string;
  updated?: string;
  tags: string[];
  cover?: string;
  series?: SeriesRef;
}

export interface NotionEntry {
  id: string;
  /** Human-readable page reference for error messages: `"Title" (url)`. */
  label: string;
  kind: Kind;
  lang: Lang;
  slug: string;
  frontmatter: Frontmatter;
}

export interface ImageDownload {
  url: string;
  file: string; // relative to public/, e.g. 'images/my-post/he-1.png'
}

/** Thrown by readEntry with every problem found on one page. */
export class PageError extends Error {
  constructor(
    readonly label: string,
    readonly issues: string[],
  ) {
    super(`${label}:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'PageError';
  }
}

export const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const IMAGE_EXT = /^\.(png|jpe?g|gif|webp|svg|avif)$/;
const KINDS: Record<string, Kind> = { Post: 'post', Note: 'note' };
const LANGS: readonly Lang[] = ['he', 'en'];
export const SUMMARY_MAX = 200;

// ---------- Local contract schema (mirrors docs/contracts/content-format.md) ----------

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) &&
      new Date(`${s}T00:00:00Z`).toISOString().startsWith(s),
    'is not a real date',
  );
const kebab = z.string().regex(KEBAB, 'must be lowercase Latin kebab-case');
const tags = z.array(kebab).min(1, 'at least one tag is required');

export const postFrontmatter = z
  .strictObject({
    title: z.string().trim().min(1, 'is required'),
    summary: z
      .string()
      .trim()
      .min(1, 'is required for posts')
      .max(SUMMARY_MAX, `must be at most ${SUMMARY_MAX} characters`),
    date: isoDay,
    updated: isoDay.optional(),
    tags,
    draft: z.boolean().optional(),
    cover: z.string().startsWith('/images/', 'must start with /images/').optional(),
    series: z
      .strictObject({ key: kebab, order: z.number().int().min(1, 'must be ≥ 1') })
      .optional(),
  })
  .refine((fm) => !fm.updated || fm.updated >= fm.date, {
    message: 'must not be before Date',
    path: ['updated'],
  });

export const noteFrontmatter = z.strictObject({
  title: z.string().trim().min(1, 'is required'),
  date: isoDay,
  updated: isoDay.optional(),
  tags,
  draft: z.boolean().optional(),
});

/** Contract key → Notion property name, for error messages. */
const PROPERTY: Record<string, string> = {
  title: 'Title',
  summary: 'Summary',
  date: 'Date',
  updated: 'Updated',
  tags: 'Tags',
  cover: 'Cover',
  series: 'Series',
  'series.key': 'Series',
  'series.order': 'Series order',
};

// ---------- Property readers ----------

/* eslint-disable @typescript-eslint/no-explicit-any */
const plain = (parts: any[] | undefined) => (parts ?? []).map((p) => p.plain_text ?? '').join('');
const text = (p: any): string =>
  (p?.type === 'title' ? plain(p.title) : p?.type === 'rich_text' ? plain(p.rich_text) : '').trim();
const option = (p: any): string =>
  (
    (p?.type === 'select' ? p.select?.name : p?.type === 'status' ? p.status?.name : '') ?? ''
  ).trim();
const options = (p: any): string[] =>
  p?.type === 'multi_select' ? p.multi_select.map((o: any) => String(o.name)) : [];
const day = (p: any): string =>
  p?.type === 'date' && p.date?.start ? String(p.date.start).slice(0, 10) : '';
const num = (p: any): number | undefined =>
  p?.type === 'number' && typeof p.number === 'number' ? p.number : undefined;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Lowercase Latin kebab-case; non-Latin characters are dropped. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** True when the title has only Latin (ASCII after removing accents) characters. */
export function isLatin(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(value.normalize('NFKD').replace(/\p{M}/gu, ''));
}

export function pageLabel(page: NotionPageLike): string {
  const title = text(page.properties?.['Title']);
  return `"${title || '(untitled)'}" (${page.url ?? page.id})`;
}

/** True when the page's Status is Published (or the page has no Status property, e.g. already filtered). */
export function isPublished(page: NotionPageLike): boolean {
  const status = page.properties?.['Status'];
  return !status || option(status) === 'Published';
}

/** Reads and validates one page. Throws PageError listing every problem on the page. */
export function readEntry(page: NotionPageLike): NotionEntry {
  const p = page.properties ?? {};
  const label = pageLabel(page);
  const issues: string[] = [];

  const title = text(p['Title']);
  const kindName = option(p['Kind']);
  const kind = KINDS[kindName];
  if (!kind) issues.push(`Kind must be Post or Note (got "${kindName}")`);
  const langName = option(p['Lang']);
  const lang = LANGS.find((l) => l === langName);
  if (!lang) issues.push(`Lang must be he or en (got "${langName}")`);

  // Slug: explicit Slug wins; otherwise derived from a Latin title.
  const rawSlug = text(p['Slug']);
  let slug = '';
  if (rawSlug) {
    slug = slugify(rawSlug);
    if (!KEBAB.test(slug))
      issues.push(`Slug "${rawSlug}" is invalid; use lowercase Latin kebab-case (e.g. my-post)`);
  } else if (title && !isLatin(title)) {
    issues.push(
      'Slug is required when the title is not Latin (e.g. Hebrew); set it to lowercase Latin kebab-case',
    );
  } else {
    slug = slugify(title);
    if (!KEBAB.test(slug))
      issues.push(`Slug could not be derived from the title; set the Slug property to kebab-case`);
  }

  const rawTags = options(p['Tags']);
  const tagList = [...new Set(rawTags.map(slugify))];
  rawTags.forEach((t) => {
    if (!KEBAB.test(slugify(t)))
      issues.push(`Tag "${t}" is not Latin; tags become kebab-case keys (e.g. rust)`);
  });

  const summary = text(p['Summary']);
  const seriesKey = option(p['Series']);
  const seriesOrder = num(p['Series order']);
  const cover = text(p['Cover']);
  const updated = day(p['Updated']);

  const frontmatter: Frontmatter = {
    title,
    ...(kind === 'post' ? { summary } : {}),
    date: day(p['Date']),
    ...(updated ? { updated } : {}),
    tags: tagList.filter((t) => KEBAB.test(t)),
  };
  if (kind === 'post') {
    if (cover) frontmatter.cover = cover;
    if (seriesKey && seriesOrder === undefined)
      issues.push('Series order is required when Series is set');
    if (!seriesKey && seriesOrder !== undefined)
      issues.push('Series order is set but Series is empty');
    if (seriesKey && seriesOrder !== undefined)
      frontmatter.series = { key: seriesKey, order: seriesOrder };
  } else if (kind === 'note') {
    if (seriesKey || seriesOrder !== undefined)
      issues.push('Series / Series order are only for posts; clear them on notes');
    if (cover) issues.push('Cover is only for posts; clear it on notes');
    // Summary is ignored for notes (the contract has no summary for notes).
  }

  if (kind) {
    const schema = kind === 'post' ? postFrontmatter : noteFrontmatter;
    const parsed = schema.safeParse(frontmatter);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        if (key === 'tags' && rawTags.length > 0 && frontmatter.tags.length === 0) continue; // already reported per tag
        if (key === 'date' && !frontmatter.date) {
          issues.push('Date is required');
          continue;
        }
        issues.push(`${PROPERTY[key] ?? key} ${issue.message}`);
      }
    }
  }

  if (issues.length || !kind || !lang) throw new PageError(label, [...new Set(issues)]);
  return { id: page.id, label, kind, lang, slug, frontmatter };
}

/** Relative file path (from the content dir) for an entry: posts/<slug>/<lang>.md. */
export function entryPath(entry: Pick<NotionEntry, 'kind' | 'slug' | 'lang'>): string {
  return `${entry.kind}s/${entry.slug}/${entry.lang}.md`;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Cross-page checks: duplicate slug+kind+lang, same slug as post and note, translation shared facts
 * (date, tags, series, cover) and series order uniqueness. Returns one message per problem.
 */
export function checkEntries(entries: NotionEntry[]): string[] {
  const errors: string[] = [];
  const bySlug = new Map<string, NotionEntry[]>();
  for (const e of entries) bySlug.set(e.slug, [...(bySlug.get(e.slug) ?? []), e]);

  for (const [slug, group] of bySlug) {
    const kinds = new Set(group.map((e) => e.kind));
    if (kinds.size > 1) {
      errors.push(
        `Slug "${slug}" is used by both a Post and a Note: ${group.map((e) => e.label).join(', ')}`,
      );
      continue;
    }
    for (const lang of LANGS) {
      const dupes = group.filter((e) => e.lang === lang);
      if (dupes.length > 1) {
        errors.push(
          `Duplicate ${dupes[0].kind} "${slug}" in ${lang}: ${dupes.map((e) => e.label).join(' and ')} (set a different Slug or Lang)`,
        );
      }
    }
    const he = group.find((e) => e.lang === 'he');
    const en = group.find((e) => e.lang === 'en');
    if (he && en) {
      for (const key of ['date', 'tags', 'series', 'cover'] as const) {
        if (!same(he.frontmatter[key], en.frontmatter[key])) {
          const name = key === 'series' ? 'Series / Series order' : (PROPERTY[key] ?? key);
          errors.push(
            `Translations of "${slug}" must share ${name}: ${he.label} and ${en.label} differ`,
          );
        }
      }
    }
  }

  // Series order: unique per series across different slugs (translations share it).
  const seen = new Map<string, NotionEntry>();
  for (const e of entries) {
    const s = e.frontmatter.series;
    if (!s) continue;
    const key = `${s.key}#${s.order}`;
    const other = seen.get(key);
    if (other && other.slug !== e.slug) {
      errors.push(
        `Series "${s.key}" order ${s.order} is used twice: ${other.label} and ${e.label}`,
      );
    } else if (!other) seen.set(key, e);
  }
  return errors;
}

export function toMarkdownFile(entry: NotionEntry, body: string): string {
  const fm = entry.frontmatter;
  // Fixed key order; optional keys only when set.
  const data: Record<string, unknown> = { title: fm.title };
  if (fm.summary !== undefined) data['summary'] = fm.summary;
  data['date'] = fm.date;
  if (fm.updated) data['updated'] = fm.updated;
  data['tags'] = fm.tags;
  if (fm.cover) data['cover'] = fm.cover;
  if (fm.series) data['series'] = { key: fm.series.key, order: fm.series.order };
  return matter.stringify(body.trim() ? `\n${body.trim()}\n` : '', data);
}

/**
 * Rewrites remote images (`![alt](https://...)`) to `/images/<slug>/<lang>-<n>.<ext>` and lists the downloads.
 * Language-prefixed names keep a post's he and en images from overwriting each other.
 */
export function rewriteImages(
  markdown: string,
  slug: string,
  lang: Lang,
): { markdown: string; downloads: ImageDownload[] } {
  const downloads: ImageDownload[] = [];
  const rewritten = markdown.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g,
    (match, alt: string, url: string) => {
      let ext = '';
      try {
        ext = extname(new URL(url).pathname).toLowerCase();
      } catch {
        return match;
      }
      const file = `images/${slug}/${lang}-${downloads.length + 1}${IMAGE_EXT.test(ext) ? ext.replace('.jpeg', '.jpg') : '.png'}`;
      downloads.push({ url, file });
      return `![${alt}](/${file})`;
    },
  );
  return { markdown: rewritten, downloads };
}
