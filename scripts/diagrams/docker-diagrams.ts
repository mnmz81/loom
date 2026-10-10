// Generates the SVG diagrams for the "Docker from zero to hero" post.
// Usage: npx tsx scripts/diagrams/docker-diagrams.ts      (writes public/images/docker-zero-to-hero/*.svg)
import { C, arrow, box, outDir, pill, svgWriter, text } from './lib.ts';

const svg = svgWriter(outDir('docker-zero-to-hero'));

const bar = (x: number, y: number, w: number, h: number, label: string, fill: string, color = '#ffffff', sub = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}"/>` +
  text(x + w / 2, y + h / 2 + (sub ? -2 : 5), label, { size: 13, color, weight: 600 }) +
  (sub ? text(x + w / 2, y + h / 2 + 14, sub, { size: 11, color }) : '');

// 1. Containers vs virtual machines ------------------------------------------------------------
svg(
  'containers-vs-vms',
  760,
  360,
  'Containers compared with virtual machines',
  'A virtual machine stack has hardware, a host operating system with a hypervisor, and then several virtual machines, each with its own guest operating system, libraries and app. A container stack has hardware, a host operating system, the Docker Engine, and then several containers that only hold libraries and an app and share the host kernel.',
  [
    text(192, 34, 'Virtual machines', { size: 15, weight: 700 }),
    text(567, 34, 'Containers', { size: 15, weight: 700 }),
    // VMs
    bar(30, 290, 325, 34, 'Hardware', C.grey),
    bar(30, 248, 325, 34, 'Host OS + hypervisor', C.muted),
    ...[30, 197].flatMap((x) => [
      `<rect x="${x}" y="52" width="158" height="188" rx="10" fill="#ffffff" stroke="${C.border}" stroke-width="1.5"/>`,
      bar(x + 10, 62, 138, 36, 'App', C.main),
      bar(x + 10, 104, 138, 30, 'Libraries', C.soft, C.text),
      bar(x + 10, 140, 138, 90, 'Guest OS', C.amber, '#ffffff', 'its own kernel'),
    ]),
    // Containers
    bar(405, 290, 325, 34, 'Hardware', C.grey),
    bar(405, 248, 325, 34, 'Host OS  (one shared kernel)', C.muted),
    bar(405, 206, 325, 34, 'Docker Engine', C.green),
    ...[405, 513, 621].flatMap((x) => [
      `<rect x="${x}" y="52" width="103" height="146" rx="10" fill="#ffffff" stroke="${C.border}" stroke-width="1.5"/>`,
      bar(x + 8, 62, 87, 40, 'App', C.main),
      bar(x + 8, 108, 87, 34, 'Libraries', C.soft, C.text),
    ]),
    text(380, 350, 'Containers share the host kernel: they start in moments and take far less space.', { size: 13, color: C.muted }),
  ],
);

// 2. Dockerfile -> image -> container, registry ------------------------------------------------------------
svg(
  'image-to-container',
  760,
  320,
  'From Dockerfile to image to container',
  'A Dockerfile is built into an image with docker build. docker run starts one or more containers from the image. An image can be pushed to a registry such as Docker Hub with docker push and downloaded again with docker pull.',
  [
    box(20, 100, 120, 80, C.border),
    text(80, 136, 'Dockerfile', { weight: 700, mono: true, size: 13 }),
    text(80, 156, 'the recipe', { size: 12, color: C.muted }),
    arrow(142, 140, 258, 140, C.main),
    text(200, 128, 'docker build', { size: 12.5, mono: true, color: C.main }),
    box(260, 100, 120, 80, C.main),
    text(320, 136, 'Image', { weight: 700, color: C.main }),
    text(320, 156, 'read-only', { size: 12, color: C.muted }),
    arrow(382, 125, 498, 92, C.green),
    arrow(382, 155, 498, 172, C.green),
    text(440, 143, 'docker run', { size: 12.5, mono: true, color: C.green }),
    box(500, 64, 150, 56, C.green),
    text(575, 88, 'Container 1', { weight: 700, color: C.green }),
    text(575, 106, 'running', { size: 12, color: C.muted }),
    box(500, 144, 150, 56, C.green),
    text(575, 168, 'Container 2', { weight: 700, color: C.green }),
    text(575, 186, 'running', { size: 12, color: C.muted }),
    box(260, 236, 120, 56, C.feature),
    text(320, 260, 'Registry', { weight: 700, color: C.feature }),
    text(320, 278, 'e.g. Docker Hub', { size: 11.5, color: C.muted }),
    arrow(300, 182, 300, 234, C.feature),
    text(292, 213, 'docker push', { size: 12.5, mono: true, color: C.feature, anchor: 'end' }),
    arrow(340, 234, 340, 184, C.feature, true),
    text(348, 213, 'docker pull', { size: 12.5, mono: true, color: C.feature, anchor: 'start' }),
    text(575, 252, 'One image can start', { size: 12.5, color: C.muted }),
    text(575, 270, 'as many containers as you like', { size: 12.5, color: C.muted }),
  ],
);

// 3. Layers and cache ------------------------------------------------------------
const layers: [string, string, string, string][] = [
  ['container layer (read-write)', C.green, 'new per container', C.grey],
  ['COPY . .', C.amber, 'rebuilt', C.amber],
  ['RUN npm ci --omit=dev', C.main, 'cached', C.green],
  ['COPY package*.json ./', C.main, 'cached', C.green],
  ['WORKDIR /app', C.main, 'cached', C.green],
  ['FROM node:24-slim', C.muted, 'cached', C.green],
];
svg(
  'image-layers',
  760,
  370,
  'Image layers and the build cache',
  'An image is a stack of read-only layers, one per Dockerfile instruction: FROM node:24-slim, WORKDIR, COPY package files, RUN npm ci, COPY of the source. Every container adds its own thin read-write layer on top. After editing a source file only the COPY of the source is rebuilt, and the layers below it come from the cache.',
  [
    ...layers.flatMap(([label, col, tag, tagCol], i) => {
      const y = 28 + i * 46;
      return [
        `<rect x="40" y="${y}" width="340" height="40" rx="8" fill="${col}"${i === 0 ? ` fill-opacity="0.15" stroke="${col}" stroke-dasharray="5 4"` : ''}/>`,
        text(56, y + 25, label, { size: 13, mono: true, anchor: 'start', color: i === 0 ? C.green : '#ffffff', weight: 600 }),
        pill(540, y + 20, tag, tagCol, 160),
      ];
    }),
    text(210, 316, 'read-only image layers (bottom) + one writable layer (top)', { size: 12, color: C.muted }),
    text(380, 346, 'Edit a source file: only COPY . . and what comes after it run again.', { size: 13, color: C.muted }),
  ],
);

// 4. Ports and networks ------------------------------------------------------------
svg(
  'ports-and-networks',
  760,
  340,
  'Publishing ports and container networks',
  'Your browser reaches the web container through a published port, 8080 on the host mapped to 3000 in the container. The web and db containers sit on the same user-defined network, so web reaches the database by its name, db, on port 5432. The database port is not published, so nothing outside can reach it.',
  [
    box(20, 20, 720, 270, C.border, '#ffffff', true),
    text(100, 44, 'Your computer (host)', { size: 12.5, color: C.muted }),
    box(30, 115, 130, 90, C.border),
    text(95, 152, 'Browser', { weight: 700 }),
    text(95, 174, 'localhost:8080', { size: 12, mono: true, color: C.muted }),
    box(290, 56, 430, 220, C.green, C.panel),
    text(505, 80, 'user-defined network', { size: 12.5, color: C.green, weight: 600 }),
    arrow(162, 160, 308, 160, C.main),
    text(228, 148, '-p 8080:3000', { size: 12, mono: true, color: C.main }),
    box(310, 110, 140, 100, C.main),
    text(380, 148, 'web', { weight: 700, color: C.main, mono: true }),
    text(380, 170, 'listens on :3000', { size: 12, color: C.muted }),
    box(560, 110, 140, 100, C.amber),
    text(630, 148, 'db', { weight: 700, color: C.amber, mono: true }),
    text(630, 170, 'listens on :5432', { size: 12, color: C.muted }),
    arrow(452, 160, 558, 160, C.green),
    text(505, 240, 'web reaches the database as  db:5432', { size: 12, mono: true, color: C.green }),
    text(630, 196, 'not published', { size: 11.5, color: C.red }),
    text(380, 322, 'Publish only what the outside needs. -p 127.0.0.1:8080:3000 keeps it reachable from this computer only.', { size: 13, color: C.muted }),
  ],
);

// 5. Data: volumes, bind mounts, tmpfs ------------------------------------------------------------
const source = (y: number, title: string, l1: string, l2: string, col: string) => [
  box(30, y, 250, 76, col),
  text(155, y + 28, title, { weight: 700, color: col }),
  text(155, y + 48, l1, { size: 12, color: C.muted }),
  text(155, y + 64, l2, { size: 12, color: C.muted }),
];
svg(
  'storage-options',
  760,
  340,
  'Where a container can keep data',
  'A container has its own writable layer that disappears when the container is removed. A volume is managed by Docker and survives removal. A bind mount is a folder on your computer that you can edit live. A tmpfs mount lives in memory and is gone when the container stops.',
  [
    ...source(30, 'Volume', 'managed by Docker', 'survives removing the container', C.green),
    ...source(130, 'Bind mount', 'a folder on your computer', 'edit it live, from either side', C.main),
    ...source(230, 'tmpfs', 'kept in memory only', 'gone when the container stops', C.amber),
    arrow(282, 68, 548, 68, C.green),
    text(415, 58, '-v mydata:/app/data', { size: 12, mono: true, color: C.green }),
    arrow(282, 168, 548, 168, C.main),
    text(415, 158, '-v "$(pwd)":/app', { size: 12, mono: true, color: C.main }),
    arrow(282, 268, 548, 268, C.amber),
    text(415, 258, '--tmpfs /tmp', { size: 12, mono: true, color: C.amber }),
    box(550, 30, 190, 276, C.border),
    text(645, 138, 'Container', { weight: 700 }),
    text(645, 162, 'its own writable layer', { size: 12, color: C.muted }),
    text(645, 180, 'disappears when the', { size: 12, color: C.muted }),
    text(645, 198, 'container is removed', { size: 12, color: C.muted }),
    text(380, 324, 'Anything that must outlive the container goes in a volume (or a bind mount).', { size: 13, color: C.muted }),
  ],
);

console.log(`[diagrams] wrote 5 SVGs to ${outDir('docker-zero-to-hero')}`);
