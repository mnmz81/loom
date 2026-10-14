// Generates the SVG diagrams for the Claude Code posts.
// Usage: npx tsx scripts/diagrams/claude-code-diagrams.ts      (writes public/images/claude-code-*/*.svg)
import { C, box, outDir, svgWriter, text } from './lib.ts';

// claude-code-mods: the layers an event passes through ------------------------------------------------------------------
const mods = svgWriter(outDir('claude-code-mods'));
const layers: { label: string; color: string }[] = [
  { label: "prepend · the organization's guards (prependPlugins, sec-default)", color: C.red },
  { label: 'user · the mods you installed or loaded with --plugin-dir', color: C.main },
  { label: 'append · organization defaults (appendPlugins)', color: C.amber },
  { label: 'builtin · mods that ship inside Claude Code (/diff, AGENTS.md)', color: C.muted },
];

mods(
  'hook-layers',
  760,
  400,
  'The layers a mod event passes through',
  'An event such as tool.call enters the outermost layer, the organization guard mods in prependPlugins. Each hook calls next(e) to pass it one layer in: the mods the user installed, then the organization defaults in appendPlugins, then the mods built into Claude Code, and finally Claude Code itself, which runs the tool. The result comes back out through the same layers. A hook that returns an answer without calling next stops the event at its layer.',
  [
    text(380, 32, 'tool.call goes in with next(e), the result comes back out the same way', { size: 13, color: C.muted }),
    ...layers.flatMap((l, i) => {
      const x = 30 + i * 30;
      const y = 50 + i * 42;
      return [
        box(x, y, 700 - i * 60, 330 - i * 52, l.color),
        text(x + 16, y + 26, l.label, { size: 13, color: l.color, weight: 700, anchor: 'start' }),
      ];
    }),
    box(150, 216, 460, 118, C.green, '#f0fdf4'),
    text(380, 254, 'core · Claude Code itself', { size: 15, weight: 700, color: C.green }),
    text(380, 280, 'the permission check runs, then the tool runs', { size: 13 }),
    text(380, 314, 'a hook that answers { deny } without next(e) stops it earlier', { size: 12.5, color: C.muted }),
  ],
);
