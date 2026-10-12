// Creates a new entry folder with he.md + en.md whose shared facts (date, tags, series) already match,
// so a post starts valid instead of being hand-copied. Both files start as drafts.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import YAML from 'yaml';
import { type EntryType, LANGS, TYPE_SEGMENT } from '../../src/app/core/content.models';
import { isKebab } from './schema';

export interface ScaffoldOptions {
  contentDir: string;
  type: EntryType;
  slug: string;
  tags: string[];
  /** YYYY-MM-DD */
  date: string;
  /** Series key (posts only); the order is the next free one in that series. */
  series?: string;
}

export interface ScaffoldResult {
  files: string[];
  /** Series order given to the post, when it joined a series. */
  order?: number;
  /** Tags that have no label in content/tags.yaml yet. */
  unlabeledTags: string[];
}

/** Highest `series.order` used by any post in `key`, read from both languages. */
export function lastSeriesOrder(contentDir: string, key: string): number {
  const root = join(contentDir, TYPE_SEGMENT.post);
  if (!existsSync(root)) return 0;
  let last = 0;
  for (const slug of readdirSync(root)) {
    for (const lang of LANGS) {
      const file = join(root, slug, `${lang}.md`);
      if (!existsSync(file)) continue;
      const series = matter(readFileSync(file, 'utf8')).data['series'] as { key?: string; order?: number } | undefined;
      if (series?.key === key && typeof series.order === 'number') last = Math.max(last, series.order);
    }
  }
  return last;
}

const quote = (value: string) => JSON.stringify(value);

function frontmatter(type: EntryType, lang: string, { date, tags }: ScaffoldOptions, series?: { key: string; order: number }): string {
  const lines = [`title: ${quote(lang === 'he' ? 'TODO כותרת' : 'TODO title')}`];
  if (type === 'post') lines.push(`summary: ${quote(lang === 'he' ? 'TODO תקציר (עד 200 תווים)' : 'TODO summary (up to 200 characters)')}`);
  lines.push(`date: ${date}`, `tags: [${tags.join(', ')}]`);
  if (series) lines.push(`series: { key: ${series.key}, order: ${series.order} }`);
  lines.push('draft: true');
  return `---\n${lines.join('\n')}\n---\n\nTODO\n\n## TODO\n`;
}

export function scaffoldEntry(options: ScaffoldOptions): ScaffoldResult {
  const { contentDir, type, slug, tags, date, series } = options;
  const problems: string[] = [];
  if (!isKebab(slug)) problems.push(`slug "${slug}" must be lowercase Latin kebab-case`);
  if (!tags.length) problems.push('at least one tag is required');
  for (const tag of tags) if (!isKebab(tag)) problems.push(`tag "${tag}" must be lowercase Latin kebab-case`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problems.push(`date "${date}" must be YYYY-MM-DD`);
  if (series && type !== 'post') problems.push('only posts can be in a series');
  if (series && !existsSync(join(contentDir, 'series', `${series}.yaml`))) {
    problems.push(`unknown series "${series}" (create content/series/${series}.yaml first)`);
  }
  for (const segment of Object.values(TYPE_SEGMENT)) {
    if (existsSync(join(contentDir, segment, slug))) problems.push(`slug "${slug}" already exists in content/${segment}/`);
  }
  if (problems.length) throw new Error(`Cannot create ${type} "${slug}":\n${problems.map((p) => `  - ${p}`).join('\n')}`);

  const ref = series ? { key: series, order: lastSeriesOrder(contentDir, series) + 1 } : undefined;
  const dir = join(contentDir, TYPE_SEGMENT[type], slug);
  mkdirSync(dir, { recursive: true });
  const files = LANGS.map((lang) => {
    const file = join(dir, `${lang}.md`);
    writeFileSync(file, frontmatter(type, lang, options, ref));
    return file;
  });

  const tagsFile = join(contentDir, 'tags.yaml');
  const labels = existsSync(tagsFile) ? ((YAML.parse(readFileSync(tagsFile, 'utf8')) ?? {}) as Record<string, unknown>) : {};
  return { files, order: ref?.order, unlabeledTags: tags.filter((tag) => !(tag in labels)) };
}
