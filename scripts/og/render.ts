import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { SITE } from '../../src/app/core/site.config';
import { type FontPair, HEBREW_FAMILY, LATIN_FAMILY, loadOgFonts } from './fonts';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export interface OgText {
  title: string;
  description: string;
}

export interface DefaultOgInput {
  he: OgText | null;   // null → no Hebrew font available, render English only
  en: OgText;
  footer: string;      // e.g. 'mnmz81.github.io/loom · Moris Maor Zakay'
}

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const el = (style: Record<string, unknown>, children?: unknown): Node => ({ type: 'div', props: { style, children } });

/** Drops a sentence-final period (OG images read as headlines; also avoids RTL punctuation placement). */
export const stripFinalPeriod = (text: string): string => text.replace(/\s*[.。]\s*$/, '');

/**
 * Satori draws the glyphs of a Hebrew word in the right order, but its bidi handling of a whole RTL
 * sentence moves spaces to the wrong side of words ("ולמצוא שוב" → "שובולמצוא"). So RTL text is laid out
 * word by word in a wrapping `row-reverse` flex row: first word on the right, lines wrap right-to-left.
 */
export function rtlWords(text: string, style: Record<string, unknown>): Node {
  const words = text.split(/\s+/).filter(Boolean);
  return el(
    { ...style, display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap', columnGap: '0.28em' },
    words.map((word) => el({ display: 'flex' }, word)),
  );
}

function block({ title, description }: OgText, lang: 'he' | 'en'): Node {
  const rtl = lang === 'he';
  const titleStyle = { fontSize: 72, fontWeight: 700, lineHeight: 1.1, color: '#ffffff' };
  const descStyle = { fontSize: 30, lineHeight: 1.35, color: '#cbd5e1', maxWidth: '1000px' };
  const text = (value: string, style: Record<string, unknown>) =>
    rtl ? rtlWords(value, style) : el({ display: 'flex', ...style }, value);
  return el(
    {
      display: 'flex',
      flexDirection: 'column',
      alignItems: rtl ? 'flex-end' : 'flex-start',
      gap: '12px',
      width: '100%',
      fontFamily: rtl ? HEBREW_FAMILY : LATIN_FAMILY,
    },
    [text(title, titleStyle), text(stripFinalPeriod(description), descStyle)],
  );
}

/** Pure: satori element tree for the site-wide default OG image. */
export function defaultOgTemplate({ he, en, footer }: DefaultOgInput): Node {
  return el(
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '64px 72px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #134e4a 100%)',
      color: '#e2e8f0',
      fontFamily: LATIN_FAMILY,
    },
    [
      ...(he ? [block(he, 'he'), el({ display: 'flex', height: '2px', width: '100%', background: '#2dd4bf', opacity: 0.6 })] : []),
      block(en, 'en'),
      el({ display: 'flex', fontSize: 24, fontWeight: 700, color: '#5eead4' }, footer),
    ],
  );
}

export function siteOgInput(hebrew: boolean): DefaultOgInput {
  return {
    he: hebrew ? { title: SITE.title.he, description: SITE.description.he } : null,
    en: { title: SITE.title.en, description: SITE.description.en },
    footer: `${SITE.url.replace(/^https?:\/\//, '')} · ${SITE.author}`,
  };
}

export async function renderPng(tree: Node, hebrewFont: FontPair | null): Promise<Buffer> {
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: loadOgFonts(hebrewFont),
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng();
}

/** Default OG image with both site titles, or English only when no Hebrew font is available. */
export function renderDefaultOg(hebrewFont: FontPair | null): Promise<Buffer> {
  return renderPng(defaultOgTemplate(siteOgInput(!!hebrewFont)), hebrewFont);
}
