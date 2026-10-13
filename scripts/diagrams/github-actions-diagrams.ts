// Generates the SVG diagrams for the "GitHub Actions from zero to hero" post.
// Usage: npx tsx scripts/diagrams/github-actions-diagrams.ts      (writes public/images/github-actions-zero-to-hero/*.svg)
import { C, arrow, box, outDir, pill, svgWriter, text } from './lib.ts';

const svg = svgWriter(outDir('github-actions-zero-to-hero'));

const job = (x: number, y: number, w: number, title: string, sub: string, col: string) =>
  box(x, y, w, 56, col) +
  text(x + w / 2, y + 24, title, { weight: 700, color: col, mono: true, size: 13 }) +
  text(x + w / 2, y + 43, sub, { size: 11.5, color: C.muted });

// 1. Anatomy: event -> workflow -> jobs -> steps, on runners ------------------------------------------------------------
svg(
  'workflow-anatomy',
  760,
  360,
  'The parts of a GitHub Actions workflow',
  'An event such as push, pull_request, schedule or workflow_dispatch starts a workflow, a YAML file in .github/workflows. The workflow has jobs. Each job runs on its own fresh runner machine and is a list of steps. A step either runs a shell command with run or uses a reusable action with uses.',
  [
    pill(90, 60, 'push', C.feature, 120),
    pill(90, 96, 'pull_request', C.feature, 120),
    pill(90, 132, 'schedule', C.feature, 120),
    pill(90, 168, 'workflow_dispatch', C.feature, 150),
    text(90, 30, 'Events', { weight: 700, color: C.feature }),
    arrow(168, 114, 218, 114, C.feature),
    box(220, 20, 520, 290, C.main, C.panel),
    text(480, 44, '.github/workflows/ci.yml', { weight: 700, mono: true, color: C.main, size: 13 }),
    ...[0, 1].flatMap((i) => {
      const x = 240 + i * 250;
      const name = i === 0 ? 'job: test' : 'job: build';
      return [
        box(x, 60, 230, 236, C.green),
        text(x + 115, 84, name, { weight: 700, mono: true, color: C.green, size: 13 }),
        text(x + 115, 102, 'runs-on: ubuntu-latest', { size: 11.5, mono: true, color: C.muted }),
        ...(i === 0
          ? ['uses: actions/checkout', 'uses: actions/setup-node', 'run: npm ci', 'run: npm test']
          : ['uses: actions/checkout', 'run: npm ci', 'run: npm run build', 'uses: upload-artifact']
        ).map(
          (s, k) =>
            `<rect x="${x + 14}" y="${118 + k * 42}" width="202" height="32" rx="7" fill="${s.startsWith('run') ? C.soft : '#dbeafe'}"/>` +
            text(x + 115, 139 + k * 42, s, { size: 12, mono: true }),
        ),
      ];
    }),
    text(480, 336, 'Jobs run in parallel on separate machines unless one says needs: other-job.', { size: 13, color: C.muted }),
  ],
);

// 2. A pipeline of jobs with needs and an environment ------------------------------------------------------------
svg(
  'job-graph',
  760,
  330,
  'Jobs that depend on each other',
  'lint and three test jobs from a matrix run in parallel. build needs all of them, so it waits until they pass. deploy-staging needs build. deploy-production needs deploy-staging and uses the production environment, which waits for a reviewer to approve before it runs.',
  [
    job(20, 30, 140, 'lint', 'parallel', C.green),
    job(20, 100, 140, 'test (node 22)', 'matrix', C.green),
    job(20, 170, 140, 'test (node 24)', 'matrix', C.green),
    job(20, 240, 140, 'test (node 26)', 'matrix', C.green),
    job(220, 135, 130, 'build', 'needs: lint, test', C.main),
    ...[58, 128, 198, 268].map((y) => arrow(162, y, 218, 163, C.grey)),
    arrow(352, 163, 398, 163, C.grey),
    job(400, 135, 150, 'deploy-staging', 'needs: build', C.amber),
    arrow(552, 163, 588, 163, C.grey),
    job(590, 135, 150, 'deploy-prod', 'needs: deploy-staging', C.red),
    box(590, 205, 150, 70, C.red, '#ffffff', true),
    text(665, 230, 'environment:', { size: 12, mono: true, color: C.red }),
    text(665, 248, 'production', { size: 12, mono: true, color: C.red }),
    text(665, 266, 'waits for approval', { size: 11.5, color: C.muted }),
    text(380, 316, 'needs: makes a job wait for others and skips it if one of them fails.', { size: 13, color: C.muted }),
  ],
);

// 3. Matrix ------------------------------------------------------------
svg(
  'matrix',
  760,
  300,
  'A matrix expands one job into many',
  'A job with strategy.matrix os: ubuntu-latest and windows-latest, and node: 22, 24 and 26 expands into six jobs, one for each combination, and they all run in parallel.',
  [
    box(20, 40, 250, 200, C.main),
    text(40, 70, 'strategy:', { mono: true, size: 13, color: C.main, weight: 700, anchor: 'start' }),
    text(56, 100, 'matrix:', { mono: true, size: 13, anchor: 'start' }),
    text(72, 128, 'os: [ubuntu-latest,', { mono: true, size: 12.5, anchor: 'start' }),
    text(115, 148, 'windows-latest]', { mono: true, size: 12.5, anchor: 'start' }),
    text(72, 178, 'node: [22, 24, 26]', { mono: true, size: 12.5, anchor: 'start' }),
    text(145, 220, '2 x 3 = 6 jobs', { size: 13, color: C.muted }),
    arrow(272, 140, 328, 140, C.main),
    ...['ubuntu-latest', 'windows-latest'].flatMap((os, r) =>
      [22, 24, 26].map((n, c) => job(330 + c * 140, 40 + r * 100, 128, `node ${n}`, os, r === 0 ? C.green : C.amber)),
    ),
    text(540, 230, 'All six start at once (up to max-parallel).', { size: 12.5, color: C.muted }),
    text(380, 284, 'One failing combination cancels the rest unless fail-fast: false.', { size: 13, color: C.muted }),
  ],
);

// 4. Cache vs artifacts ------------------------------------------------------------
svg(
  'cache-vs-artifacts',
  760,
  340,
  'Cache compared with artifacts',
  'A cache is saved under a key, such as a hash of package-lock.json, and restored by later workflow runs to speed them up. An artifact is a file a job uploads, which a later job in the same run can download, and which people can download from the run page.',
  [
    text(190, 34, 'Cache: speed up the next run', { weight: 700, color: C.green }),
    box(30, 54, 140, 70, C.border),
    text(100, 84, 'Run #41', { weight: 700 }),
    text(100, 104, 'npm ci (slow)', { size: 12, color: C.muted }),
    arrow(172, 89, 228, 89, C.green),
    text(200, 78, 'save', { size: 12, color: C.green }),
    box(230, 54, 140, 70, C.green),
    text(300, 80, 'cache', { weight: 700, color: C.green }),
    text(300, 100, 'key: hash of', { size: 11.5, color: C.muted, mono: true }),
    text(300, 115, 'package-lock', { size: 11.5, color: C.muted, mono: true }),
    arrow(300, 126, 300, 168, C.green),
    text(310, 152, 'restore', { size: 12, color: C.green, anchor: 'start' }),
    box(230, 170, 140, 70, C.border),
    text(300, 200, 'Run #42', { weight: 700 }),
    text(300, 220, 'npm ci (fast)', { size: 12, color: C.muted }),
    `<line x1="390" y1="30" x2="390" y2="270" stroke="${C.border}" stroke-width="1.5"/>`,
    text(575, 34, 'Artifact: hand files on', { weight: 700, color: C.main }),
    box(410, 54, 140, 70, C.border),
    text(480, 84, 'job: build', { weight: 700, mono: true, size: 13 }),
    text(480, 104, 'makes dist/', { size: 12, color: C.muted }),
    arrow(552, 89, 598, 89, C.main),
    text(575, 78, 'upload', { size: 12, color: C.main }),
    box(600, 54, 140, 70, C.main),
    text(670, 84, 'artifact', { weight: 700, color: C.main }),
    text(670, 104, 'stored with the run', { size: 11.5, color: C.muted }),
    arrow(640, 126, 520, 168, C.main),
    text(545, 140, 'download', { size: 12, color: C.main, anchor: 'end' }),
    box(410, 170, 140, 70, C.border),
    text(480, 200, 'job: deploy', { weight: 700, mono: true, size: 13 }),
    text(480, 220, 'same run', { size: 12, color: C.muted }),
    arrow(690, 126, 690, 168, C.main, true),
    box(620, 170, 120, 70, C.border, '#ffffff', true),
    text(680, 200, 'You', { weight: 700 }),
    text(680, 220, 'from the run page', { size: 11.5, color: C.muted }),
    text(380, 300, 'Cache: may be missing, never required for correctness.', { size: 13, color: C.muted }),
    text(380, 322, 'Artifact: the actual output of a run (builds, reports, logs).', { size: 13, color: C.muted }),
  ],
);

// 5. OIDC instead of long-lived keys ------------------------------------------------------------
svg(
  'oidc',
  760,
  330,
  'Deploying with OIDC instead of stored keys',
  'Instead of storing a long-lived cloud access key as a secret, the job asks GitHub for a short-lived OIDC token that says which repository, branch and workflow it is. The cloud provider checks the token against a trust rule and returns temporary credentials that expire in about an hour.',
  [
    box(20, 120, 170, 90, C.green),
    text(105, 150, 'Workflow job', { weight: 700, color: C.green }),
    text(105, 170, 'permissions:', { size: 12, mono: true, color: C.muted }),
    text(105, 188, 'id-token: write', { size: 12, mono: true, color: C.muted }),
    box(300, 20, 170, 80, C.main),
    text(385, 52, 'GitHub OIDC', { weight: 700, color: C.main }),
    text(385, 74, 'token provider', { size: 12, color: C.muted }),
    arrow(130, 118, 298, 66, C.main),
    text(195, 80, '1. request token', { size: 12, color: C.main, anchor: 'end' }),
    arrow(318, 102, 172, 150, C.main, true),
    text(270, 140, '2. signed token', { size: 12, color: C.main, anchor: 'start' }),
    text(270, 156, 'repo, branch, workflow', { size: 11.5, color: C.muted, anchor: 'start' }),
    box(560, 120, 180, 90, C.amber),
    text(650, 150, 'Cloud (e.g. AWS)', { weight: 700, color: C.amber }),
    text(650, 170, 'trust rule: only', { size: 12, color: C.muted }),
    text(650, 188, 'this repo + main', { size: 12, color: C.muted }),
    arrow(192, 196, 558, 196, C.amber),
    text(375, 188, '3. exchange token', { size: 12, color: C.amber }),
    arrow(558, 214, 192, 214, C.green, true),
    text(375, 232, '4. temporary credentials (expire in about an hour)', { size: 12, color: C.green }),
    pill(380, 280, 'no long-lived key stored anywhere', C.green, 300),
  ],
);

console.log(`[diagrams] wrote 5 SVGs to ${outDir('github-actions-zero-to-hero')}`);
