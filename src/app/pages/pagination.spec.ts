import { pageItems, pageOf, pageTotal } from './pagination';

describe('pagination', () => {
  it('pageTotal rounds up and never returns 0', () => {
    expect(pageTotal(0, 20)).toBe(1);
    expect(pageTotal(20, 20)).toBe(1);
    expect(pageTotal(21, 20)).toBe(2);
    expect(pageTotal(233, 20)).toBe(12);
  });

  it('pageItems slices the 1-based page', () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    expect(pageItems(items, 1, 20)).toEqual(items.slice(0, 20));
    expect(pageItems(items, 3, 20)).toEqual([40, 41, 42, 43, 44]);
    expect(pageItems(items, 4, 20)).toEqual([]);
  });

  it('pageOf maps a position to its page', () => {
    expect(pageOf(0, 20)).toBe(1);
    expect(pageOf(19, 20)).toBe(1);
    expect(pageOf(20, 20)).toBe(2);
    expect(pageOf(-1, 20)).toBe(1); // not found → first page
  });
});
