// Generates the SVG diagrams for the "Git from zero to hero" post.
// Usage: npx tsx scripts/diagrams/git-diagrams.ts      (writes public/images/git-zero-to-hero/*.svg)
// Each SVG paints its own light panel, so it reads the same in the light and dark site themes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../public/images/git-zero-to-hero');

const C = {
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
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface TextOpts {
  size?: number;
  color?: string;
  mono?: boolean;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
}
const text = (x: number, y: number, s: string, o: TextOpts = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.mono ? MONO : SANS}" font-size="${o.size ?? 14}" fill="${o.color ?? C.text}" font-weight="${o.weight ?? 400}" text-anchor="${o.anchor ?? 'middle'}">${esc(s)}</text>`;

const box = (x: number, y: number, w: number, h: number, stroke = C.border, fill = '#ffffff', dash = false) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="1.5"${dash ? ' stroke-dasharray="6 4"' : ''}/>`;

const pill = (cx: number, cy: number, label: string, color: string, w = label.length * 8.2 + 22) =>
  `<rect x="${cx - w / 2}" y="${cy - 12}" width="${w}" height="24" rx="12" fill="${color}"/>` +
  text(cx, cy + 5, label, { size: 12.5, color: '#ffffff', mono: true, weight: 600 });

const commit = (cx: number, cy: number, label: string, color: string, ghost = false) =>
  `<circle cx="${cx}" cy="${cy}" r="17" fill="${ghost ? '#ffffff' : color}" stroke="${color}" stroke-width="2"${ghost ? ' stroke-dasharray="4 3"' : ''}/>` +
  text(cx, cy + 5, label, { size: 13, color: ghost ? color : '#ffffff', weight: 700, mono: true });

/** Straight arrow from (x1,y1) to (x2,y2); the head stops short of the end point. */
const arrow = (x1: number, y1: number, x2: number, y2: number, color = C.muted, dash = false, id = 'ah') => {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ex = x2 - ((x2 - x1) / len) * 2;
  const ey = y2 - ((y2 - y1) / len) * 2;
  return `<line x1="${x1}" y1="${y1}" x2="${ex}" y2="${ey}" stroke="${color}" stroke-width="2"${dash ? ' stroke-dasharray="6 4"' : ''} marker-end="url(#${id}-${color.slice(1)})"/>`;
};

const markers = () =>
  Object.values(C)
    .map(
      (col) =>
        `<marker id="ah-${col.slice(1)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker>`,
    )
    .join('');

function svg(name: string, w: number, h: number, title: string, desc: string, body: string[]): void {
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
}

// A chain of commits drawn left to right, each arrow pointing at its parent.
const chain = (xs: number[], y: number, labels: string[], color: string) =>
  xs.flatMap((x, i) => [
    ...(i > 0 ? [arrow(x - 19, y, xs[i - 1] + 19, y, C.grey)] : []),
    commit(x, y, labels[i], color),
  ]);

// 1. The three areas ---------------------------------------------------------
svg(
  'areas',
  760,
  300,
  'The three areas of Git',
  'Files move from the working directory to the staging area with git add, and from the staging area into the repository with git commit. git restore --staged moves them back; git switch updates the working directory from the repository.',
  [
    box(20, 40, 190, 150),
    box(290, 40, 190, 150),
    box(560, 40, 180, 150),
    text(115, 70, 'Working directory', { weight: 700 }),
    text(385, 70, 'Staging area', { weight: 700 }),
    text(650, 70, 'Repository (.git)', { weight: 700 }),
    text(115, 92, 'your files on disk', { size: 12, color: C.muted }),
    text(385, 92, 'the next commit, prepared', { size: 12, color: C.muted }),
    text(650, 92, 'saved history', { size: 12, color: C.muted }),
    text(115, 130, 'notes.txt  (edited)', { size: 13, mono: true, color: C.amber }),
    text(115, 156, 'todo.txt  (new)', { size: 13, mono: true, color: C.red }),
    text(385, 130, 'notes.txt', { size: 13, mono: true, color: C.green }),
    ...chain([600, 650, 700], 140, ['A', 'B', 'C'], C.main),
    arrow(212, 105, 288, 105, C.main),
    text(250, 95, 'git add', { size: 12, mono: true, color: C.main }),
    arrow(482, 105, 558, 105, C.main),
    text(520, 95, 'git commit', { size: 12, mono: true, color: C.main }),
    arrow(288, 170, 212, 170, C.grey),
    arrow(558, 170, 482, 170, C.grey),
    text(250, 214, 'git restore --staged', { size: 12, mono: true, color: C.muted }),
    text(520, 214, 'git switch · git restore', { size: 12, mono: true, color: C.muted }),
    text(380, 262, 'git status shows the differences between these three places', { size: 13, color: C.muted }),
  ],
);

// 2. A chain of commits, HEAD and branch names --------------------------------
svg(
  'commit-chain',
  760,
  230,
  'Commits form a chain',
  'Four commits A, B, C and D. Each one points to its parent. The branch name main points at D, and HEAD points at main.',
  [
    ...chain([110, 270, 430, 590], 150, ['A', 'B', 'C', 'D'], C.main),
    text(110, 190, 'a1b2c3d', { size: 11.5, mono: true, color: C.muted }),
    text(270, 190, 'e4f5a6b', { size: 11.5, mono: true, color: C.muted }),
    text(430, 190, '7c8d9e0', { size: 11.5, mono: true, color: C.muted }),
    text(590, 190, '1f2a3b4', { size: 11.5, mono: true, color: C.muted }),
    pill(590, 90, 'main', C.main),
    arrow(590, 104, 590, 130, C.main),
    pill(590, 40, 'HEAD', C.text),
    arrow(590, 54, 590, 76, C.text),
    text(110, 40, 'older', { size: 12, color: C.muted }),
    text(110, 62, '←', { size: 18, color: C.muted }),
    text(700, 156, 'newer', { size: 12, color: C.muted }),
  ],
);

// 3. Branching ---------------------------------------------------------------
svg(
  'branches',
  760,
  290,
  'A branch is a moving pointer',
  'main has commits A, B, C. A branch called feature starts at B and has its own commits D and E. HEAD points at feature, so the next commit goes there.',
  [
    ...chain([110, 270, 430], 90, ['A', 'B', 'C'], C.main),
    pill(430, 40, 'main', C.main),
    arrow(430, 54, 430, 70, C.main),
    commit(330, 210, 'D', C.feature),
    commit(490, 210, 'E', C.feature),
    arrow(471, 210, 351, 210, C.grey),
    arrow(322, 194, 278, 106, C.grey),
    pill(490, 255, 'feature', C.feature),
    arrow(490, 243, 490, 230, C.feature),
    pill(600, 255, 'HEAD', C.text),
    arrow(572, 255, 549, 255, C.text),
    text(40, 190, 'new commits on feature', { size: 12.5, color: C.muted, anchor: 'start' }),
    text(40, 210, 'do not touch main', { size: 12.5, color: C.muted, anchor: 'start' }),
  ],
);

// 4. Merge -------------------------------------------------------------------
svg(
  'merge',
  760,
  400,
  'Fast-forward and merge commit',
  'Top: when main has not moved, git merge just moves the main pointer forward (fast-forward). Bottom: when both branches have new commits, git merge creates a merge commit M with two parents.',
  [
    text(30, 32, 'Fast-forward: main has nothing new, so the pointer just moves', { size: 13.5, weight: 700, anchor: 'start' }),
    ...chain([110, 250], 80, ['A', 'B'], C.main),
    arrow(267, 80, 313, 80, C.grey, true),
    commit(330, 80, 'C', C.feature),
    commit(450, 80, 'D', C.feature),
    arrow(433, 80, 347, 80, C.grey),
    pill(250, 130, 'main', C.main),
    arrow(250, 118, 250, 100, C.main),
    pill(450, 130, 'feature', C.feature),
    arrow(450, 118, 450, 100, C.feature),
    arrow(310, 130, 392, 130, C.main, true),
    text(620, 85, 'after git merge feature:', { size: 12.5, color: C.muted }),
    text(620, 105, 'main → D, no new commit', { size: 12.5, color: C.muted, mono: true }),
    `<line x1="30" y1="170" x2="730" y2="170" stroke="${C.border}"/>`,
    text(30, 200, 'Merge commit: both branches moved, so Git ties them together', { size: 13.5, weight: 700, anchor: 'start' }),
    ...chain([110, 230, 350], 255, ['A', 'B', 'C'], C.main),
    commit(290, 335, 'D', C.feature),
    arrow(281, 321, 237, 273, C.grey),
    commit(520, 255, 'M', C.green),
    arrow(503, 255, 369, 255, C.grey),
    arrow(507, 268, 307, 332, C.green),
    pill(520, 205, 'main', C.main),
    arrow(520, 219, 520, 236, C.main),
    pill(290, 375, 'feature', C.feature),
    text(620, 258, 'M has two parents:', { size: 12.5, color: C.muted, anchor: 'start' }),
    text(620, 278, 'C and D', { size: 12.5, color: C.muted, anchor: 'start', mono: true }),
  ],
);

// 5. Rebase ------------------------------------------------------------------
svg(
  'rebase',
  760,
  380,
  'Rebase replays your commits on top of main',
  'Before: feature has commits D and E branching off B, while main moved on to C. After git rebase main: D and E are copied as D prime and E prime on top of C, giving a straight line.',
  [
    text(30, 32, 'Before', { size: 13.5, weight: 700, anchor: 'start' }),
    ...chain([110, 230, 350], 80, ['A', 'B', 'C'], C.main),
    commit(290, 150, 'D', C.feature),
    commit(410, 150, 'E', C.feature),
    arrow(230, 97, 281, 138, C.grey),
    arrow(393, 150, 307, 150, C.grey),
    pill(350, 38, 'main', C.main),
    pill(480, 150, 'feature', C.feature),
    `<line x1="30" y1="200" x2="730" y2="200" stroke="${C.border}"/>`,
    text(30, 232, 'After  git rebase main  (while on feature)', { size: 13.5, weight: 700, anchor: 'start' }),
    ...chain([110, 230, 350], 285, ['A', 'B', 'C'], C.main),
    commit(470, 285, "D'", C.feature),
    commit(590, 285, "E'", C.feature),
    arrow(453, 285, 369, 285, C.grey),
    arrow(573, 285, 487, 285, C.grey),
    commit(290, 345, 'D', C.grey, true),
    commit(410, 345, 'E', C.grey, true),
    text(530, 350, 'old D and E are left behind', { size: 12.5, color: C.muted, anchor: 'start' }),
    pill(350, 243, 'main', C.main),
    pill(590, 243, 'feature', C.feature),
  ],
);

// 6. reset: soft, mixed, hard ----------------------------------------------------
const cell = (x: number, y: number, w: number, h: number, fill: string, label: string, sub: string) => [
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}"/>`,
  text(x + w / 2, y + 26, label, { size: 13.5, color: '#ffffff', weight: 700 }),
  text(x + w / 2, y + 46, sub, { size: 11.5, color: '#ffffff' }),
];
svg(
  'reset',
  760,
  380,
  'git reset: soft, mixed and hard',
  'git reset HEAD~1 moves the branch back by one commit. With --soft the undone changes stay staged, with --mixed they stay in the working directory but unstaged, and with --hard they are discarded.',
  [
    ...chain([110, 270, 430], 60, ['A', 'B', 'C'], C.main),
    pill(430, 20, 'main', C.main),
    arrow(400, 20, 300, 20, C.red, true),
    text(560, 66, 'git reset HEAD~1', { size: 14, mono: true, weight: 700, anchor: 'start' }),
    text(60, 135, '', { size: 12 }),
    text(300, 128, 'Repository', { size: 13, weight: 700 }),
    text(470, 128, 'Staging area', { size: 13, weight: 700 }),
    text(640, 128, 'Working directory', { size: 13, weight: 700 }),
    text(120, 190, '--soft', { size: 15, mono: true, weight: 700 }),
    ...cell(220, 150, 160, 62, C.main, 'main → B', 'C undone'),
    ...cell(390, 150, 160, 62, C.green, 'C’s changes', 'still staged'),
    ...cell(560, 150, 160, 62, C.green, 'C’s changes', 'still on disk'),
    text(120, 262, '--mixed', { size: 15, mono: true, weight: 700 }),
    text(120, 282, '(the default)', { size: 12, color: C.muted }),
    ...cell(220, 232, 160, 62, C.main, 'main → B', 'C undone'),
    ...cell(390, 232, 160, 62, C.grey, 'emptied', 'unstaged'),
    ...cell(560, 232, 160, 62, C.green, 'C’s changes', 'still on disk'),
    text(120, 344, '--hard', { size: 15, mono: true, weight: 700 }),
    ...cell(220, 314, 160, 54, C.main, 'main → B', 'C undone'),
    ...cell(390, 314, 160, 54, C.grey, 'emptied', ''),
    ...cell(560, 314, 160, 54, C.red, 'changes gone', ''),
  ],
);

// 7. Remotes -----------------------------------------------------------------
svg(
  'remote',
  760,
  340,
  'Local and remote repositories',
  'The remote repository origin has main. git fetch copies new commits into your local origin/main without touching main. git merge or git pull brings them into main. git push sends your main commits to origin.',
  [
    box(30, 40, 700, 110, C.border, '#ffffff'),
    text(80, 66, 'origin (GitHub)', { size: 13, weight: 700, anchor: 'start' }),
    ...chain([380, 480, 580], 108, ['A', 'B', 'C'], C.main),
    pill(580, 70, 'main', C.main),
    box(30, 190, 700, 130, C.border, '#ffffff'),
    text(80, 216, 'your computer', { size: 13, weight: 700, anchor: 'start' }),
    ...chain([380, 480], 270, ['A', 'B'], C.main),
    commit(580, 270, 'C', C.grey, true),
    pill(480, 232, 'main', C.main),
    pill(580, 232, 'origin/main', C.grey, 110),
    arrow(580, 158, 580, 198, C.main),
    text(598, 178, 'git fetch', { size: 12.5, mono: true, color: C.main, anchor: 'start' }),
    arrow(440, 198, 440, 158, C.green),
    text(300, 178, 'git push', { size: 12.5, mono: true, color: C.green, anchor: 'start' }),
    text(196, 292, 'git pull = fetch + merge', { size: 12.5, mono: true, color: C.muted, anchor: 'middle' }),
  ],
);

// 8. Cherry-pick ---------------------------------------------------------------
svg(
  'cherry-pick',
  760,
  290,
  'Cherry-pick copies one commit',
  'main has A, B, C. feature has B, D, E. git cherry-pick E copies only commit E onto main as E prime. D is not copied.',
  [
    ...chain([110, 230, 350, 500], 70, ['A', 'B', 'C', "E'"], C.main),
    pill(500, 28, 'main', C.main),
    commit(290, 200, 'D', C.feature),
    commit(410, 200, 'E', C.feature),
    arrow(230, 87, 281, 188, C.grey),
    arrow(393, 200, 307, 200, C.grey),
    pill(410, 250, 'feature', C.feature),
    arrow(400, 184, 480, 94, C.amber, true),
    text(620, 70, 'git cherry-pick E', { size: 13, mono: true, anchor: 'start', color: C.amber }),
    text(620, 92, 'copy of E, new hash', { size: 12, color: C.muted, anchor: 'start' }),
  ],
);


// 9. The life of a file ---------------------------------------------------------
const stateBox = (x: number, y: number, label: string, sub: string, color: string) => [
  `<rect x="${x}" y="${y}" width="170" height="64" rx="10" fill="#ffffff" stroke="${color}" stroke-width="2"/>`,
  text(x + 85, y + 28, label, { weight: 700, color }),
  text(x + 85, y + 48, sub, { size: 12, color: C.muted }),
];
svg(
  'file-lifecycle',
  760,
  330,
  'The life of a file in Git',
  'A new file starts as untracked. git add makes it staged. After git commit it is unmodified. Editing makes it modified, and git add stages it again. The cycle repeats.',
  [
    ...stateBox(515, 24, 'Untracked', 'a new file Git does not know', C.red),
    arrow(600, 90, 600, 146, C.main),
    text(612, 122, 'git add', { size: 12.5, mono: true, color: C.main, anchor: 'start' }),
    ...stateBox(30, 150, 'Unmodified', 'same as the last commit', C.green),
    ...stateBox(272, 150, 'Modified', 'edited, not staged yet', C.amber),
    ...stateBox(515, 150, 'Staged', 'queued for the next commit', C.main),
    arrow(202, 182, 270, 182, C.amber),
    text(236, 172, 'edit', { size: 12.5, mono: true, color: C.amber }),
    arrow(444, 182, 513, 182, C.main),
    text(478, 172, 'git add', { size: 12.5, mono: true, color: C.main }),
    `<path d="M600 216 L600 270 L115 270 L115 218" fill="none" stroke="${C.green}" stroke-width="2" marker-end="url(#ah-${C.green.slice(1)})"/>`,
    text(358, 262, 'git commit', { size: 12.5, mono: true, color: C.green }),
    text(380, 308, 'git status shows each file in one of these states', { size: 13, color: C.muted }),
  ],
);

// 10. Three-way merge --------------------------------------------------------------
svg(
  'three-way-merge',
  760,
  300,
  'How a merge works: three points of comparison',
  'To merge main and feature, Git finds their common ancestor B, the merge base. It compares B to C and B to D, combines both sets of changes, and records the result as the merge commit M.',
  [
    ...chain([110, 250], 130, ['A', 'B'], C.main),
    commit(430, 70, 'C', C.main),
    commit(430, 190, 'D', C.feature),
    arrow(413, 77, 267, 123, C.grey),
    arrow(413, 183, 267, 137, C.grey),
    commit(620, 130, 'M', C.green),
    arrow(605, 117, 447, 74, C.green),
    arrow(605, 143, 447, 186, C.green),
    pill(430, 28, 'main', C.main),
    pill(430, 236, 'feature', C.feature),
    text(250, 208, 'merge base', { size: 12.5, mono: true, color: C.amber }),
    arrow(250, 192, 250, 152, C.amber),
    text(380, 280, 'Git compares B→C and B→D, then combines both sets of changes into M', { size: 13, color: C.muted }),
  ],
);

console.log(`[diagrams] wrote 10 SVGs to ${OUT}`);
