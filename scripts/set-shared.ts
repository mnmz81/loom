// Changes the shared facts of entries in both languages at once.
// Usage:
//   npx tsx scripts/set-shared.ts <slug> --tags a,b            # replace the tags
//   npx tsx scripts/set-shared.ts <slug> --series key:3        # join a series at a position (--series none leaves it)
//   npx tsx scripts/set-shared.ts --series-order <key> <slug1> <slug2> ...   # renumber a whole series 1..n
import { parseArgs } from 'node:util';
import { updateEntry } from './content/shared-facts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    tags: { type: 'string' },
    series: { type: 'string' },
    'series-order': { type: 'string' },
  },
});
const contentDir = process.env['CONTENT_DIR'] ?? 'content';

try {
  const key = values['series-order'];
  if (key) {
    if (!positionals.length) throw new Error('--series-order needs the slugs in order');
    positionals.forEach((slug, i) => updateEntry(contentDir, slug, { series: { key, order: i + 1 } }));
    console.log(`${key}: ${positionals.length} entries renumbered`);
  } else {
    if (positionals.length !== 1) throw new Error('Usage: set-shared <slug> [--tags a,b] [--series key:n|none]');
    const series = values.series;
    const files = updateEntry(contentDir, positionals[0], {
      tags: values.tags?.split(',').map((t) => t.trim()).filter(Boolean),
      series:
        series === undefined ? undefined
        : series === 'none' ? null
        : { key: series.split(':')[0], order: Number(series.split(':')[1]) },
    });
    for (const file of files) console.log(`updated ${file}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
