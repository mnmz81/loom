import { beforeAll, describe, expect, it } from 'vitest';
import { createRenderer, countWords, type Renderer } from './markdown';

let render: Renderer;
beforeAll(async () => {
  render = await createRenderer();
});

describe('markdown renderer', () => {
  it('adds ids to h2/h3 and builds a toc', () => {
    const { html, toc } = render('## Why signals\n\ntext\n\n### Computed values\n\n#### Deep\n');
    expect(html).toContain('<h2 id="why-signals">');
    expect(html).toContain('<h3 id="computed-values">');
    expect(toc).toEqual([
      { id: 'why-signals', text: 'Why signals', depth: 2 },
      { id: 'computed-values', text: 'Computed values', depth: 3 },
    ]);
  });

  it('builds plain-text toc entries from inline markdown', () => {
    const { toc } = render("## Using `signal()` and *more*\n\n### Don't [link](http://x.y)\n");
    expect(toc).toEqual([
      { id: 'using-signal-and-more', text: 'Using signal() and more', depth: 2 },
      { id: 'dont-link', text: 'Don’t link', depth: 3 },
    ]);
  });

  it('keeps Hebrew heading text in ids and toc', () => {
    const { html, toc } = render('## דוגמה ראשונה\n');
    expect(toc).toEqual([{ id: 'דוגמה-ראשונה', text: 'דוגמה ראשונה', depth: 2 }]);
    expect(html).toContain('<h2 id="דוגמה-ראשונה">');
  });

  it('de-duplicates heading ids within a document', () => {
    const { toc } = render('## Setup\n\n## Setup\n');
    expect(toc.map((t) => t.id)).toEqual(['setup', 'setup-1']);
  });

  it('resets heading ids between documents', () => {
    render('## Setup\n');
    expect(render('## Setup\n').toc[0].id).toBe('setup');
  });

  it('does not render an h1 into the toc', () => {
    expect(render('# Title\n\n## Sub\n').toc).toEqual([{ id: 'sub', text: 'Sub', depth: 2 }]);
  });

  it('highlights code with shiki dual themes', () => {
    const { html } = render('```ts\nconst a = 1;\n```\n');
    expect(html).toContain('class="shiki shiki-themes github-light github-dark');
    expect(html).toContain('--shiki-dark:');
  });

  it('highlights fences regardless of language case and for aliases and new languages', () => {
    const tokenColors = (html: string) => new Set(html.match(/--shiki-light:#[0-9A-Fa-f]{6}/g)).size;
    const plain = tokenColors(render('```nope\nconst a = 1;\n```\n').html);
    for (const lang of ['TS', 'Ts', 'tsx', 'jsx', 'sh', 'zsh']) {
      const { html } = render('```' + lang + '\nconst a = 1;\n```\n');
      expect(tokenColors(html), lang).toBeGreaterThan(plain);
    }
    const samples: Record<string, string> = {
      rust: 'fn main() { let x: i32 = 1; }',
      go: 'func main() { var x int = 1 }',
      toml: '[package]\nname = "x"\nversion = 1',
      dockerfile: 'FROM node:24\nRUN npm ci',
    };
    for (const [lang, code] of Object.entries(samples)) {
      const { html } = render('```' + lang + '\n' + code + '\n```\n');
      expect(tokenColors(html), lang).toBeGreaterThan(plain);
    }
  });

  it('falls back to plain text for unknown languages', () => {
    const { html } = render('```nope\nhello\n```\n');
    expect(html).toContain('<pre class="shiki');
    expect(html).toContain('hello');
  });

  it('marks every <pre> as ltr and focusable (fenced, no-lang, indented)', () => {
    const { html } = render('```rust\nlet x = 1;\n```\n\n```\nplain\n```\n\ntext\n\n    indented code\n');
    const pres = html.match(/<pre\b[^>]*>/g) ?? [];
    expect(pres).toHaveLength(3);
    for (const pre of pres) {
      expect(pre).toContain('dir="ltr"');
      expect(pre).toContain('tabindex="0"');
    }
    expect(html).toContain('indented code');
  });

  it('escapes raw HTML', () => {
    const { html } = render('<script>alert(1)</script>\n');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders GFM tables and linkifies URLs', () => {
    const { html } = render('| a | b |\n|---|---|\n| 1 | 2 |\n\nsee https://angular.dev\n');
    expect(html).toContain('<table>');
    expect(html).toContain('<a href="https://angular.dev">');
  });

  it('lazy-loads images', () => {
    expect(render('![alt](/images/x/1.png)\n').html).toContain('loading="lazy"');
  });

  it('computes reading time with a minimum of 1 minute', () => {
    expect(render('short').readingMinutes).toBe(1);
    expect(render('word '.repeat(1000)).readingMinutes).toBe(5);
  });

  it('counts Hebrew words for reading time', () => {
    expect(render('מילה '.repeat(1000)).readingMinutes).toBe(5);
  });
});

describe('countWords', () => {
  it('counts Latin and Hebrew words and ignores markdown punctuation', () => {
    expect(countWords('## שלום world\n\n- one\n- שתיים\n\n| a | b |\n|---|---|')).toBe(6);
    expect(countWords("don't stop ו-&mut")).toBe(4);
    expect(countWords('')).toBe(0);
  });
});
