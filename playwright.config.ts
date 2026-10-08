// E2E against the production build served under /loom/ (same URLs as GitHub Pages).
// Usage: npm run build && npx playwright test   (specs: e2e/**/*.e2e.ts)
// In specs, navigate with paths RELATIVE to baseURL: page.goto('he'), not page.goto('/he').
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env['PORT'] ?? 4321);

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}/loom/`, trace: 'on-first-retry' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: './scripts/serve-dist.sh',
    url: `http://localhost:${PORT}/loom/`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env['CI'],
  },
});
