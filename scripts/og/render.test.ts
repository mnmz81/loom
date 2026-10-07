import { describe, expect, it } from 'vitest';
import { SITE } from '../../src/app/core/site.config';
import { findHebrewFont } from './fonts';
import { defaultOgTemplate, renderDefaultOg, rtlWords, siteOgInput, stripFinalPeriod } from './render';

function pngSize(buf: Buffer): { width: number; height: number } {
  // PNG IHDR: width at byte 16, height at byte 20 (big-endian).
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const texts = (node: unknown): string[] => {
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(texts);
  if (node && typeof node === 'object' && 'props' in node) return texts((node as { props: { children?: unknown } }).props.children);
  return [];
};

describe('defaultOgTemplate', () => {
  it('shows both titles and descriptions when Hebrew is available', () => {
    const all = texts(defaultOgTemplate(siteOgInput(true))).join(' ');
    expect(all).toContain(SITE.title.he);
    expect(all).toContain(SITE.title.en);
    for (const word of stripFinalPeriod(SITE.description.he).split(' ')) expect(texts(defaultOgTemplate(siteOgInput(true)))).toContain(word);
    expect(all).toContain(stripFinalPeriod(SITE.description.en));
  });

  it('is English-only without a Hebrew font', () => {
    const all = texts(defaultOgTemplate(siteOgInput(false))).join(' ');
    expect(all).not.toContain(SITE.title.he);
    expect(all).toContain(SITE.title.en);
  });
});

describe('rtlWords / stripFinalPeriod', () => {
  it('lays words out right-to-left as separate flex items', () => {
    const node = rtlWords('אחת  שתיים — שלוש', { fontSize: 10 });
    expect(node.props['style']).toMatchObject({ flexDirection: 'row-reverse', flexWrap: 'wrap', fontSize: 10 });
    expect(texts(node)).toEqual(['אחת', 'שתיים', '—', 'שלוש']);
  });

  it('drops only a final period', () => {
    expect(stripFinalPeriod('a. b.')).toBe('a. b');
    expect(stripFinalPeriod('no period')).toBe('no period');
  });
});

describe('findHebrewFont', () => {
  const pair = (n: string) => ({ regular: `/${n}.ttf`, bold: `/${n}-bold.ttf` });

  it('returns the first candidate that exists, bold falling back to regular', () => {
    const files = new Set(['/b.ttf', '/c.ttf', '/c-bold.ttf']);
    expect(findHebrewFont([pair('a'), pair('b'), pair('c')], {}, (p) => files.has(p))).toEqual({ regular: '/b.ttf', bold: '/b.ttf' });
  });

  it('prefers OG_HEBREW_FONT and returns null when nothing exists', () => {
    const files = new Set(['/env.ttf', '/a.ttf', '/a-bold.ttf']);
    expect(findHebrewFont([pair('a')], { OG_HEBREW_FONT: '/env.ttf' }, (p) => files.has(p))).toEqual({ regular: '/env.ttf', bold: '/env.ttf' });
    expect(findHebrewFont([pair('a')], {}, () => false)).toBeNull();
  });
});

describe('renderDefaultOg', () => {
  it('renders an English-only 1200x630 PNG without a Hebrew font', async () => {
    const png = await renderDefaultOg(null);
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(pngSize(png)).toEqual({ width: 1200, height: 630 });
  });

  it.skipIf(!findHebrewFont())('renders the bilingual PNG with the system Hebrew font', async () => {
    const png = await renderDefaultOg(findHebrewFont());
    expect(pngSize(png)).toEqual({ width: 1200, height: 630 });
  });
});
