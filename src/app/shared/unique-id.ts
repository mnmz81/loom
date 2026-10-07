let counter = 0;

/** Document-unique id for aria-labelledby pairs (several instances of a component may share a page). */
export function uniqueId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
