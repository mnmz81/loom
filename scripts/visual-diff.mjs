#!/usr/bin/env node
// Before/after screenshot check for UI refactors. Needs the built site served:
//   ./scripts/with-node.sh npm run build && ./scripts/with-node.sh ./scripts/serve-dist.sh   (port 4321)
// Usage: ./scripts/with-node.sh node scripts/visual-diff.mjs <dir>
//   1st run: <dir> has no PNGs   -> saves the baseline there.
//   later:   <dir> has PNGs      -> shoots into <dir>-new and prints every page whose pixels changed.
// Env: BASE_URL (default http://localhost:4321/loom/), PAGES (comma list, default below),
//      THRESHOLD (per-channel difference counted as a change, default 8).
// Covers desktop + mobile, light + dark, plus a keyboard-focus shot; animations are off so runs match.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { chromium } from '@playwright/test';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/visual-diff.mjs <dir>');
  process.exit(2);
}
const base = process.env.BASE_URL ?? 'http://localhost:4321/loom/';
const threshold = Number(process.env.THRESHOLD ?? 8);
const pages = (
  process.env.PAGES ??
  'en/,he/,en/posts,en/series,he/series,en/certificates,en/search,en/posts/ai-agents,en/tags/ai,en/accessibility,en/nope'
).split(',');
const viewports = { d: { width: 1280, height: 900 }, m: { width: 375, height: 812 } };

const hasBaseline = (() => {
  try {
    return readdirSync(dir).some((f) => f.endsWith('.png'));
  } catch {
    return false;
  }
})();
const outDir = hasBaseline ? `${dir}-new` : dir;
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const [vpName, viewport] of Object.entries(viewports)) {
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport, colorScheme: scheme, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const shoot = (name, opts = {}) => page.screenshot({ path: `${outDir}/${vpName}-${scheme}-${name}.png`, ...opts });
    for (const path of pages) {
      await page.goto(base + path, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: '*{animation:none!important;transition:none!important;caret-color:transparent!important}' });
      await shoot(path.replace(/\W+/g, '_'), { fullPage: true });
    }
    await page.goto(base, { waitUntil: 'networkidle' });
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
    await shoot('focus');
    await context.close();
  }
}

if (!hasBaseline) {
  console.log(`Baseline saved: ${readdirSync(outDir).length} screenshots in ${dir}`);
  await browser.close();
  process.exit(0);
}

// Compare in the browser (canvas) so no image library is needed.
const cmpPage = await browser.newPage();
const b64 = (file) => readFileSync(file).toString('base64');
let changed = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.png'))) {
  if (!existsSync(`${outDir}/${file}`)) {
    console.log(`MISSING  ${file}`);
    changed++;
    continue;
  }
  const result = await cmpPage.evaluate(
    async ([a, b, limit]) => {
      const load = (data) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = `data:image/png;base64,${data}`;
        });
      const [x, y] = await Promise.all([load(a), load(b)]);
      if (x.width !== y.width || x.height !== y.height) {
        return { size: [`${x.width}x${x.height}`, `${y.width}x${y.height}`] };
      }
      const px = (img) => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, c.width, c.height).data;
      };
      const [d1, d2] = [px(x), px(y)];
      let count = 0;
      for (let i = 0; i < d1.length; i += 4) {
        if (
          Math.abs(d1[i] - d2[i]) > limit ||
          Math.abs(d1[i + 1] - d2[i + 1]) > limit ||
          Math.abs(d1[i + 2] - d2[i + 2]) > limit
        )
          count++;
      }
      return { count };
    },
    [b64(`${dir}/${file}`), b64(`${outDir}/${file}`), threshold],
  );
  if (result.size) console.log(`SIZE     ${file}  ${result.size[0]} -> ${result.size[1]}`), changed++;
  else if (result.count) console.log(`CHANGED  ${file}  ${result.count} px`), changed++;
}
await browser.close();
console.log(changed ? `${changed} screenshot(s) differ. Compare ${dir} with ${outDir}.` : 'No visual changes.');
process.exit(changed ? 1 : 0);
