// Generates the SVG diagrams for the AI series posts.
// Usage: npx tsx scripts/diagrams/ai-diagrams.ts      (writes public/images/ai-*/*.svg)
import { C, arrow, box, outDir, svgWriter, text } from './lib.ts';

// ai-what-is-llm: the next-token loop ------------------------------------------------------------------------------------
const llm = svgWriter(outDir('ai-what-is-llm'));
const probs: [string, number][] = [
  ['Paris', 0.92],
  ['Lyon', 0.03],
  ['France', 0.02],
];

llm(
  'next-token-loop',
  760,
  290,
  'The next-token loop',
  'The model reads the text so far, produces a probability for every possible next token, one token is picked and appended to the text, and the loop repeats until the model emits a stop token or reaches the token limit.',
  [
    box(30, 40, 190, 80, C.main),
    text(125, 70, 'Text so far', { size: 14, weight: 700, color: C.main }),
    text(125, 96, 'The capital of France is', { size: 12.5, mono: true }),
    arrow(220, 80, 280, 80, C.muted),
    box(280, 40, 140, 80, C.border),
    text(350, 76, 'Model', { size: 16, weight: 700 }),
    text(350, 98, '(a big function)', { size: 12, color: C.muted }),
    arrow(420, 80, 480, 80, C.muted),
    box(480, 24, 250, 112, C.green),
    text(605, 50, 'Probability per next token', { size: 13, weight: 700, color: C.green }),
    ...probs.flatMap(([tok, p], i) => [
      text(520, 78 + i * 24, tok, { size: 12.5, mono: true, anchor: 'start' }),
      `<rect x="590" y="${67 + i * 24}" width="${Math.max(3, p * 100)}" height="12" rx="3" fill="${C.green}"/>`,
      text(722, 78 + i * 24, `${Math.round(p * 100)}%`, { size: 12, color: C.muted, anchor: 'end' }),
    ]),
    arrow(605, 136, 605, 190, C.muted),
    box(480, 190, 250, 56, C.amber),
    text(605, 214, 'Pick one token', { size: 14, weight: 700, color: C.amber }),
    text(605, 234, '" Paris"', { size: 13, mono: true }),
    arrow(480, 218, 125, 218, C.muted, true),
    arrow(125, 218, 125, 124, C.muted, true),
    text(300, 208, 'append to the text and repeat', { size: 12.5, color: C.muted }),
    text(380, 274, 'Stops at a stop token or at max_tokens', { size: 12.5, color: C.muted }),
  ],
);

// ai-how-models-are-built: the training stages ---------------------------------------------------------------------------
const built = svgWriter(outDir('ai-how-models-are-built'));
const stages = [
  { x: 30, title: 'Pretraining', lines: ['huge amounts of text', 'predict the next token'], out: 'base model', color: C.main },
  { x: 280, title: 'Fine-tuning (SFT)', lines: ['example conversations', 'written by people'], out: 'follows instructions', color: C.green },
  { x: 530, title: 'Preference training', lines: ['RLHF, DPO, Constitutional AI', 'better answer vs worse'], out: 'assistant', color: C.amber },
];
built(
  'training-stages',
  760,
  220,
  'How a chat model is trained',
  'Three stages: pretraining on huge amounts of text produces a base model that continues text; supervised fine-tuning on example conversations teaches it to follow instructions; preference training such as RLHF, DPO or Constitutional AI teaches it which answers are better, producing an assistant.',
  [
    ...stages.flatMap((s, i) => [
      box(s.x, 30, 200, 110, s.color),
      text(s.x + 100, 60, s.title, { size: 15, weight: 700, color: s.color }),
      text(s.x + 100, 88, s.lines[0], { size: 12.5 }),
      text(s.x + 100, 108, s.lines[1], { size: 12.5, color: C.muted }),
      text(s.x + 100, 180, `→ ${s.out}`, { size: 13, weight: 700 }),
      arrow(s.x + 100, 140, s.x + 100, 164, s.color),
      ...(i < stages.length - 1 ? [arrow(s.x + 200, 85, s.x + 250, 85, C.muted)] : []),
    ]),
    text(380, 208, 'Most of the knowledge comes from stage 1; stages 2 and 3 shape behavior.', { size: 12.5, color: C.muted }),
  ],
);

// ai-tokens-context-window: what fills the context window ------------------------------------------------------------
const ctx = svgWriter(outDir('ai-tokens-context-window'));
const parts: [string, number, string][] = [
  ['System prompt', 125, C.main],
  ['Tool definitions', 135, C.feature],
  ['Turn 1', 90, C.grey],
  ['Turn 2', 90, C.grey],
  ['New message', 100, C.green],
  ['Answer', 130, C.amber],
];
let cx = 30;
ctx(
  'context-window',
  760,
  190,
  'What fills the context window',
  'The context window holds everything in one request: the system prompt, tool definitions, every earlier turn of the conversation, the new user message, and the answer the model writes, including thinking. When the total reaches the model limit, the request fails or the answer stops.',
  [
    text(380, 34, 'One request = everything the model sees + what it writes', { size: 14, weight: 700 }),
    ...parts.flatMap(([label, w, color]) => {
      const x = cx;
      cx += w;
      return [
        `<rect x="${x}" y="58" width="${w - 4}" height="56" rx="6" fill="${color}" opacity="0.9"/>`,
        text(x + (w - 4) / 2, 91, label, { size: 12, color: '#ffffff', weight: 600 }),
      ];
    }),
    `<rect x="30" y="58" width="700" height="56" rx="6" fill="none" stroke="${C.text}" stroke-width="1.5" stroke-dasharray="6 4"/>`,
    text(730, 134, 'limit', { size: 12, anchor: 'end', color: C.muted }),
    text(30, 134, 'input tokens', { size: 12, anchor: 'start', color: C.muted }),
    text(575, 134, 'output tokens', { size: 12, anchor: 'start', color: C.amber }),
    text(380, 168, 'Each new turn resends the whole history, so the window fills up as the conversation grows.', { size: 12.5, color: C.muted }),
  ],
);

// ai-rag-pipeline: indexing and query paths ------------------------------------------------------------------------------
const rag = svgWriter(outDir('ai-rag-pipeline'));
const idx = ['Documents', 'Split into chunks', 'Embed chunks', 'Vector store'];
const qry = ['Question', 'Embed question', 'Top-k chunks', 'Prompt + chunks → LLM'];
const row = (labels: string[], y: number, color: string) =>
  labels.flatMap((label, i) => {
    const x = 30 + i * 182;
    return [
      box(x, y, 160, 50, color),
      text(x + 80, y + 30, label, { size: 13, weight: 600 }),
      ...(i < labels.length - 1 ? [arrow(x + 160, y + 25, x + 182, y + 25, C.muted)] : []),
    ];
  });
rag(
  'rag-pipeline',
  760,
  250,
  'The RAG pipeline',
  'Indexing, done once: documents are split into chunks, each chunk is embedded, and the vectors are stored. Answering, for every question: the question is embedded, the closest chunks are retrieved from the vector store, and the question plus the chunks are sent to the LLM.',
  [
    text(30, 32, 'Indexing (once, and on every document change)', { size: 13, weight: 700, color: C.main, anchor: 'start' }),
    ...row(idx, 44, C.main),
    text(30, 140, 'Answering (every question)', { size: 13, weight: 700, color: C.green, anchor: 'start' }),
    ...row(qry, 152, C.green),
    arrow(656, 94, 476, 152, C.muted, true),
    text(620, 128, 'search', { size: 12, color: C.muted }),
    text(380, 236, 'The model answers from the retrieved text, not from memory.', { size: 12.5, color: C.muted }),
  ],
);
