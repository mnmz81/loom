// Creates content/<posts|notes>/<slug>/{he,en}.md with matching shared facts, as drafts.
// Usage: npm run new-post -- <slug> --tags python,tutorial [--series python] [--date 2026-10-12] [--note]
//   --series  joins the series with the next free order (posts only)
//   --date    defaults to today (local time)
//   --note    creates a note instead of a post
import { parseArgs } from 'node:util';
import { scaffoldEntry } from './content/scaffold';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    tags: { type: 'string', default: '' },
    series: { type: 'string' },
    date: { type: 'string' },
    note: { type: 'boolean', default: false },
  },
});

if (positionals.length !== 1) {
  console.error('Usage: npm run new-post -- <slug> --tags a,b [--series key] [--date YYYY-MM-DD] [--note]');
  process.exit(1);
}

try {
  const result = scaffoldEntry({
    contentDir: process.env['CONTENT_DIR'] ?? 'content',
    type: values.note ? 'note' : 'post',
    slug: positionals[0],
    tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean),
    date: values.date ?? today(),
    series: values.series,
  });
  for (const file of result.files) console.log(`created ${file}`);
  if (result.order) console.log(`series order: ${result.order}`);
  if (result.unlabeledTags.length) console.log(`add labels to content/tags.yaml for: ${result.unlabeledTags.join(', ')}`);
  console.log('Both files are drafts: fill title, summary and body, then remove `draft: true`.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
