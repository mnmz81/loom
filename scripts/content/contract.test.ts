// Contract test: building the Markdown in __fixtures__/content must reproduce the hand-written
// sample output in src/testing/fixtures/content/ (which the app is developed against),
// ignoring rendering details (html, toc, readingMinutes) and the build timestamp.
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildContent } from './collect';

const FIXTURE_JSON = join(__dirname, '../../src/testing/fixtures/content');
const FIXTURE_MD = join(__dirname, '__fixtures__/content');
const IGNORED = new Set(['html', 'toc', 'readingMinutes', 'generatedAt']);

function absoluteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? absoluteFiles(path) : [path];
  });
}

const listFiles = (dir: string): string[] => absoluteFiles(dir).map((path) => relative(dir, path)).sort();

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !IGNORED.has(key)).map(([key, v]) => [key, strip(v)]));
  }
  return value;
}

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'));

let outDir: string;
beforeAll(async () => {
  outDir = join(mkdtempSync(join(tmpdir(), 'notebook-contract-')), 'content');
  await buildContent({ contentDir: FIXTURE_MD, outDir, includeDrafts: false });
});

describe('pipeline output matches src/testing/fixtures/content', () => {
  it('writes exactly the fixture files', () => {
    expect(listFiles(outDir)).toEqual(listFiles(FIXTURE_JSON));
  });

  it.each(listFiles(FIXTURE_JSON))('%s deep-equals the fixture (ignoring html, toc, readingMinutes, generatedAt)', (file) => {
    expect(strip(readJson(join(outDir, file)))).toEqual(strip(readJson(join(FIXTURE_JSON, file))));
  });

  it('renders entry html with ltr, focusable code blocks and an h2 toc', () => {
    const entry = readJson(join(outDir, 'he/posts/rust-borrowing.json')) as { html: string; toc: unknown; readingMinutes: number };
    expect(entry.html).toMatch(/<pre class="shiki[^>]*dir="ltr"/);
    expect(entry.html).toMatch(/<pre class="shiki[^>]*tabindex="0"/);
    expect(entry.toc).toEqual([{ id: 'example', text: 'Example', depth: 2 }]);
    expect(entry.readingMinutes).toBe(1);
  });
});
