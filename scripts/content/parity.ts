// Structural parity between the he.md and en.md bodies of one entry. Wording differs per language,
// but the skeleton must not: same number of ## / ### headings, same number of code blocks, same images.
import MarkdownIt from 'markdown-it';

export interface BodyShape {
  h2: number;
  h3: number;
  code: number;
  /** Image sources, sorted (the same images in any order). */
  images: string[];
}

const md = new MarkdownIt({ html: false });

export function bodyShape(markdown: string): BodyShape {
  const shape: BodyShape = { h2: 0, h3: 0, code: 0, images: [] };
  for (const token of md.parse(markdown, {})) {
    if (token.type === 'heading_open' && token.tag === 'h2') shape.h2++;
    else if (token.type === 'heading_open' && token.tag === 'h3') shape.h3++;
    else if (token.type === 'fence' || token.type === 'code_block') shape.code++;
    else if (token.type === 'inline') {
      for (const child of token.children ?? []) if (child.type === 'image') shape.images.push(child.attrGet('src') ?? '');
    }
  }
  shape.images.sort();
  return shape;
}

const LABELS: Record<Exclude<keyof BodyShape, 'images'>, string> = { h2: '## headings', h3: '### headings', code: 'code blocks' };

/** Human-readable differences between two shapes ([] when they match). */
export function shapeDiff(he: BodyShape, en: BodyShape): string[] {
  const diffs: string[] = [];
  for (const key of Object.keys(LABELS) as (keyof typeof LABELS)[]) {
    if (he[key] !== en[key]) diffs.push(`${LABELS[key]}: he ${he[key]} vs en ${en[key]}`);
  }
  const onlyHe = he.images.filter((src) => !en.images.includes(src));
  const onlyEn = en.images.filter((src) => !he.images.includes(src));
  if (onlyHe.length || onlyEn.length || he.images.length !== en.images.length) {
    diffs.push(`images: only in he [${onlyHe.join(', ')}], only in en [${onlyEn.join(', ')}] (he ${he.images.length} vs en ${en.images.length})`);
  }
  return diffs;
}
