import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fallback404Html, write404 } from './not-found';

describe('write404', () => {
  it('copies the prerendered 404/index.html', () => {
    const dist = mkdtempSync(join(tmpdir(), 'nb-404-'));
    mkdirSync(join(dist, '404'));
    writeFileSync(join(dist, '404', 'index.html'), '<p>prerendered</p>');
    expect(write404(dist)).toBe('prerendered');
    expect(readFileSync(join(dist, '404.html'), 'utf8')).toBe('<p>prerendered</p>');
  });

  it('writes the bilingual fallback when there is no prerendered page', () => {
    const dist = mkdtempSync(join(tmpdir(), 'nb-404-'));
    expect(write404(dist)).toBe('fallback');
    expect(readFileSync(join(dist, '404.html'), 'utf8')).toBe(fallback404Html());
  });
});

describe('fallback404Html', () => {
  it('is Hebrew RTL by default and links to both homes under the base path', () => {
    const html = fallback404Html('/notebook/');
    expect(html).toContain('<html lang="he" dir="rtl">');
    expect(html).toContain('href="/notebook/he/"');
    expect(html).toContain('lang="en" dir="ltr"');
    expect(html).toContain('href="/notebook/en/"');
  });
});
