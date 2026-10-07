// Generates public/og/default.png (1200×630): both site titles + descriptions.
// Hebrew needs a system font (see scripts/og/fonts.ts); without one the image is English-only, unless
// OG_REQUIRE_HEBREW=1 (set in deploy CI) which makes that an error. Per-entry OG images: not yet.
// Usage: npx tsx scripts/build-og.ts   (part of `npm run build`)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findHebrewFont } from './og/fonts';
import { renderDefaultOg } from './og/render';

const OUT = join('public', 'og');

async function main(): Promise<void> {
  const hebrew = findHebrewFont();
  if (!hebrew) {
    const message = 'no Hebrew-capable font found (set OG_HEBREW_FONT=/path/to/font.ttf)';
    if (process.env['OG_REQUIRE_HEBREW'] === '1') throw new Error(`[og] ${message}`);
    console.warn(`[og] warning: ${message} — rendering English only`);
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'default.png'), await renderDefaultOg(hebrew));
  console.log(`[og] wrote ${join(OUT, 'default.png')} (${hebrew ? `he+en, Hebrew font ${hebrew.regular}` : 'en only'})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
