import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { LANGS, type LangIndex, type SeriesIndex } from './core/content.models';
import { entryParams, seriesParams, tagParams } from './pages/prerender-params';

// Prerender params come from the real pipeline output (`npm run content` writes public/content),
// read relative to the project root like core/content-loader.server.ts.
function readJson<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(join(process.cwd(), 'public', 'content', ...parts), 'utf8')) as T;
}

const readIndexes = () => LANGS.map((lang) => readJson<LangIndex>(lang, 'index.json'));

export const serverRoutes: ServerRoute[] = [
  {
    path: ':lang/posts/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => entryParams(readIndexes(), 'post'),
  },
  {
    path: ':lang/notes/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => entryParams(readIndexes(), 'note'),
  },
  {
    path: ':lang/series/:key',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => seriesParams(LANGS, readJson<SeriesIndex>('series.json')),
  },
  {
    path: ':lang/tags/:tag',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => tagParams(readIndexes()),
  },
  // Pages that only need `:lang` filled in.
  ...['', 'posts', 'notes', 'series', 'search'].map(
    (section): ServerRoute => ({
      path: section ? `:lang/${section}` : ':lang',
      renderMode: RenderMode.Prerender,
      getPrerenderParams: async () => LANGS.map((lang) => ({ lang })),
    }),
  ),
  // Unknown `/<lang>/...` paths render the not-found page in the browser (GitHub Pages serves 404.html).
  { path: ':lang/**', renderMode: RenderMode.Client },
  // `404`, unknown first segments, and the `/` redirect.
  { path: '**', renderMode: RenderMode.Prerender },
];
