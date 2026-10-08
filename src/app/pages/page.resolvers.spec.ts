import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RedirectCommand,
  RouterStateSnapshot,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { CONTENT_LOADER, type ContentLoader } from '../core/content-loader';
import type { SeriesSummary, TagCount } from '../core/content.models';
import { fixtureContentLoader } from '../core/testing/fixture-content-loader';
import { seriesResolver, tagResolver } from './page.resolvers';

const state = {} as RouterStateSnapshot;

function snapshot(params: Record<string, string>, lang = 'en'): ActivatedRouteSnapshot {
  const parent = { paramMap: convertToParamMap({ lang }) } as ActivatedRouteSnapshot;
  const leaf = { paramMap: convertToParamMap(params), pathFromRoot: [parent] } as unknown as ActivatedRouteSnapshot;
  leaf.pathFromRoot.push(leaf);
  return leaf;
}

function run<T>(fn: typeof seriesResolver | typeof tagResolver, route: ActivatedRouteSnapshot, loader: ContentLoader) {
  TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: CONTENT_LOADER, useValue: loader }] });
  return TestBed.runInInjectionContext(() => fn(route, state)) as Promise<T | RedirectCommand>;
}

const failing: ContentLoader = async () => {
  throw new Error('offline');
};

describe('seriesResolver', () => {
  it('resolves a known series', async () => {
    const result = await run<SeriesSummary>(seriesResolver, snapshot({ key: 'learning-rust' }), fixtureContentLoader);
    expect(result).toMatchObject({ key: 'learning-rust' });
  });

  it('redirects an unknown key to /404', async () => {
    const result = await run(seriesResolver, snapshot({ key: 'nope' }), fixtureContentLoader);
    expect(result).toBeInstanceOf(RedirectCommand);
    expect((result as RedirectCommand).redirectTo.toString()).toBe('/404');
  });

  it('redirects to /404 when series.json cannot be loaded', async () => {
    const result = await run(seriesResolver, snapshot({ key: 'learning-rust' }), failing);
    expect(result).toBeInstanceOf(RedirectCommand);
  });
});

describe('tagResolver', () => {
  it('resolves a tag with the label of the route language', async () => {
    const result = await run<TagCount>(tagResolver, snapshot({ tag: 'rust' }, 'he'), fixtureContentLoader);
    expect(result).toEqual({ tag: 'rust', label: 'ראסט', count: 2 });
  });

  it('redirects an unknown tag to /404', async () => {
    const result = await run(tagResolver, snapshot({ tag: 'nope' }), fixtureContentLoader);
    expect((result as RedirectCommand).redirectTo.toString()).toBe('/404');
  });

  it('redirects to /404 when the index cannot be loaded', async () => {
    const result = await run(tagResolver, snapshot({ tag: 'rust' }), failing);
    expect(result).toBeInstanceOf(RedirectCommand);
  });
});
