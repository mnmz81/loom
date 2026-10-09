// Shared drawing helpers for the blog's SVG diagram scripts (git-diagrams.ts, github-diagrams.ts).
// Each SVG paints its own light panel, so it reads the same in the light and dark site themes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Folder public/images/<slug>/ for a post's diagrams. */
export const outDir = (slug: string) => join(dirname(fileURLToPath(import.meta.url)), '../../public/images', slug);

export const C = {
  panel: '#f8fafc',
  border: '#cbd5e1',
  text: '#0f172a',
  muted: '#64748b',
  main: '#2563eb',
  feature: '#db2777',
  green: '#16a34a',
  red: '#dc2626',
  amber: '#d97706',
  grey: '#94a3b8',
  soft: '#e2e8f0',
};
export const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
export const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface TextOpts {
  size?: number;
  color?: string;
  mono?: boolean;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
}
export const text = (x: number, y: number, s: string, o: TextOpts = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.mono ? MONO : SANS}" font-size="${o.size ?? 14}" fill="${o.color ?? C.text}" font-weight="${o.weight ?? 400}" text-anchor="${o.anchor ?? 'middle'}">${esc(s)}</text>`;

export const box = (x: number, y: number, w: number, h: number, stroke = C.border, fill = '#ffffff', dash = false) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="1.5"${dash ? ' stroke-dasharray="6 4"' : ''}/>`;

export const pill = (cx: number, cy: number, label: string, color: string, w = label.length * 8.2 + 22) =>
  `<rect x="${cx - w / 2}" y="${cy - 12}" width="${w}" height="24" rx="12" fill="${color}"/>` +
  text(cx, cy + 5, label, { size: 12.5, color: '#ffffff', mono: true, weight: 600 });

export const commit = (cx: number, cy: number, label: string, color: string, ghost = false) =>
  `<circle cx="${cx}" cy="${cy}" r="17" fill="${ghost ? '#ffffff' : color}" stroke="${color}" stroke-width="2"${ghost ? ' stroke-dasharray="4 3"' : ''}/>` +
  text(cx, cy + 5, label, { size: 13, color: ghost ? color : '#ffffff', weight: 700, mono: true });

/** Straight arrow from (x1,y1) to (x2,y2); the head stops short of the end point. */
export const arrow = (x1: number, y1: number, x2: number, y2: number, color = C.muted, dash = false, id = 'ah') => {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ex = x2 - ((x2 - x1) / len) * 2;
  const ey = y2 - ((y2 - y1) / len) * 2;
  return `<line x1="${x1}" y1="${y1}" x2="${ex}" y2="${ey}" stroke="${color}" stroke-width="2"${dash ? ' stroke-dasharray="6 4"' : ''} marker-end="url(#${id}-${color.slice(1)})"/>`;
};

export const markers = () =>
  Object.values(C)
    .map(
      (col) =>
        `<marker id="ah-${col.slice(1)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker>`,
    )
    .join('');

export const svgWriter =
  (OUT: string) =>
  (name: string, w: number, h: number, title: string, desc: string, body: string[]): void => {
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<defs>${markers()}</defs>
<rect width="${w}" height="${h}" rx="14" fill="${C.panel}" stroke="${C.border}"/>
${body.join('\n')}
</svg>
`;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${name}.svg`), doc);
};

// A chain of commits drawn left to right, each arrow pointing at its parent.
export const chain = (xs: number[], y: number, labels: string[], color: string) =>
  xs.flatMap((x, i) => [
    ...(i > 0 ? [arrow(x - 19, y, xs[i - 1] + 19, y, C.grey)] : []),
    commit(x, y, labels[i], color),
  ]);
