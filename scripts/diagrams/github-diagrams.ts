// Generates the SVG diagrams for the "GitHub from zero to hero" post.
// Usage: npx tsx scripts/diagrams/github-diagrams.ts      (writes public/images/github-zero-to-hero/*.svg)
import { C, arrow, box, chain, commit, outDir, pill, svgWriter, text } from './lib.ts';

const svg = svgWriter(outDir('github-zero-to-hero'));

// 1. Git vs GitHub -------------------------------------------------------------
const features: [string, string][] = [
  ['Issues', C.amber],
  ['Pull requests', C.main],
  ['Actions', C.green],
  ['Pages', C.feature],
  ['Projects', C.amber],
  ['Releases', C.main],
];
const pillW = (s: string) => s.length * 8.2 + 22;
const pillsTotal = features.reduce((n, [s]) => n + pillW(s), 0) + (features.length - 1) * 14;
let px = (760 - pillsTotal) / 2;
const featurePills = features.map(([s, col]) => {
  const w = pillW(s);
  const out = pill(px + w / 2, 292, s, col, w);
  px += w + 14;
  return out;
});

svg(
  'git-vs-github',
  760,
  330,
  'Git and GitHub',
  'Git runs on your computer and keeps the repository history. GitHub hosts a copy of the repository online. git push uploads commits to GitHub, and git fetch or git pull downloads them. On top of the hosted repository GitHub adds issues, pull requests, Actions, Pages, projects and releases.',
  [
    box(20, 40, 260, 200),
    box(480, 40, 260, 200),
    text(150, 70, 'Your computer', { weight: 700 }),
    text(150, 90, 'Git, works offline', { size: 12, color: C.muted }),
    text(610, 70, 'GitHub', { weight: 700 }),
    text(610, 90, 'a website that hosts Git repos', { size: 12, color: C.muted }),
    ...chain([75, 150, 225], 140, ['A', 'B', 'C'], C.main),
    ...chain([535, 610, 685], 140, ['A', 'B', 'C'], C.main),
    text(150, 192, 'local repository', { size: 12.5, color: C.muted }),
    text(610, 192, 'remote repository (origin)', { size: 12.5, color: C.muted }),
    arrow(284, 115, 476, 115, C.main),
    text(380, 104, 'git push', { size: 12.5, mono: true, color: C.main }),
    arrow(476, 170, 284, 170, C.grey),
    text(380, 192, 'git fetch / git pull', { size: 12.5, mono: true, color: C.muted }),
    text(380, 268, 'On top of the hosted repository, GitHub adds:', { size: 13, color: C.muted }),
    ...featurePills,
  ],
);

// 2. GitHub flow ---------------------------------------------------------------
const steps: [string, string, string][] = [
  ['Create', 'a branch', 'from main'],
  ['Commit', 'and push', 'small commits'],
  ['Open a', 'pull request', 'draft if unsure'],
  ['Review', 'and discuss', 'CI + teammates'],
  ['Merge', 'the PR', 'into main'],
  ['Delete', 'the branch', 'keep it tidy'],
];
const stepX = (i: number) => 15 + i * 125;
const stepCx = (i: number) => stepX(i) + 52.5;
svg(
  'github-flow',
  760,
  300,
  'The GitHub flow',
  'Six steps: create a branch from main, commit and push, open a pull request, review and discuss, merge into main, delete the branch. While reviewing, you push more commits to the same branch and the pull request updates.',
  [
    ...steps.flatMap(([l1, l2, sub], i) => [
      box(stepX(i), 50, 105, 120, i === 4 ? C.green : C.border),
      `<circle cx="${stepCx(i)}" cy="78" r="13" fill="${i === 4 ? C.green : C.main}"/>`,
      text(stepCx(i), 83, String(i + 1), { size: 13, color: '#ffffff', weight: 700 }),
      text(stepCx(i), 116, l1, { size: 14, weight: 700 }),
      text(stepCx(i), 134, l2, { size: 14, weight: 700 }),
      text(stepCx(i), 156, sub, { size: 11.5, color: C.muted }),
      ...(i > 0 ? [arrow(stepX(i) - 19, 110, stepX(i) - 2, 110, C.grey)] : []),
    ]),
    `<path d="M${stepCx(3)} 172 L${stepCx(3)} 206 L${stepCx(1)} 206 L${stepCx(1)} 174" fill="none" stroke="${C.amber}" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#ah-${C.amber.slice(1)})"/>`,
    text((stepCx(1) + stepCx(3)) / 2, 226, 'changes requested? push more commits', { size: 12.5, color: C.amber }),
    text(380, 272, 'main stays working the whole time, because unfinished work lives on a branch', { size: 13, color: C.muted }),
  ],
);

// 3. Fork workflow ---------------------------------------------------------------
svg(
  'fork-workflow',
  760,
  330,
  'Contributing to someone else\'s project with a fork',
  'The original repository is called upstream. You fork it on GitHub to get your own copy, clone the fork to your computer, push your branch to the fork, and open a pull request from the fork back to upstream. git fetch upstream brings new upstream commits to your computer.',
  [
    box(285, 20, 190, 86, C.main),
    text(380, 52, 'upstream', { weight: 700, mono: true, color: C.main }),
    text(380, 72, 'the original project', { size: 12, color: C.muted }),
    text(380, 90, 'on GitHub, not yours', { size: 12, color: C.muted }),
    box(40, 190, 210, 96, C.feature),
    text(145, 222, 'your fork', { weight: 700, mono: true, color: C.feature }),
    text(145, 242, 'your copy on GitHub', { size: 12, color: C.muted }),
    text(145, 260, 'you can push here', { size: 12, color: C.muted }),
    box(510, 190, 210, 96, C.green),
    text(615, 222, 'your computer', { weight: 700, mono: true, color: C.green }),
    text(615, 242, 'the local clone', { size: 12, color: C.muted }),
    text(615, 260, 'where you edit', { size: 12, color: C.muted }),
    arrow(300, 108, 140, 188, C.feature),
    text(190, 134, 'Fork', { size: 12.5, mono: true, color: C.feature, anchor: 'end' }),
    arrow(222, 188, 345, 109, C.amber, true),
    text(300, 178, 'Pull request', { size: 12.5, mono: true, color: C.amber, anchor: 'start' }),
    arrow(254, 218, 506, 218, C.green),
    text(380, 208, 'git clone', { size: 12.5, mono: true, color: C.green }),
    arrow(506, 262, 254, 262, C.main),
    text(380, 282, 'git push', { size: 12.5, mono: true, color: C.main }),
    arrow(440, 108, 580, 188, C.grey, true),
    text(530, 134, 'git fetch upstream', { size: 12.5, mono: true, color: C.muted, anchor: 'start' }),
    text(380, 316, 'Keep the fork current with upstream, then branch from it for each change', { size: 13, color: C.muted }),
  ],
);

// 4. Actions anatomy ---------------------------------------------------------------
const job = (x: number, title: string, steps: string[]) => [
  box(x, 78, 210, 170, C.green),
  text(x + 105, 102, title, { size: 13, weight: 700, mono: true, color: C.green }),
  text(x + 105, 120, 'runs on a runner', { size: 11.5, color: C.muted }),
  ...steps.flatMap((s, i) => [
    `<rect x="${x + 12}" y="${134 + i * 34}" width="186" height="26" rx="6" fill="${C.soft}"/>`,
    text(x + 22, 152 + i * 34, s, { size: 12, mono: true, anchor: 'start' }),
  ]),
];
svg(
  'actions-anatomy',
  780,
  300,
  'How a GitHub Actions workflow is built',
  'An event such as a push or a pull request triggers a workflow, which is a YAML file in .github/workflows. The workflow has jobs. Each job runs on a runner and consists of steps. A job can wait for another with needs.',
  [
    box(20, 100, 150, 90, C.amber),
    text(95, 130, 'Event', { weight: 700, color: C.amber }),
    text(95, 152, 'push', { size: 12.5, mono: true }),
    text(95, 170, 'pull_request', { size: 12.5, mono: true }),
    arrow(172, 145, 223, 145, C.amber),
    box(225, 28, 535, 232, C.border, '#ffffff', true),
    text(492, 54, 'Workflow  (.github/workflows/ci.yml)', { weight: 700 }),
    ...job(245, 'job: test', ['uses: actions/checkout', 'run: npm ci', 'run: npm test']),
    ...job(530, 'job: deploy', ['uses: actions/checkout', 'run: npm run build', 'uses: deploy-pages']),
    arrow(457, 163, 528, 163, C.green),
    text(492, 154, 'needs', { size: 12.5, mono: true, color: C.green }),
    text(390, 288, 'Jobs run in parallel unless one needs another. Steps in a job run in order.', { size: 13, color: C.muted }),
  ],
);

// 5. Three ways to merge a pull request ---------------------------------------------------------------
const rowLabel = (y: number, name: string, sub: string) => [
  text(24, y - 2, name, { size: 14, weight: 700, mono: true, anchor: 'start' }),
  text(24, y + 18, sub, { size: 12, color: C.muted, anchor: 'start' }),
];
svg(
  'merge-methods',
  760,
  400,
  'Three ways to merge a pull request',
  'The pull request branch has three commits C, D and E on top of main commit B. Merge commit keeps C, D and E and adds a merge commit M with two parents. Squash and merge turns C, D and E into one new commit S. Rebase and merge copies C, D and E onto main as C prime, D prime and E prime with no merge commit.',
  [
    text(380, 28, 'Same pull request: C, D, E on a branch, main is at B. Result on main:', { size: 13, color: C.muted }),
    ...rowLabel(100, 'Merge commit', 'keeps every commit + a merge'),
    ...chain([300, 370], 110, ['A', 'B'], C.main),
    commit(600, 110, 'M', C.green),
    arrow(583, 110, 389, 110, C.green),
    ...chain([430, 490, 550], 56, ['C', 'D', 'E'], C.feature),
    arrow(413, 63, 382, 100, C.grey),
    arrow(583, 100, 567, 66, C.green),
    text(680, 114, 'two parents', { size: 12, color: C.muted }),
    `<line x1="20" y1="158" x2="740" y2="158" stroke="${C.border}"/>`,
    ...rowLabel(230, 'Squash and merge', 'one new commit for the PR'),
    ...chain([300, 370, 440], 240, ['A', 'B', 'S'], C.main),
    text(530, 244, 'S = C + D + E in one commit', { size: 12, color: C.muted, anchor: 'start' }),
    `<line x1="20" y1="288" x2="740" y2="288" stroke="${C.border}"/>`,
    ...rowLabel(340, 'Rebase and merge', 'copies each commit, no merge'),
    ...chain([300, 370, 440, 510, 580], 350, ['A', 'B', 'C′', 'D′', 'E′'], C.main),
    text(680, 354, 'new hashes', { size: 12, color: C.muted }),
  ],
);

console.log(`[diagrams] wrote 5 SVGs to ${outDir('github-zero-to-hero')}`);
