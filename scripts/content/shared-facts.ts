// Rewrites the shared frontmatter facts (`tags`, `series`) of an entry in every language file at once,
// so he.md and en.md never drift apart. Used by scripts/set-shared.ts.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface SharedFacts {
  tags?: string[];
  /** `null` removes the entry from its series. */
  series?: { key: string; order: number } | null;
}

/** Replaces (or inserts after `tags:`) the `tags` / `series` lines of one Markdown file's frontmatter. */
export function setSharedFacts(markdown: string, facts: SharedFacts): string {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(markdown);
  if (!match) throw new Error('no frontmatter');
  let lines = match[1].split('\n');
  const index = (key: string) => lines.findIndex((l) => l.startsWith(`${key}:`));

  if (facts.tags) {
    const i = index('tags');
    if (i < 0) throw new Error('no tags line');
    lines[i] = `tags: [${facts.tags.join(', ')}]`;
  }
  if (facts.series !== undefined) {
    const i = index('series');
    const line = facts.series ? `series: { key: ${facts.series.key}, order: ${facts.series.order} }` : null;
    if (i >= 0) lines = line ? lines.with(i, line) : lines.toSpliced(i, 1);
    else if (line) lines = lines.toSpliced(index('tags') + 1, 0, line);
  }
  return `---\n${lines.join('\n')}\n---\n${markdown.slice(match[0].length)}`;
}

/** Applies `facts` to `content/<posts|notes>/<slug>/{he,en}.md`; returns the files it changed. */
export function updateEntry(contentDir: string, slug: string, facts: SharedFacts): string[] {
  const dir = ['posts', 'notes'].map((t) => join(contentDir, t, slug)).find((d) => existsSync(d));
  if (!dir) throw new Error(`no entry ${slug}`);
  const files = ['he.md', 'en.md'].map((f) => join(dir, f)).filter((f) => existsSync(f));
  for (const file of files) writeFileSync(file, setSharedFacts(readFileSync(file, 'utf8'), facts));
  return files;
}
