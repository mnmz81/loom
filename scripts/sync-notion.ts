// Pulls Published pages from Notion into content/ (see docs/notion-setup.md).
// Usage: npm run sync:notion      (reads NOTION_TOKEN and NOTION_DATA_SOURCE_ID from env or .env)
import { createNotionSource, fetchDownloader } from './notion/client';
import { runSync } from './notion/sync';

async function main(): Promise<void> {
  try {
    process.loadEnvFile('.env');
  } catch {
    // No .env file: rely on the environment (CI).
  }
  const token = process.env['NOTION_TOKEN'];
  const dataSourceId = process.env['NOTION_DATA_SOURCE_ID'];
  if (!token || !dataSourceId) {
    throw new Error('Missing NOTION_TOKEN or NOTION_DATA_SOURCE_ID. See docs/notion-setup.md.');
  }
  const { written } = await runSync({
    source: createNotionSource(token, dataSourceId),
    download: fetchDownloader,
    contentDir: 'content',
    publicDir: 'public',
  });
  console.log(
    `[notion] wrote ${written.length} files:\n${written.map((f) => `  ${f}`).join('\n')}`,
  );
  console.log('[notion] next: run `npm run content` to validate, then review and commit.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
