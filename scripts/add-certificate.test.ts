import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { addCertificate } from './add-certificate';

function setup() {
  const root = mkdtempSync(join(tmpdir(), 'loom-addcert-'));
  const pdf = join(root, 'in.pdf');
  const png = join(root, 'in.png');
  writeFileSync(pdf, 'pdf');
  writeFileSync(png, 'png');
  const certs = () => YAML.parse(readFileSync(join(root, 'content', 'certificates.yaml'), 'utf8'));
  return { root, pdf, png, certs };
}

describe('addCertificate', () => {
  it('copies a PDF with a PNG preview and appends the entry, keyed from the title', () => {
    const { root, pdf, certs } = setup();
    const previews: string[] = [];
    const key = addCertificate(
      { source: pdf, title: 'Claude Code in Action', issuer: 'Anthropic', date: '2026-10-25', url: 'https://x.io/v', tags: ['ai'] },
      root,
      (_, out) => (previews.push(out), writeFileSync(out, 'preview')),
    );
    expect(key).toBe('claude-code-in-action');
    expect(existsSync(join(root, 'public/certificates/claude-code-in-action.pdf'))).toBe(true);
    expect(previews).toEqual([join(root, 'public/certificates/claude-code-in-action.png')]);
    expect(certs()).toEqual([
      {
        key: 'claude-code-in-action',
        title: 'Claude Code in Action',
        issuer: 'Anthropic',
        date: '2026-10-25',
        image: '/certificates/claude-code-in-action.png',
        file: '/certificates/claude-code-in-action.pdf',
        url: 'https://x.io/v',
        tags: ['ai'],
      },
    ]);
  });

  it('uses a picture as the image, keeps existing entries and rejects a duplicate key', () => {
    const { root, png, certs } = setup();
    const noPdf = () => {
      throw new Error('no preview for pictures');
    };
    addCertificate({ source: png, title: 'A', issuer: 'Udemy', date: '2026-01-01' }, root, noPdf);
    addCertificate({ source: png, title: 'B', issuer: 'Udemy', date: '2026-01-02', key: 'b-course' }, root, noPdf);
    expect(certs().map((c: { key: string; image: string }) => [c.key, c.image])).toEqual([
      ['a', '/certificates/a.png'],
      ['b-course', '/certificates/b-course.png'],
    ]);
    expect(() => addCertificate({ source: png, title: 'A', issuer: 'X', date: '2026-01-03' }, root, noPdf)).toThrow(/already exists/);
  });
});
