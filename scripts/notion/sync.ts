// Pulls Published Notion pages into content/<kind>s/<slug>/<lang>.md.
// Validates everything first and writes nothing when any page is invalid. Never deletes files.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  checkEntries,
  entryPath,
  type ImageDownload,
  isPublished,
  type NotionEntry,
  type NotionPageLike,
  PageError,
  readEntry,
  rewriteImages,
  toMarkdownFile,
} from './mapping';

export interface NotionSource {
  listPublished(): Promise<NotionPageLike[]>;
  pageMarkdown(pageId: string): Promise<string>;
}

export type Downloader = (url: string, destination: string) => Promise<void>;

export interface SyncOptions {
  source: NotionSource;
  download: Downloader;
  contentDir: string;
  publicDir: string;
}

export class SyncError extends Error {
  constructor(
    readonly errors: string[],
    readonly written: string[] = [],
  ) {
    super(
      `Notion sync failed with ${errors.length} error(s) (${written.length} files written):\n${errors.join('\n')}`,
    );
    this.name = 'SyncError';
  }
}

interface Pending {
  entry: NotionEntry;
  markdown: string;
  downloads: ImageDownload[];
}

export async function runSync({
  source,
  download,
  contentDir,
  publicDir,
}: SyncOptions): Promise<{ written: string[] }> {
  const errors: string[] = [];

  // 1. Read and validate every page's properties.
  const entries: NotionEntry[] = [];
  for (const page of await source.listPublished()) {
    if (!isPublished(page)) continue;
    try {
      entries.push(readEntry(page));
    } catch (error) {
      errors.push(
        error instanceof PageError
          ? error.message
          : `${page.url ?? page.id}: ${(error as Error).message}`,
      );
    }
  }
  errors.push(...checkEntries(entries));
  for (const e of entries) {
    const key = e.frontmatter.series?.key;
    if (key && !existsSync(join(contentDir, 'series', `${key}.yaml`))) {
      errors.push(
        `${e.label}: Series "${key}" has no content/series/${key}.yaml; add it to the repo first`,
      );
    }
  }
  if (errors.length) throw new SyncError(errors);

  // 2. Fetch bodies (still nothing written).
  const pending: Pending[] = [];
  for (const entry of entries) {
    try {
      const { markdown, downloads } = rewriteImages(
        await source.pageMarkdown(entry.id),
        entry.slug,
        entry.lang,
      );
      pending.push({ entry, markdown, downloads });
    } catch (error) {
      errors.push(`${entry.label}: could not read page body: ${(error as Error).message}`);
    }
  }
  if (errors.length) throw new SyncError(errors);

  // 3. Write files and download images (overwrite only; never delete).
  const written: string[] = [];
  for (const { entry, markdown, downloads } of pending) {
    try {
      for (const { url, file } of downloads) {
        const destination = join(publicDir, file);
        mkdirSync(dirname(destination), { recursive: true });
        await download(url, destination);
      }
      const file = join(contentDir, entryPath(entry));
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, toMarkdownFile(entry, markdown));
      written.push(file);
    } catch (error) {
      errors.push(`${entry.label}: ${(error as Error).message}`);
    }
  }
  if (errors.length) throw new SyncError(errors, written);
  return { written };
}
