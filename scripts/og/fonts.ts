import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface OgFont {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: 'normal';
}

export interface FontPair {
  regular: string;
  bold: string;
}

/**
 * No installed npm font has Hebrew glyphs (@fontsource/inter covers Latin/Greek/Cyrillic only), so Hebrew
 * text uses a system font. Checked in order; `OG_HEBREW_FONT` / `OG_HEBREW_FONT_BOLD` (TTF/OTF paths, not
 * WOFF2/TTC — satori can't read those) override. Linux CI: DejaVu (fonts-dejavu-core); macOS: Arial.
 */
export const HEBREW_FONT_CANDIDATES: readonly FontPair[] = [
  { regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' },
  { regular: '/usr/share/fonts/truetype/noto/NotoSansHebrew-Regular.ttf', bold: '/usr/share/fonts/truetype/noto/NotoSansHebrew-Bold.ttf' },
  { regular: '/usr/share/fonts/truetype/freefont/FreeSans.ttf', bold: '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf' },
  { regular: '/System/Library/Fonts/Supplemental/Arial.ttf', bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf' },
  { regular: 'C:\\Windows\\Fonts\\arial.ttf', bold: 'C:\\Windows\\Fonts\\arialbd.ttf' },
];

/** Pure: first candidate whose regular file exists (bold falls back to regular). Env override wins. */
export function findHebrewFont(
  candidates: readonly FontPair[] = HEBREW_FONT_CANDIDATES,
  env: NodeJS.ProcessEnv = process.env,
  exists: (path: string) => boolean = existsSync,
): FontPair | null {
  const fromEnv = env['OG_HEBREW_FONT'];
  const list = fromEnv ? [{ regular: fromEnv, bold: env['OG_HEBREW_FONT_BOLD'] ?? fromEnv }, ...candidates] : candidates;
  const found = list.find((pair) => exists(pair.regular));
  if (!found) return null;
  return exists(found.bold) ? found : { regular: found.regular, bold: found.regular };
}

export const LATIN_FAMILY = 'Inter';
export const HEBREW_FAMILY = 'OgHebrew';

const interFile = (weight: 400 | 700) =>
  readFileSync(join(process.cwd(), 'node_modules', '@fontsource', 'inter', 'files', `inter-latin-${weight}-normal.woff`));

/** Inter (Latin) plus the Hebrew font when one is given. */
export function loadOgFonts(hebrew: FontPair | null): OgFont[] {
  const fonts: OgFont[] = [
    { name: LATIN_FAMILY, data: interFile(400), weight: 400, style: 'normal' },
    { name: LATIN_FAMILY, data: interFile(700), weight: 700, style: 'normal' },
  ];
  if (hebrew) {
    fonts.push(
      { name: HEBREW_FAMILY, data: readFileSync(hebrew.regular), weight: 400, style: 'normal' },
      { name: HEBREW_FAMILY, data: readFileSync(hebrew.bold), weight: 700, style: 'normal' },
    );
  }
  return fonts;
}
