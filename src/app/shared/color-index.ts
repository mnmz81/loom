/** Number of tag/series colors defined in styles/_tokens.scss (--nb-tag-0 … --nb-tag-5). */
export const COLOR_COUNT = 6;

/** Stable color slot for a tag or series key, so the same key always gets the same color. */
export function colorIndex(key: string): number {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % COLOR_COUNT;
}
