import { describe, expect, it } from 'vitest';
import { setSharedFacts } from './shared-facts';

const doc = (front: string) => `---\n${front}\n---\n\nBody: tags: [x]\n`;

describe('setSharedFacts', () => {
  it('replaces the tags line and leaves the body alone', () => {
    const out = setSharedFacts(doc('title: "A"\ntags: [a, b]'), { tags: ['c'] });
    expect(out).toBe(doc('title: "A"\ntags: [c]'));
  });

  it('replaces, inserts and removes the series line', () => {
    const inSeries = doc('tags: [a]\nseries: { key: s, order: 2 }');
    expect(setSharedFacts(inSeries, { series: { key: 's', order: 5 } })).toBe(doc('tags: [a]\nseries: { key: s, order: 5 }'));
    expect(setSharedFacts(doc('tags: [a]\ndraft: true'), { series: { key: 's', order: 1 } })).toBe(
      doc('tags: [a]\nseries: { key: s, order: 1 }\ndraft: true'),
    );
    expect(setSharedFacts(inSeries, { series: null })).toBe(doc('tags: [a]'));
  });

  it('fails without frontmatter', () => {
    expect(() => setSharedFacts('no front', { tags: ['a'] })).toThrow('no frontmatter');
  });
});
