// Real Notion access (network). Kept thin so sync.ts can be tested with a mocked NotionSource.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import type { NotionPageLike } from './mapping';
import type { Downloader, NotionSource } from './sync';

export function createNotionSource(token: string, dataSourceId: string): NotionSource {
  const notion = new Client({ auth: token });
  const n2m = new NotionToMarkdown({ notionClient: notion });

  return {
    async listPublished() {
      const pages: NotionPageLike[] = [];
      let cursor: string | undefined;
      do {
        const res = await notion.dataSources.query({
          data_source_id: dataSourceId,
          filter: { property: 'Status', status: { equals: 'Published' } },
          start_cursor: cursor,
        });
        pages.push(
          ...(res.results.filter((r) => 'properties' in r) as unknown as NotionPageLike[]),
        );
        cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
      } while (cursor);
      return pages;
    },
    async pageMarkdown(pageId) {
      const blocks = await n2m.pageToMarkdown(pageId);
      return n2m.toMarkdownString(blocks)['parent'] ?? '';
    },
  };
}

export const fetchDownloader: Downloader = async (url, destination) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`GET ${url} failed with ${res.status}`);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, Buffer.from(await res.arrayBuffer()));
};
