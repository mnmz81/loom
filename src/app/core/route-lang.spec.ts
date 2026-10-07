import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';
import { routeLang } from './route-lang';

/** Builds a snapshot chain root → … → leaf from per-level params; returns the leaf. */
function chain(...levels: Record<string, string>[]): ActivatedRouteSnapshot {
  const snapshots: ActivatedRouteSnapshot[] = [];
  for (const params of levels) {
    const pathFromRoot: ActivatedRouteSnapshot[] = [...snapshots];
    const snapshot = { paramMap: convertToParamMap(params), pathFromRoot } as unknown as ActivatedRouteSnapshot;
    pathFromRoot.push(snapshot);
    snapshots.push(snapshot);
  }
  return snapshots[snapshots.length - 1];
}

describe('routeLang', () => {
  it('finds :lang on an ancestor route', () => {
    expect(routeLang(chain({}, { lang: 'en' }, { slug: 'x' }))).toBe('en');
  });

  it('reads :lang on the route itself', () => {
    expect(routeLang(chain({}, { lang: 'he' }))).toBe('he');
  });

  it('prefers the nearest valid :lang', () => {
    expect(routeLang(chain({ lang: 'he' }, { lang: 'en' }, {}))).toBe('en');
  });

  it('ignores unknown languages and falls back to the default', () => {
    expect(routeLang(chain({}, { lang: 'fr' }, {}))).toBe('he');
    expect(routeLang(chain({}))).toBe('he');
  });
});
