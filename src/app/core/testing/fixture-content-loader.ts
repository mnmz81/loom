// TEST-ONLY. A ContentLoader backed by src/testing/fixtures/content (same paths as public/content).
// Usage: providers: [{ provide: CONTENT_LOADER, useValue: fixtureContentLoader }]
import type { ContentLoader } from '../content-loader';
import enGitUndo from '../../../testing/fixtures/content/en/notes/git-undo-last-commit.json';
import enZsh from '../../../testing/fixtures/content/en/notes/zsh-history-search.json';
import enIndex from '../../../testing/fixtures/content/en/index.json';
import enSignals from '../../../testing/fixtures/content/en/posts/angular-signals-basics.json';
import enBorrowing from '../../../testing/fixtures/content/en/posts/rust-borrowing.json';
import heGitUndo from '../../../testing/fixtures/content/he/notes/git-undo-last-commit.json';
import heIndex from '../../../testing/fixtures/content/he/index.json';
import heSignals from '../../../testing/fixtures/content/he/posts/angular-signals-basics.json';
import heBorrowing from '../../../testing/fixtures/content/he/posts/rust-borrowing.json';
import heOwnership from '../../../testing/fixtures/content/he/posts/rust-ownership.json';
import series from '../../../testing/fixtures/content/series.json';

/** Fixture JSON keyed by content path, e.g. 'he/index.json', 'en/posts/rust-borrowing.json'. */
export const CONTENT_FIXTURES: Readonly<Record<string, unknown>> = {
  'series.json': series,
  'he/index.json': heIndex,
  'en/index.json': enIndex,
  'he/posts/rust-ownership.json': heOwnership,
  'he/posts/rust-borrowing.json': heBorrowing,
  'he/posts/angular-signals-basics.json': heSignals,
  'he/notes/git-undo-last-commit.json': heGitUndo,
  'en/posts/rust-borrowing.json': enBorrowing,
  'en/posts/angular-signals-basics.json': enSignals,
  'en/notes/git-undo-last-commit.json': enGitUndo,
  'en/notes/zsh-history-search.json': enZsh,
};

/** Resolves fixture JSON by path; rejects like a 404 for unknown paths. Returns a deep copy. */
export const fixtureContentLoader: ContentLoader = async (path) => {
  if (!(path in CONTENT_FIXTURES)) throw new Error(`not found: ${path}`);
  return structuredClone(CONTENT_FIXTURES[path]);
};
