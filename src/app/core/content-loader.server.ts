import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ContentLoader } from './content-loader';

// Prerender runs with cwd = project root, where `npm run content` wrote public/content.
export const serverContentLoader: ContentLoader = async (path) =>
  JSON.parse(await readFile(join(process.cwd(), 'public', 'content', path), 'utf8'));
