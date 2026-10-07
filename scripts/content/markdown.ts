import GithubSlugger from 'github-slugger';
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import { createHighlighter, type ShikiTransformer } from 'shiki';
import type { TocItem } from '../../src/app/core/content.models';

// Token type from markdown-it's own bundled typings (v15), not @types/markdown-it.
type Token = ReturnType<InstanceType<typeof MarkdownIt>['parse']>[number];

export interface RenderedMarkdown {
  html: string;
  toc: TocItem[];
  readingMinutes: number;
}

export type Renderer = (markdown: string) => RenderedMarkdown;

const LANGS = [
  'ts', 'js', 'json', 'html', 'css', 'scss', 'bash', 'shell', 'python', 'yaml', 'markdown', 'diff', 'sql', 'java',
  'tsx', 'jsx', 'sh', 'zsh', 'rust', 'go', 'toml', 'dockerfile',
];
const THEMES = { light: 'github-light', dark: 'github-dark' } as const;
const WORDS_PER_MINUTE = 200;

// Code is always LTR (the site is RTL by default) and keyboard-scrollable.
const ltrFocusablePre: ShikiTransformer = {
  pre(node) {
    node.properties['dir'] = 'ltr';
    node.properties['tabindex'] = '0';
  },
};

/** Words in any script (Latin, Hebrew, digits); markdown punctuation like `#`, `-`, `|` is not a word. */
export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’_-]*/gu)?.length ?? 0;
}

// Plain heading text from the inline token's children (same text markdown-it-anchor slugs from).
function plainText(inline: Token | undefined): string {
  return (inline?.children ?? [])
    .filter((child) => child.type === 'text' || child.type === 'code_inline')
    .map((child) => child.content)
    .join('');
}

export async function createRenderer(): Promise<Renderer> {
  const highlighter = await createHighlighter({ themes: Object.values(THEMES), langs: LANGS });
  const loaded = new Set(highlighter.getLoadedLanguages());
  let slugger = new GithubSlugger();

  const highlight = (code: string, lang: string): string => {
    const normalized = lang.trim().toLowerCase();
    return highlighter.codeToHtml(code, {
      lang: loaded.has(normalized) ? normalized : 'text',
      themes: THEMES,
      defaultColor: false,
      transformers: [ltrFocusablePre],
    });
  };

  const md = new MarkdownIt({ html: false, linkify: true, typographer: true, highlight });

  md.use(anchor, { level: [2, 3], slugify: (s: string) => slugger.slug(s), tabIndex: false });

  // Indented code blocks bypass `highlight`; route them through Shiki too so every <pre> is uniform.
  md.renderer.rules['code_block'] = (tokens, idx) => `${highlight(tokens[idx].content, '')}\n`;

  const defaultImage = md.renderer.rules['image']!;
  md.renderer.rules['image'] = (tokens, idx, options, env, self) => {
    tokens[idx].attrSet('loading', 'lazy');
    return defaultImage(tokens, idx, options, env, self);
  };

  return (markdown) => {
    slugger = new GithubSlugger();
    const env = {};
    const tokens = md.parse(markdown, env);
    const toc: TocItem[] = [];
    tokens.forEach((token, i) => {
      if (token.type !== 'heading_open' || (token.tag !== 'h2' && token.tag !== 'h3')) return;
      toc.push({
        id: String(token.attrGet('id') ?? ''),
        text: plainText(tokens[i + 1]),
        depth: token.tag === 'h2' ? 2 : 3,
      });
    });
    return {
      html: md.renderer.render(tokens, md.options, env),
      toc,
      readingMinutes: Math.max(1, Math.round(countWords(markdown) / WORDS_PER_MINUTE)),
    };
  };
}
