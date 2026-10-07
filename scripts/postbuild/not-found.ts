import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE } from '../../src/app/core/site.config';

/** Minimal bilingual 404 used only when the app did not prerender a /404 route. */
export function fallback404Html(basePath: string = SITE.basePath): string {
  const home = `${basePath}he/`;
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>404 · ${SITE.title.he} · ${SITE.title.en}</title>
  <style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;line-height:1.6}</style>
</head>
<body>
  <main>
    <h1>הדף לא נמצא</h1>
    <p><a href="${home}">חזרה לדף הבית</a></p>
    <section lang="en" dir="ltr">
      <h2>Page not found</h2>
      <p><a href="${basePath}en/">Back to the home page</a></p>
    </section>
  </main>
</body>
</html>
`;
}

/**
 * GitHub Pages serves `<root>/404.html` for unknown URLs. Copies the prerendered `404/index.html`
 * when present, otherwise writes the minimal fallback page.
 */
export function write404(distDir: string): 'prerendered' | 'fallback' {
  const prerendered = join(distDir, '404', 'index.html');
  const target = join(distDir, '404.html');
  if (existsSync(prerendered)) {
    copyFileSync(prerendered, target);
    return 'prerendered';
  }
  writeFileSync(target, fallback404Html());
  return 'fallback';
}
