// Runs automatically after `npm run build` (npm "postbuild"): writes 404.html, builds the Pagefind
// search index, then verifies the static output. Exits 1 when anything required is missing.
// Usage: npx tsx scripts/postbuild.ts [distDir]   (default dist/loom/browser)
import { existsSync } from 'node:fs';
import { write404 } from './postbuild/not-found';
import { buildSearchIndex } from './postbuild/search';
import { missingFiles, readLangIndexes, requiredFiles } from './postbuild/verify';

const DIST = process.argv[2] ?? 'dist/loom/browser';

async function main(): Promise<void> {
  if (!existsSync(DIST)) throw new Error(`${DIST} does not exist — run ng build first`);

  const notFound = write404(DIST);
  console.log(`[postbuild] 404.html written (${notFound})`);

  const search = await buildSearchIndex(DIST);
  const perLang = Object.entries(search.counts).map(([lang, n]) => `${lang}=${n}`).join(', ') || 'none';
  if (search.pageCount === 0) console.warn('[postbuild] warning: pagefind indexed 0 pages');
  console.log(`[postbuild] pagefind indexed ${search.pageCount} pages (${perLang})`);
  if (!search.expectedLangs.length) {
    console.warn('[postbuild] warning: no page has data-pagefind-body — per-language index check skipped');
  }

  const problems = missingFiles(DIST, requiredFiles(readLangIndexes(DIST)));
  problems.push(...search.missingLangs.map((lang) => `pagefind index for "${lang}" (pages exist, index empty)`));
  if (problems.length) {
    console.error(`[postbuild] missing from ${DIST}:\n${problems.map((p) => `  ${p}`).join('\n')}`);
    process.exit(1);
  }
  console.log('[postbuild] output verified');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
