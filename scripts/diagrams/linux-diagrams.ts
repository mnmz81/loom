// Generates the SVG diagram for the "Linux commands cheat sheet" post.
// Usage: npx tsx scripts/diagrams/linux-diagrams.ts      (writes public/images/linux-commands/*.svg)
import { C, box, outDir, svgWriter, text } from './lib.ts';

const svg = svgWriter(outDir('linux-commands'));

// Reading `ls -l` permissions and the matching chmod number ------------------------------------------------------------
const groups = [
  { x: 150, label: 'Owner', letters: 'rwx', sum: '4 + 2 + 1 = 7', color: C.main },
  { x: 330, label: 'Group', letters: 'r-x', sum: '4 + 0 + 1 = 5', color: C.green },
  { x: 510, label: 'Others', letters: 'r--', sum: '4 + 0 + 0 = 4', color: C.amber },
];

svg(
  'permissions',
  760,
  300,
  'Reading file permissions',
  'The ls -l permission string -rwxr-xr-- has a file type character and three triplets: the owner can read, write and execute (7), the group can read and execute (5), and others can only read (4). Together that is the chmod number 754. Read is worth 4, write 2, execute 1.',
  [
    text(380, 34, '-rwxr-xr--  1  alice  dev  4096  Oct 10  deploy.sh', { size: 16, mono: true, weight: 700 }),
    box(30, 58, 90, 120, C.border),
    text(75, 86, 'Type', { size: 14, weight: 700 }),
    text(75, 114, '-', { size: 26, mono: true }),
    text(75, 140, 'regular file', { size: 11.5, color: C.muted }),
    text(75, 156, '(d = directory,', { size: 11.5, color: C.muted }),
    text(75, 170, 'l = link)', { size: 11.5, color: C.muted }),
    ...groups.flatMap((g) => [
      box(g.x - 20, 58, 170, 120, g.color),
      text(g.x + 65, 86, g.label, { size: 14, weight: 700, color: g.color }),
      text(g.x + 65, 120, g.letters, { size: 28, mono: true, weight: 700 }),
      text(g.x + 65, 152, g.sum, { size: 13, mono: true, color: C.muted }),
    ]),
    box(690, 58, 50, 120, C.border),
    text(715, 120, '754', { size: 20, mono: true, weight: 700 }),
    text(715, 146, 'chmod', { size: 11.5, color: C.muted }),
    text(380, 214, 'r = read (4)     w = write (2)     x = execute (1)     - = not granted', { size: 14, mono: true }),
    text(380, 244, 'On a directory, x means "may enter it and reach the files inside".', { size: 13, color: C.muted }),
    text(380, 266, 'chmod 754 deploy.sh   or   chmod u=rwx,g=rx,o=r deploy.sh', { size: 13, mono: true, color: C.muted }),
  ],
);
