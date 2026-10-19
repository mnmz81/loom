// Validates content/** (frontmatter, he/en parity, series orders, reading-time limit) without touching
// public/ or dist/, so it is safe to run while other builds or edits are going on.
// Usage: ./scripts/with-node.sh npx tsx scripts/check-content.ts
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildContent } from './content/collect';

async function main(): Promise<void> {
  const outDir = mkdtempSync(join(tmpdir(), 'loom-content-'));
  try {
    const { entries, series } = await buildContent({ contentDir: process.env['CONTENT_DIR'] ?? 'content', outDir, includeDrafts: false });
    console.log(`[check-content] ok: ${entries.length} entries, ${series.length} series`);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
