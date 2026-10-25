// Adds a course certificate: copies the file to public/certificates/ and appends an entry to content/certificates.yaml.
// A PDF also gets a PNG preview of its first page (macOS `qlmanage`), shown on the page; the card links to the PDF.
// Usage: npx tsx scripts/add-certificate.ts <file.pdf|png|jpg|webp> --title "Course" --issuer Udemy --date 2026-10-25 \
//          [--key course-key] [--url https://verify-link] [--tags ai,claude-code]
// Then run: npx tsx scripts/check-content.ts
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { parseArgs } from 'node:util';
import YAML from 'yaml';

export interface CertificateInput {
  source: string;
  title: string;
  issuer: string;
  date: string;
  key?: string;
  url?: string;
  tags?: string[];
}

/** Writes `out` (a PNG) from the first page of `pdf`. */
export type PdfToPng = (pdf: string, out: string) => void;

const qlmanagePng: PdfToPng = (pdf, out) => {
  const dir = mkdtempSync(join(tmpdir(), 'loom-cert-'));
  execFileSync('qlmanage', ['-t', '-s', '1600', '-o', dir, pdf], { stdio: 'ignore' });
  renameSync(join(dir, `${basename(pdf)}.png`), out);
};

const kebab = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Copies the file under `root`/public/certificates and appends the entry to `root`/content/certificates.yaml. Returns the key. */
export function addCertificate(input: CertificateInput, root = '.', toPng: PdfToPng = qlmanagePng): string {
  const key = input.key ?? kebab(input.title);
  if (!key) throw new Error('cannot make a key from the title; pass --key');
  const ext = extname(input.source).toLowerCase().replace('.jpeg', '.jpg');
  if (!['.pdf', '.png', '.jpg', '.webp'].includes(ext)) throw new Error(`unsupported file type ${ext} (pdf, png, jpg, webp)`);

  const yamlFile = join(root, 'content', 'certificates.yaml');
  const doc = YAML.parseDocument(existsSync(yamlFile) ? readFileSync(yamlFile, 'utf8') : '[]');
  const list = (doc.toJS() ?? []) as { key: string }[];
  if (list.some((c) => c.key === key)) throw new Error(`certificate "${key}" already exists in ${yamlFile}`);

  const dir = join(root, 'public', 'certificates');
  mkdirSync(dir, { recursive: true });
  copyFileSync(input.source, join(dir, `${key}${ext}`));
  if (ext === '.pdf') toPng(input.source, join(dir, `${key}.png`));

  const entry = {
    key,
    title: input.title,
    issuer: input.issuer,
    date: input.date,
    image: `/certificates/${key}${ext === '.pdf' ? '.png' : ext}`,
    ...(ext === '.pdf' && { file: `/certificates/${key}.pdf` }),
    ...(input.url && { url: input.url }),
    ...(input.tags?.length && { tags: input.tags }),
  };
  if (!YAML.isSeq(doc.contents)) doc.contents = doc.createNode([]);
  const seq = doc.contents as YAML.YAMLSeq;
  seq.flow = false; // an empty file starts as `[]`; keep one block entry per certificate
  seq.add(doc.createNode(entry));
  mkdirSync(join(root, 'content'), { recursive: true });
  writeFileSync(yamlFile, doc.toString());
  return key;
}

if (process.argv[1] && basename(process.argv[1]).startsWith('add-certificate')) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      title: { type: 'string' },
      issuer: { type: 'string' },
      date: { type: 'string' },
      key: { type: 'string' },
      url: { type: 'string' },
      tags: { type: 'string' },
    },
  });
  const [source] = positionals;
  if (!source || !values.title || !values.issuer || !values.date) {
    console.error('Usage: add-certificate.ts <file> --title "..." --issuer "..." --date YYYY-MM-DD [--key k] [--url https://...] [--tags a,b]');
    process.exit(1);
  }
  const key = addCertificate({
    source,
    title: values.title,
    issuer: values.issuer,
    date: values.date,
    key: values.key,
    url: values.url,
    tags: values.tags?.split(',').map((t) => t.trim()).filter(Boolean),
  });
  console.log(`[certificate] added "${key}"; run: npx tsx scripts/check-content.ts`);
}
