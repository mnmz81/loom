// Reusable accessibility helper for e2e specs.
// Usage: await expectNoSeriousA11yViolations(page);
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export interface A11yOptions {
  /** CSS selectors to leave out of the scan (third-party widgets, etc.). */
  exclude?: string[];
  /** axe rule ids to skip — document why at the call site. */
  disableRules?: string[];
}

/** Serious/critical axe violations on the current page, as readable "rule: targets" strings. */
export async function seriousA11yViolations(page: Page, { exclude = [], disableRules = [] }: A11yOptions = {}): Promise<string[]> {
  let builder = new AxeBuilder({ page }).withTags(A11Y_TAGS).disableRules(disableRules);
  for (const selector of exclude) builder = builder.exclude(selector);
  const { violations } = await builder.analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

export async function expectNoSeriousA11yViolations(page: Page, options?: A11yOptions): Promise<void> {
  expect(await seriousA11yViolations(page, options)).toEqual([]);
}
