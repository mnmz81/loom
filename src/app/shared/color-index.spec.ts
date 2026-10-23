import { COLOR_COUNT, colorIndex } from './color-index';

describe('colorIndex', () => {
  it('is stable and within range', () => {
    expect(colorIndex('angular')).toBe(colorIndex('angular'));
    for (const key of ['rust', 'git', 'ci-cd', 'מחרוזת', '']) {
      const i = colorIndex(key);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(COLOR_COUNT);
    }
  });

  it('spreads different keys over several colors', () => {
    const used = new Set(['angular', 'rust', 'git', 'linux', 'python', 'typescript', 'ai', 'docker'].map(colorIndex));
    expect(used.size).toBeGreaterThan(2);
  });
});
