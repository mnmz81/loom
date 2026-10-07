// PLACEHOLDER (Wave 0) — replaced by the Wave 2 pages agent.
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: ':lang', renderMode: RenderMode.Prerender, async getPrerenderParams() { return [{ lang: 'he' }, { lang: 'en' }]; } },
  { path: '**', renderMode: RenderMode.Prerender },
];
