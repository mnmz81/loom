import { describe, expect, it } from 'vitest';
import { bodyShape, shapeDiff } from './parity';

describe('bodyShape', () => {
  it('counts ## and ### headings, fenced and indented code, and collects sorted image sources', () => {
    const shape = bodyShape(
      ['# Title', '## One', '### One.a', '## Two', '#### deep', '```py\nx = 1\n```', '    indented', '![b](/images/s/b.png) and ![a](/images/s/a.png)'].join('\n\n'),
    );
    expect(shape).toEqual({ h2: 2, h3: 1, code: 2, images: ['/images/s/a.png', '/images/s/b.png'] });
  });

  it('ignores headings and images inside code blocks', () => {
    expect(bodyShape('```md\n## not a heading\n![x](/x.png)\n```')).toEqual({ h2: 0, h3: 0, code: 1, images: [] });
  });
});

describe('shapeDiff', () => {
  const shape = (over = {}) => ({ h2: 1, h3: 0, code: 0, images: ['/images/s/a.png'], ...over });

  it('returns [] when the skeletons match', () => {
    expect(shapeDiff(shape(), shape())).toEqual([]);
  });

  it('names each count that differs', () => {
    expect(shapeDiff(shape({ h2: 2, code: 1 }), shape({ h3: 1 }))).toEqual([
      '## headings: he 2 vs en 1',
      '### headings: he 0 vs en 1',
      'code blocks: he 1 vs en 0',
    ]);
  });

  it('names images missing from either side, and a duplicated image', () => {
    expect(shapeDiff(shape({ images: ['/a.png', '/b.png'] }), shape({ images: ['/a.png', '/c.png'] }))).toEqual([
      'images: only in he [/b.png], only in en [/c.png] (he 2 vs en 2)',
    ]);
    expect(shapeDiff(shape({ images: ['/a.png', '/a.png'] }), shape({ images: ['/a.png'] }))).toEqual([
      'images: only in he [], only in en [] (he 2 vs en 1)',
    ]);
  });
});
