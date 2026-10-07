// Reads content/{posts,notes}/<slug>/{he,en}.md, content/series/*.yaml and content/tags.yaml,
// validates them per docs/contracts/content-format.md and writes the JSON described in
// src/app/core/content.models.ts. All validation errors are collected and thrown together.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import YAML from 'yaml';
import {
  type Entry,
  type EntryMeta,
  type EntryRef,
  type EntryType,
  type Lang,
  LANGS,
  type LangIndex,
  type SeriesIndex,
  type SeriesNav,
  type SeriesRef,
  type TagCount,
  TYPE_SEGMENT,
} from '../../src/app/core/content.models';
import { createRenderer, type RenderedMarkdown } from './markdown';
import { formatZodError, isKebab, noteFrontmatter, postFrontmatter, type SeriesFile, seriesFile, type TagsFile, tagsFile } from './schema';

export interface BuildOptions {
  contentDir: string;
  outDir: string;
  /** Include `draft: true` translations (INCLUDE_DRAFTS=1). */
  includeDrafts: boolean;
  /** Clock for `generatedAt` (tests). */
  now?: () => Date;
}

export interface BuildResult {
  indexes: Record<Lang, LangIndex>;
  /** Every written entry JSON, grouped by language (LANGS order), then index order. */
  entries: Entry[];
  series: SeriesIndex;
}

/** Normalized frontmatter of a post or a note (notes never have summary/cover/series). */
interface Frontmatter {
  title: string;
  summary?: string;
  date: string;
  updated?: string;
  tags: string[];
  draft: boolean;
  cover?: string;
  series?: SeriesRef;
}

interface Source {
  file: string;
  fm: Frontmatter;
  body: string;
}

interface RawEntry {
  type: EntryType;
  slug: string;
  dir: string;
  sources: Partial<Record<Lang, Source>>;
}

interface Item {
  type: EntryType;
  slug: string;
  langs: Lang[];
  texts: Partial<Record<Lang, { fm: Frontmatter; rendered: RenderedMarkdown }>>;
  date: string;
  tags: string[];
  series?: SeriesRef;
}

const ENTRY_FILES: Record<string, Lang> = { 'he.md': 'he', 'en.md': 'en' };
const SHARED_FACTS = ['date', 'tags', 'series', 'cover'] as const;

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const isDir = (path: string) => statSync(path).isDirectory();
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Visible names in a directory, sorted; [] when it does not exist. Hidden files (.DS_Store) are ignored. */
function list(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith('.'))
    .sort(compare);
}

function loadTags(contentDir: string, errors: string[]): TagsFile {
  const file = join(contentDir, 'tags.yaml');
  if (!existsSync(file)) return {};
  try {
    const parsed = tagsFile.safeParse(YAML.parse(readFileSync(file, 'utf8')));
    if (parsed.success) return parsed.data;
    errors.push(`${file}: ${formatZodError(parsed.error)}`);
  } catch (error) {
    errors.push(`${file}: ${message(error)}`);
  }
  return {};
}

function loadSeries(contentDir: string, errors: string[]): Map<string, SeriesFile> {
  const series = new Map<string, SeriesFile>();
  const dir = join(contentDir, 'series');
  for (const name of list(dir)) {
    const file = join(dir, name);
    if (!name.endsWith('.yaml') || isDir(file)) {
      errors.push(`${file}: unexpected file (series are content/series/<key>.yaml)`);
      continue;
    }
    const key = name.slice(0, -'.yaml'.length);
    if (!isKebab(key)) {
      errors.push(`${file}: file name must be a lowercase Latin kebab-case series key`);
      continue;
    }
    try {
      const parsed = seriesFile.safeParse(YAML.parse(readFileSync(file, 'utf8')));
      if (parsed.success) series.set(key, parsed.data);
      else errors.push(`${file}: ${formatZodError(parsed.error)}`);
    } catch (error) {
      errors.push(`${file}: ${message(error)}`);
    }
  }
  return series;
}

function parseSource(type: EntryType, file: string, errors: string[]): Source | undefined {
  try {
    const { data, content } = matter(readFileSync(file, 'utf8'));
    const parsed = (type === 'post' ? postFrontmatter : noteFrontmatter).safeParse(data);
    if (parsed.success) return { file, fm: parsed.data, body: content };
    errors.push(`${file}: ${formatZodError(parsed.error)}`);
  } catch (error) {
    errors.push(`${file}: ${message(error)}`);
  }
  return undefined;
}

function loadEntries(contentDir: string, errors: string[]): RawEntry[] {
  const entries: RawEntry[] = [];
  for (const type of ['post', 'note'] as const) {
    const root = join(contentDir, TYPE_SEGMENT[type]);
    for (const slug of list(root)) {
      const dir = join(root, slug);
      if (!isDir(dir)) {
        errors.push(`${dir}: unexpected file (entries are folders: ${TYPE_SEGMENT[type]}/<slug>/he.md|en.md)`);
        continue;
      }
      if (!isKebab(slug)) {
        errors.push(`${dir}: folder name (slug) must be lowercase Latin kebab-case`);
        continue;
      }
      const entry: RawEntry = { type, slug, dir, sources: {} };
      let found = false;
      for (const name of list(dir)) {
        const file = join(dir, name);
        const lang = ENTRY_FILES[name];
        if (!lang || isDir(file)) {
          errors.push(`${file}: unexpected ${isDir(file) ? 'folder' : 'file'} (an entry folder holds only he.md / en.md)`);
          continue;
        }
        found = true;
        const source = parseSource(type, file, errors);
        if (source) entry.sources[lang] = source;
      }
      if (!found) errors.push(`${dir}: entry folder has no he.md or en.md`);
      entries.push(entry);
    }
  }
  return entries;
}

function validate(entries: RawEntry[], series: Map<string, SeriesFile>, contentDir: string, errors: string[]): void {
  const bySlug = new Map<string, RawEntry[]>();
  for (const entry of entries) bySlug.set(entry.slug, [...(bySlug.get(entry.slug) ?? []), entry]);
  for (const [slug, same] of bySlug) {
    if (same.length > 1) errors.push(`slug "${slug}" is used by both ${same.map((e) => e.dir).join(' and ')}`);
  }

  const orders = new Map<string, string[]>();
  for (const entry of entries) {
    const { he, en } = entry.sources;
    if (he && en) {
      for (const field of SHARED_FACTS) {
        const a = JSON.stringify(he.fm[field]);
        const b = JSON.stringify(en.fm[field]);
        if (a !== b) errors.push(`${he.file} and ${en.file}: shared field "${field}" must be equal in both translations (${a ?? 'none'} vs ${b ?? 'none'})`);
      }
    }
    const sources = LANGS.flatMap((lang) => entry.sources[lang] ?? []);
    for (const { file, fm } of sources) {
      if (fm.series && !series.has(fm.series.key)) {
        errors.push(`${file}: unknown series "${fm.series.key}" (expected ${join(contentDir, 'series', `${fm.series.key}.yaml`)})`);
      }
    }
    const ref = sources.find((s) => s.fm.series)?.fm.series;
    if (ref) {
      const key = `${ref.key}\u0000${ref.order}`;
      orders.set(key, [...(orders.get(key) ?? []), entry.dir]);
    }
  }
  for (const [key, dirs] of orders) {
    if (dirs.length < 2) continue;
    const [seriesKey, order] = key.split('\u0000');
    errors.push(`series "${seriesKey}": order ${order} is used by more than one post: ${dirs.join(', ')}`);
  }
}

export async function buildContent({ contentDir, outDir, includeDrafts, now = () => new Date() }: BuildOptions): Promise<BuildResult> {
  const errors: string[] = [];
  const tagLabels = loadTags(contentDir, errors);
  const seriesFiles = loadSeries(contentDir, errors);
  const raw = loadEntries(contentDir, errors);
  validate(raw, seriesFiles, contentDir, errors);
  if (errors.length) throw new Error(`Invalid content:\n${errors.join('\n')}`);

  // Drop draft translations (production) and entries left without any translation; render the rest.
  const render = await createRenderer();
  const items: Item[] = [];
  for (const entry of raw) {
    const texts: Item['texts'] = {};
    for (const lang of LANGS) {
      const source = entry.sources[lang];
      if (!source || (source.fm.draft && !includeDrafts)) continue;
      texts[lang] = { fm: source.fm, rendered: render(source.body) };
    }
    const langs = LANGS.filter((lang) => texts[lang]);
    if (!langs.length) continue;
    const { date, tags, series } = texts[langs[0]]!.fm;
    items.push({ type: entry.type, slug: entry.slug, langs, texts, date, tags, series });
  }
  items.sort((a, b) => compare(b.date, a.date) || compare(a.slug, b.slug));

  const seriesMembers = new Map<string, Item[]>([...seriesFiles.keys()].map((key) => [key, []]));
  for (const item of items) if (item.series) seriesMembers.get(item.series.key)!.push(item);
  for (const members of seriesMembers.values()) members.sort((a, b) => a.series!.order - b.series!.order);

  const textLang = (item: Item, lang: Lang): Lang => (item.texts[lang] ? lang : item.langs[0]);

  const meta = (item: Item, lang: Lang): EntryMeta => {
    const { fm, rendered } = item.texts[lang]!;
    return {
      type: item.type,
      slug: item.slug,
      lang,
      title: fm.title,
      ...(fm.summary !== undefined && { summary: fm.summary }),
      date: fm.date,
      ...(fm.updated !== undefined && { updated: fm.updated }),
      tags: fm.tags,
      readingMinutes: rendered.readingMinutes,
      ...(fm.cover !== undefined && { cover: fm.cover }),
      ...(fm.series !== undefined && { series: fm.series }),
      availableLangs: item.langs,
    };
  };

  const ref = (item: Item, lang: Lang): EntryRef => {
    const l = textLang(item, lang);
    return { type: item.type, slug: item.slug, lang: l, title: item.texts[l]!.fm.title };
  };

  // Items are already newest-first, and sort is stable: most shared tags first, then newest.
  const related = (item: Item, lang: Lang): EntryRef[] =>
    items
      .filter((other) => other !== item)
      .map((other) => ({ other, shared: other.tags.filter((tag) => item.tags.includes(tag)).length }))
      .filter(({ shared }) => shared > 0)
      .sort((a, b) => b.shared - a.shared)
      .slice(0, 3)
      .map(({ other }) => ref(other, lang));

  const seriesNav = (item: Item, lang: Lang): SeriesNav | null => {
    if (!item.series) return null;
    const members = seriesMembers.get(item.series.key)!;
    const i = members.indexOf(item);
    return {
      key: item.series.key,
      title: seriesFiles.get(item.series.key)!.title[lang],
      index: i + 1,
      total: members.length,
      prev: i > 0 ? ref(members[i - 1], lang) : null,
      next: i < members.length - 1 ? ref(members[i + 1], lang) : null,
    };
  };

  const tagCounts = new Map<string, number>();
  for (const item of items) for (const tag of item.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  const sortedTags = [...tagCounts].sort(([a, x], [b, y]) => y - x || compare(a, b));

  const generatedAt = now().toISOString();
  const indexes = Object.fromEntries(
    LANGS.map((lang) => {
      const tags: TagCount[] = sortedTags.map(([tag, count]) => ({ tag, label: tagLabels[tag]?.[lang] ?? tag, count }));
      const index: LangIndex = { lang, generatedAt, entries: items.map((item) => meta(item, textLang(item, lang))), tags };
      return [lang, index];
    }),
  ) as Record<Lang, LangIndex>;

  const entries: Entry[] = LANGS.flatMap((lang) =>
    items
      .filter((item) => item.texts[lang])
      .map((item) => {
        const { html, toc } = item.texts[lang]!.rendered;
        return { ...meta(item, lang), html, toc, related: related(item, lang), seriesNav: seriesNav(item, lang) };
      }),
  );

  const series: SeriesIndex = [...seriesFiles.keys()].sort(compare).map((key) => {
    const { title, description } = seriesFiles.get(key)!;
    return { key, title, description, slugs: seriesMembers.get(key)!.map((item) => item.slug) };
  });

  // Write: clean previous output first so removed entries/translations disappear.
  for (const lang of LANGS) {
    rmSync(join(outDir, lang), { recursive: true, force: true });
    for (const type of ['post', 'note'] as const) mkdirSync(join(outDir, lang, TYPE_SEGMENT[type]), { recursive: true });
    writeFileSync(join(outDir, lang, 'index.json'), JSON.stringify(indexes[lang], null, 2));
  }
  for (const entry of entries) {
    writeFileSync(join(outDir, entry.lang, TYPE_SEGMENT[entry.type], `${entry.slug}.json`), JSON.stringify(entry));
  }
  writeFileSync(join(outDir, 'series.json'), JSON.stringify(series, null, 2));

  return { indexes, entries, series };
}
