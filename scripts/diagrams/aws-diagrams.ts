// Generates the SVG diagrams for the "AWS from zero to hero" post.
// Usage: npx tsx scripts/diagrams/aws-diagrams.ts      (writes public/images/aws-zero-to-hero/*.svg)
import { C, arrow, box, outDir, pill, svgWriter, text } from './lib.ts';

const svg = svgWriter(outDir('aws-zero-to-hero'));

const bar = (x: number, y: number, w: number, h: number, label: string, fill: string, color = '#ffffff', sub = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}"/>` +
  text(x + w / 2, y + h / 2 + (sub ? -2 : 5), label, { size: 13, color, weight: 600 }) +
  (sub ? text(x + w / 2, y + h / 2 + 14, sub, { size: 11, color }) : '');

// 1. Regions and Availability Zones ------------------------------------------------------------
svg(
  'regions-and-azs',
  760,
  340,
  'Regions and Availability Zones',
  'One Region contains three Availability Zones, each made of one or more data centers, connected by low-latency links. A second Region sits apart from the first and is isolated from it.',
  [
    // Region 1
    box(20, 20, 520, 270, C.main),
    text(40, 46, 'Region  (for example eu-central-1)', { size: 14, weight: 700, anchor: 'start', color: C.main }),
    ...[0, 1, 2].flatMap((i) => {
      const x = 40 + i * 165;
      return [
        box(x, 70, 150, 170, C.green, '#f0fdf4'),
        text(x + 75, 94, `Availability Zone ${'abc'[i]}`, { size: 13, weight: 700 }),
        bar(x + 15, 108, 120, 30, 'Data center', C.grey),
        bar(x + 15, 146, 120, 30, 'Data center', C.grey),
        text(x + 75, 204, 'own power, cooling,', { size: 11.5, color: C.muted }),
        text(x + 75, 220, 'network, building', { size: 11.5, color: C.muted }),
      ];
    }),
    arrow(190, 255, 205, 255, C.green),
    arrow(205, 255, 190, 255, C.green),
    arrow(355, 255, 370, 255, C.green),
    arrow(370, 255, 355, 255, C.green),
    text(280, 272, 'fast, low-latency links between the zones', { size: 12, color: C.muted }),
    // Region 2
    box(570, 20, 170, 270, C.grey, '#ffffff', true),
    text(655, 46, 'Another Region', { size: 14, weight: 700, color: C.muted }),
    bar(590, 70, 130, 80, 'its own AZs', C.soft, C.text),
    text(655, 190, 'Isolated from the', { size: 12, color: C.muted }),
    text(655, 207, 'first Region:', { size: 12, color: C.muted }),
    text(655, 224, 'your data stays where', { size: 12, color: C.muted }),
    text(655, 241, 'you put it', { size: 12, color: C.muted }),
    text(380, 322, 'Spread across zones to survive a failure of one. Pick the Region for latency, cost and legal rules.', { size: 13, color: C.muted }),
  ],
);

// 2. A VPC with public and private subnets ------------------------------------------------------------
svg(
  'vpc-layout',
  760,
  470,
  'A VPC with public and private subnets',
  'The internet reaches an internet gateway on the edge of the VPC. Inside the VPC, two Availability Zones each hold a public subnet with a web server and a private subnet with a database. The web servers talk to the databases; nothing from the internet reaches the private subnets directly.',
  [
    bar(280, 18, 200, 36, 'Internet', C.grey),
    arrow(380, 56, 380, 84, C.main),
    text(470, 76, 'internet gateway', { size: 12.5, mono: true, color: C.main }),
    box(20, 90, 720, 330, C.main),
    text(40, 114, 'VPC  10.0.0.0/16', { size: 14, weight: 700, anchor: 'start', color: C.main, mono: true }),
    ...[0, 1].flatMap((i) => {
      const x = 40 + i * 350;
      return [
        box(x, 130, 330, 276, C.border, '#ffffff', true),
        text(x + 165, 150, `Availability Zone ${'ab'[i]}`, { size: 13, weight: 700, color: C.muted }),
        // public subnet
        box(x + 15, 162, 300, 100, C.green, '#f0fdf4'),
        text(x + 305, 184, `Public subnet  10.0.${i}.0/24`, { size: 12.5, weight: 700, anchor: 'end', mono: true }),
        bar(x + 80, 198, 170, 46, 'Web server (EC2)', C.green, '#ffffff', 'route to the internet gateway'),
        // private subnet
        box(x + 15, 290, 300, 100, C.amber, '#fffbeb'),
        text(x + 305, 312, `Private subnet  10.0.${i + 2}.0/24`, { size: 12.5, weight: 700, anchor: 'end', mono: true }),
        bar(x + 80, 326, 170, 46, i === 0 ? 'Database (RDS primary)' : 'Database (RDS standby)', C.amber, '#ffffff', 'no route from the internet'),
        arrow(x + 92, 246, x + 92, 324, C.main),
      ];
    }),
    text(380, 446, 'Security groups: the web tier accepts 80/443 from anywhere; the database accepts 5432 only from the web servers.', { size: 12.5, color: C.muted }),
    text(380, 462, 'Port 5432 is PostgreSQL; MySQL uses 3306.', { size: 12.5, color: C.muted }),
  ],
);

// 3. IAM: who can do what on which resource ------------------------------------------------------------
svg(
  'iam-permissions',
  760,
  330,
  'How IAM decides a request',
  'A principal such as a person signed in through IAM Identity Center or a role used by an EC2 instance makes a request. IAM checks the policies: with no matching Allow the request is denied by default, and an explicit Deny always wins. If a policy allows it, the request reaches the resource, for example an S3 bucket.',
  [
    box(20, 40, 190, 120, C.main),
    text(115, 70, 'Principal', { size: 15, weight: 700, color: C.main }),
    text(115, 94, 'who is asking', { size: 12, color: C.muted }),
    text(115, 118, 'a person (SSO) or a role', { size: 12.5 }),
    text(115, 136, 'used by an app', { size: 12.5 }),
    arrow(212, 100, 288, 100, C.main),
    text(250, 90, 'request', { size: 12, color: C.main, mono: true }),
    box(290, 20, 190, 160, C.amber, '#fffbeb'),
    text(385, 48, 'IAM policy check', { size: 15, weight: 700, color: C.amber }),
    text(385, 76, 'Effect: Allow', { size: 12.5, mono: true }),
    text(385, 96, 'Action: s3:GetObject', { size: 12.5, mono: true }),
    text(385, 116, 'Resource: bucket/*', { size: 12.5, mono: true }),
    text(385, 146, 'explicit Deny always wins', { size: 12, color: C.red, weight: 600 }),
    arrow(482, 100, 558, 100, C.green),
    text(520, 90, 'allowed', { size: 12, color: C.green, mono: true }),
    box(560, 40, 180, 120, C.green, '#f0fdf4'),
    text(650, 70, 'Resource', { size: 15, weight: 700, color: C.green }),
    text(650, 94, 'what is touched', { size: 12, color: C.muted }),
    text(650, 120, 'an S3 bucket, an EC2', { size: 12.5 }),
    text(650, 138, 'instance, a database...', { size: 12.5 }),
    arrow(385, 182, 385, 234, C.red, true),
    pill(385, 252, 'AccessDenied', C.red, 130),
    text(385, 290, 'No matching Allow means denied: everything starts closed.', { size: 13, color: C.muted }),
    text(385, 310, 'Grant the smallest permission that gets the job done (least privilege).', { size: 13, color: C.muted }),
  ],
);
