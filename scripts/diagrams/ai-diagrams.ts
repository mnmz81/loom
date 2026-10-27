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

// ai-tools-function-calling: the tool use loop ----------------------------------------------------------------------------
const tools = svgWriter(outDir('ai-tools-function-calling'));
tools(
  'tool-loop',
  760,
  270,
  'The tool use loop',
  'Your app sends the messages and the tool definitions to the model. If the model answers with stop_reason tool_use, your code runs the requested tool and sends the result back as a tool_result in a new user message. The loop repeats until the model answers with end_turn.',
  [
    box(30, 40, 200, 90, C.main),
    text(130, 72, 'Your app', { size: 15, weight: 700, color: C.main }),
    text(130, 96, 'messages + tools', { size: 12.5, mono: true }),
    box(530, 40, 200, 90, C.green),
    text(630, 72, 'Model', { size: 15, weight: 700, color: C.green }),
    text(630, 96, 'decides: answer or call', { size: 12.5 }),
    arrow(230, 70, 530, 70, C.main),
    text(380, 60, 'request', { size: 12.5, color: C.muted }),
    arrow(530, 105, 230, 105, C.green),
    text(390, 150, 'stop_reason: "tool_use"  +  tool_use block', { size: 12, mono: true, color: C.green }),
    box(30, 170, 200, 70, C.amber),
    text(130, 198, 'Run the tool', { size: 14, weight: 700, color: C.amber }),
    text(130, 220, 'your code, your rules', { size: 12, color: C.muted }),
    arrow(130, 130, 130, 170, C.amber),
    `<line x1="230" y1="205" x2="630" y2="205" stroke="${C.amber}" stroke-width="2" stroke-dasharray="6 4"/>`,
    arrow(630, 205, 630, 130, C.amber, true),
    text(430, 226, 'tool_result → next request', { size: 12, mono: true, color: C.amber }),
    text(380, 258, 'Repeats until stop_reason: "end_turn"', { size: 12.5, mono: true, color: C.muted }),
  ],
);

// ai-mcp: hosts, clients and servers ---------------------------------------------------------------------------------------
const mcp = svgWriter(outDir('ai-mcp'));
const servers = [
  { y: 30, name: 'Files & Git', where: 'local · stdio' },
  { y: 110, name: 'Database', where: 'local · stdio' },
  { y: 190, name: 'External API', where: 'remote · Streamable HTTP' },
];
mcp(
  'mcp-architecture',
  760,
  300,
  'MCP architecture',
  'A host application such as an IDE or chat app runs one MCP client per server. Each client talks to exactly one server over JSON-RPC, using stdio for local servers or Streamable HTTP for remote ones. Servers expose tools, resources and prompts.',
  [
    box(30, 30, 300, 230, C.main),
    text(180, 58, 'Host (IDE, chat app, agent)', { size: 14, weight: 700, color: C.main }),
    text(180, 80, 'holds the conversation and the model', { size: 12, color: C.muted }),
    ...servers.flatMap((s, i) => [
      box(190, 100 + i * 55, 120, 40, C.border),
      text(250, 125 + i * 55, `Client ${i + 1}`, { size: 13, weight: 600 }),
      arrow(310, 120 + i * 55, 470, s.y + 30, C.muted),
      box(470, s.y, 260, 60, C.green),
      text(600, s.y + 26, s.name, { size: 14, weight: 700, color: C.green }),
      text(600, s.y + 46, s.where, { size: 12, color: C.muted }),
    ]),
    text(60, 130, 'one client', { size: 12, color: C.muted, anchor: 'start' }),
    text(60, 148, 'per server', { size: 12, color: C.muted, anchor: 'start' }),
    text(380, 288, 'Servers offer tools, resources and prompts over JSON-RPC.', { size: 12.5, color: C.muted }),
  ],
);

// ai-agents: workflow vs agent ---------------------------------------------------------------------------------------------
const agents = svgWriter(outDir('ai-agents'));
const flow = ['Step 1', 'Step 2', 'Step 3'];
agents(
  'workflow-vs-agent',
  760,
  260,
  'Workflow versus agent',
  'In a workflow, your code fixes the path: step 1, step 2, step 3, each an LLM call. In an agent, the model chooses the next action in a loop: it acts with a tool, observes the result from the environment, and decides again until the task is done.',
  [
    text(190, 34, 'Workflow: your code decides the path', { size: 14, weight: 700, color: C.main }),
    ...flow.flatMap((label, i) => [
      box(30 + i * 115, 70, 95, 50, C.main),
      text(77 + i * 115, 100, label, { size: 13, weight: 600 }),
      ...(i < flow.length - 1 ? [arrow(125 + i * 115, 95, 145 + i * 115, 95, C.muted)] : []),
    ]),
    text(190, 160, 'Predictable, cheaper, easy to test.', { size: 12.5, color: C.muted }),
    `<line x1="390" y1="20" x2="390" y2="240" stroke="${C.border}" stroke-width="1.5"/>`,
    text(575, 34, 'Agent: the model decides the next step', { size: 14, weight: 700, color: C.green }),
    box(500, 60, 150, 44, C.green),
    text(575, 87, 'Model decides', { size: 13, weight: 600 }),
    box(420, 150, 120, 44, C.amber),
    text(480, 177, 'Act (tool)', { size: 13, weight: 600 }),
    box(610, 150, 120, 44, C.feature),
    text(670, 177, 'Observe result', { size: 13, weight: 600 }),
    arrow(530, 104, 490, 150, C.muted),
    arrow(540, 172, 610, 172, C.muted),
    arrow(670, 150, 625, 104, C.muted),
    text(575, 230, 'Flexible, costs more, needs limits.', { size: 12.5, color: C.muted }),
  ],
);

// ai-workflow-patterns: five patterns ------------------------------------------------------------------------------------
const pat = svgWriter(outDir('ai-workflow-patterns'));
const node = (x: number, y: number, label: string, color: string, w = 64) => [
  box(x - w / 2, y - 14, w, 28, color),
  text(x, y + 5, label, { size: 12, weight: 600 }),
];
// A fan: one source node, three targets 36px apart, centered on y.
const fan = (y: number, fromX: number, toX: number, labels: string[], color: string, w: number) =>
  labels.flatMap((label, i) => {
    const ty = y + (i - 1) * 36;
    return [arrow(fromX, y, toX - w / 2, ty, C.muted), ...node(toX, ty, label, color, w)];
  });
const title = (y: number, label: string) => text(30, y + 5, label, { size: 13.5, weight: 700, color: C.main, anchor: 'start' });
pat(
  'patterns',
  760,
  560,
  'Five workflow patterns',
  'Prompt chaining: calls in sequence with a check between them. Routing: a classifier sends the input to one of several handlers. Parallelization: several calls run at once and the results are combined. Orchestrator-workers: a lead model splits the task and delegates to workers. Evaluator-optimizer: one model writes, another evaluates, in a loop.',
  [
    title(40, '1. Prompt chaining'),
    ...node(260, 40, 'LLM', C.main), arrow(292, 40, 330, 40, C.muted), ...node(370, 40, 'check', C.amber),
    arrow(402, 40, 440, 40, C.muted), ...node(480, 40, 'LLM', C.main), arrow(512, 40, 550, 40, C.muted), ...node(590, 40, 'LLM', C.main),

    title(150, '2. Routing'),
    ...node(260, 150, 'router', C.amber, 70),
    ...fan(150, 295, 490, ['billing', 'tech', 'small model'], C.main, 104),

    title(270, '3. Parallelization'),
    ...node(260, 270, 'input', C.grey),
    ...fan(270, 292, 460, ['LLM', 'LLM', 'LLM'], C.main, 60),
    ...[-36, 0, 36].map((d) => arrow(490, 270 + d, 582, 270, C.muted)),
    ...node(622, 270, 'combine', C.amber, 76),

    title(390, '4. Orchestrator-workers'),
    ...node(290, 390, 'orchestrator', C.green, 100),
    ...fan(390, 340, 490, ['worker', 'worker', 'worker'], C.main, 76),
    text(640, 394, 'tasks decided at run time', { size: 12, color: C.muted }),

    title(500, '5. Evaluator-optimizer'),
    ...node(290, 494, 'writer', C.main, 76),
    arrow(328, 488, 438, 488, C.muted),
    ...node(480, 494, 'evaluator', C.amber, 84),
    arrow(438, 502, 328, 502, C.amber, true),
    text(384, 524, 'feedback', { size: 11.5, color: C.amber }),
    text(620, 498, 'until it passes', { size: 12, color: C.muted }),
  ],
);

// ai-guardrails: layers around the model -----------------------------------------------------------------------------------
const guard = svgWriter(outDir('ai-guardrails'));
const layers = [
  { label: 'Input checks', sub: 'screen, validate, limit', color: C.amber },
  { label: 'Model', sub: 'prompt + policy', color: C.main },
  { label: 'Output checks', sub: 'schema, PII, grounding', color: C.amber },
  { label: 'Action checks', sub: 'permissions, confirm', color: C.feature },
];
guard(
  'guardrail-layers',
  760,
  200,
  'Guardrail layers',
  'A request passes through input checks (screening, validation and rate limits), then the model with its prompt and policy, then output checks (schema, personal data, grounding), and finally action checks (permissions and human confirmation) before anything reaches the user or the outside world. Each layer can block or fall back.',
  [
    text(30, 100, 'User', { size: 14, weight: 700, anchor: 'start' }),
    arrow(70, 95, 96, 95, C.muted),
    ...layers.flatMap((l, i) => {
      const x = 100 + i * 158;
      return [
        box(x, 60, 138, 70, l.color),
        text(x + 69, 90, l.label, { size: 14, weight: 700, color: l.color }),
        text(x + 69, 112, l.sub, { size: 11.5, color: C.muted }),
        ...(i < layers.length - 1 ? [arrow(x + 138, 95, x + 158, 95, C.muted)] : []),
      ];
    }),
    text(380, 34, 'Each layer can block, fix, or fall back to a safe answer.', { size: 13, color: C.muted }),
    text(380, 170, 'No single layer is enough; together they make failures rare and small.', { size: 12.5, color: C.muted }),
  ],
);

// ai-decision-map: which technique to use ----------------------------------------------------------------------------------
const map = svgWriter(outDir('ai-decision-map'));
const q = (y: number, question: string, yes: string, color: string) => [
  box(30, y, 400, 46, C.border),
  text(230, y + 28, question, { size: 13, weight: 600 }),
  arrow(430, y + 23, 490, y + 23, color),
  text(460, y + 16, 'yes', { size: 11.5, color }),
  box(490, y, 240, 46, color),
  text(610, y + 28, yes, { size: 13, weight: 700, color }),
];
map(
  'decision-map',
  760,
  470,
  'Decision map',
  'Go down the questions in order. Is the output wrong because the instructions are unclear? Improve the prompt. Does the model lack knowledge or need fresh or private data? Use RAG. Must it act or look things up? Give it tools. Are the steps known in advance? Use a workflow. Are they open-ended? Use an agent. Does behavior or format still fall short after all of that, with enough data? Fine-tune. Is the job narrow, high-volume or offline? Use a small, distilled or local model. Every step is checked with evals.',
  [
    text(30, 30, 'Start at the top. Stop at the first "yes" that fixes the problem, measure, repeat.', { size: 13, color: C.muted, anchor: 'start' }),
    ...q(46, 'Unclear task, wrong format or tone?', 'Better prompt', C.main),
    ...q(106, 'Missing, fresh or private knowledge?', 'RAG', C.green),
    ...q(166, 'Needs to look things up or act?', 'Tools', C.amber),
    ...q(226, 'Several steps, known in advance?', 'Workflow', C.amber),
    ...q(286, 'Open-ended, steps unknown?', 'Agent', C.feature),
    ...q(346, 'Behavior still off, enough good data?', 'Fine-tune', C.main),
    ...q(406, 'Narrow, high-volume or offline job?', 'Small / local model', C.green),
    ...[46, 106, 166, 226, 286, 346].map((y) => arrow(230, y + 46, 230, y + 60, C.grey)),
  ],
);

// ai-webmcp: MCP server versus WebMCP tools in a page ---------------------------------------------------------------------
const webmcp = svgWriter(outDir('ai-webmcp'));
webmcp(
  'mcp-vs-webmcp',
  760,
  330,
  'MCP compared with WebMCP',
  'With MCP, an agent host connects to a separate MCP server process, which calls your backend API with its own credentials. With WebMCP, the web page itself registers tools with document.modelContext.registerTool. An agent in the browser calls a tool, the tool runs as JavaScript inside the open page, using the page code and the user session, and the user watches the page update.',
  [
    text(190, 34, 'MCP: a separate server', { size: 14, weight: 700, color: C.main }),
    box(30, 60, 140, 70, C.main),
    text(100, 90, 'Agent host', { size: 13, weight: 700 }),
    text(100, 110, 'IDE, chat app', { size: 12, color: C.muted }),
    arrow(100, 132, 100, 168, C.muted),
    text(110, 154, 'JSON-RPC', { size: 11.5, color: C.muted, anchor: 'start', mono: true }),
    box(30, 170, 140, 70, C.green),
    text(100, 200, 'MCP server', { size: 13, weight: 700, color: C.green }),
    text(100, 220, 'its own process', { size: 12, color: C.muted }),
    arrow(172, 205, 238, 205, C.muted),
    box(240, 170, 120, 70, C.border),
    text(300, 200, 'Your API', { size: 13, weight: 700 }),
    text(300, 220, 'own credentials', { size: 12, color: C.muted }),
    `<line x1="390" y1="20" x2="390" y2="290" stroke="${C.border}" stroke-width="1.5"/>`,
    text(575, 34, 'WebMCP: tools inside the page', { size: 14, weight: 700, color: C.feature }),
    box(410, 60, 330, 190, C.feature, C.panel),
    text(575, 82, 'Browser tab (the user is here)', { size: 12.5, color: C.muted }),
    box(425, 96, 300, 70, C.border),
    text(575, 122, 'Web page', { size: 13, weight: 700 }),
    text(575, 144, 'document.modelContext.registerTool()', { size: 11.5, mono: true, color: C.feature }),
    box(425, 186, 140, 50, C.main),
    text(495, 216, 'Browser agent', { size: 12.5, weight: 700, color: C.main }),
    arrow(510, 184, 540, 168, C.main),
    text(600, 200, 'calls a tool:', { size: 11.5, color: C.muted, anchor: 'start' }),
    text(600, 216, 'JS runs in the page,', { size: 11.5, color: C.muted, anchor: 'start' }),
    text(600, 232, 'with the user session', { size: 11.5, color: C.muted, anchor: 'start' }),
    text(380, 316, 'Same idea (named tools with a JSON Schema), different place: a backend server vs. the open page.', { size: 12.5, color: C.muted }),
  ],
);

// ai-end-to-end-app: one request through the support assistant -----------------------------------------------------------
const e2e = svgWriter(outDir('ai-end-to-end-app'));
const steps: [string, string, string][] = [
  ['Question', 'from the user', C.text],
  ['Screen', 'small model', C.red],
  ['Retrieve', 'top chunks', C.green],
  ['Answer', 'model + tools', C.main],
  ['Reply', 'with sources', C.text],
];
e2e(
  'app-flow',
  760,
  260,
  'One request through the support assistant',
  'A question is first screened by a small, fast model. If it is on-topic and safe, the closest help-center chunks are retrieved, and the main model answers from them, calling the order-status tool when it needs live data. The reply cites its sources. Every request is logged with latency and token usage, and an eval set runs on every change to the prompt or the code.',
  [
    ...steps.flatMap(([label, sub, color], i) => {
      const x = 30 + i * 146;
      return [
        box(x, 40, 124, 64, color),
        text(x + 62, 66, label, { size: 14, weight: 700, color }),
        text(x + 62, 88, sub, { size: 12, color: C.muted }),
        ...(i < steps.length - 1 ? [arrow(x + 124, 72, x + 146, 72, C.muted)] : []),
      ];
    }),
    arrow(238, 104, 238, 150, C.red, true),
    text(238, 168, 'off-topic or harmful:', { size: 12, color: C.red }),
    text(238, 184, 'polite refusal', { size: 12, color: C.red }),
    box(476, 140, 124, 50, C.amber, '#ffffff', true),
    text(538, 170, 'order status', { size: 12.5, weight: 600, color: C.amber }),
    arrow(530, 104, 530, 140, C.amber),
    arrow(546, 140, 546, 104, C.amber),
    text(380, 226, 'Logged on every request: latency, tokens, cache reads, tool calls.', { size: 12.5, color: C.muted }),
    text(380, 246, 'Evals run on every change to the prompt or the code.', { size: 12.5, color: C.muted }),
  ],
);

// ai-agent-harness: frozen model, editable harness, and the loop that improves it ---------------------------------------
const harness = svgWriter(outDir('ai-agent-harness'));
const harnessLayers = [
  'Context: prompt, tool docs, skills',
  'State: memory, progress files',
  'Control: loop, limits, subagents',
  'Checks: guardrails, tests, sandbox',
  'Extensions: tools, MCP, plugins',
];
const improve = ['Eval set', 'Run the agent', 'Read the traces', 'Change one thing', 'Keep it if the score rises'];
harness(
  'harness-loop',
  760,
  300,
  'A frozen model inside an editable harness',
  'Left: at run time the harness sends context to a frozen model, and the model answers with tool calls that the harness runs. The harness has five groups: context (prompt, tool docs, skills), state (memory, progress files), control (loop, limits, subagents), checks (guardrails, tests, sandbox) and extensions (tools, MCP, plugins). Right: the harness improves in a loop: run the agent on an eval set, read the traces, change one thing, and keep the change only if the score rises.',
  [
    text(195, 34, 'The agent at run time', { size: 14, weight: 700, color: C.main }),
    box(95, 48, 200, 40, C.grey, C.soft),
    text(195, 73, 'Frozen model', { size: 13.5, weight: 700 }),
    arrow(160, 130, 160, 88, C.muted),
    text(150, 114, 'context', { size: 12, color: C.muted, anchor: 'end' }),
    arrow(230, 88, 230, 130, C.muted),
    text(240, 114, 'tool calls', { size: 12, color: C.muted, anchor: 'start' }),
    box(30, 130, 330, 154, C.main),
    text(195, 152, 'Editable harness', { size: 13.5, weight: 700, color: C.main }),
    ...harnessLayers.map((label, i) => text(50, 178 + i * 22, label, { size: 12.5, anchor: 'start' })),
    `<line x1="390" y1="20" x2="390" y2="280" stroke="${C.border}" stroke-width="1.5"/>`,
    text(575, 34, 'Improving the harness', { size: 14, weight: 700, color: C.green }),
    ...improve.flatMap((label, i) => [
      box(470, 48 + i * 48, 210, 32, i === 0 ? C.amber : C.green),
      text(575, 69 + i * 48, label, { size: 12.5, weight: 600 }),
      ...(i < improve.length - 1 ? [arrow(575, 80 + i * 48, 575, 96 + i * 48, C.muted)] : []),
    ]),
    `<path d="M680 256 H712 V112 H682" fill="none" stroke="${C.muted}" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#ah-${C.muted.slice(1)})"/>`,
  ],
);
