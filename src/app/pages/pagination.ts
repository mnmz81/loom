// Pure paging helpers for the posts/notes lists. Page 1 is `/<lang>/posts`, page n ≥ 2 is
// `/<lang>/posts/page/<n>` (PATHS.posts / PATHS.notes); every page is prerendered.

/** Rows per list page: keeps the first page of 233 posts well under 3,000px. */
export const PAGE_SIZE = 20;

/** Number of pages for `count` items (at least 1, so an empty list still has its page). */
export function pageTotal(count: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / size));
}

/** The items shown on 1-based `page`. */
export function pageItems<T>(items: readonly T[], page: number, size = PAGE_SIZE): T[] {
  return items.slice((page - 1) * size, page * size);
}

/** 1-based page that shows the item at 0-based `position`. */
export function pageOf(position: number, size = PAGE_SIZE): number {
  return Math.floor(Math.max(0, position) / size) + 1;
}
