import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  RedirectCommand,
  Router,
  RouterStateSnapshot,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CONTENT_LOADER, type ContentLoader } from './content-loader';
import type { Entry, LangIndex, SeriesIndex } from './content.models';
import { entryResolver, langIndexResolver, seriesIndexResolver } from './content.resolvers';
import { fixtureContentLoader } from './testing/fixture-content-loader';

@Component({ template: '' })
class PageStub {
  readonly route = inject(ActivatedRoute);
}

const routes = [
  { path: '404', component: PageStub },
  {
    path: ':lang',
    children: [
      { path: '', component: PageStub, resolve: { index: langIndexResolver } },
      { path: 'posts/:slug', component: PageStub, resolve: { entry: entryResolver('post') } },
      { path: 'notes/:slug', component: PageStub, resolve: { entry: entryResolver('note') } },
      { path: 'series', component: PageStub, resolve: { series: seriesIndexResolver } },
    ],
  },
];

async function navigate(url: string, loader: ContentLoader = fixtureContentLoader) {
  TestBed.configureTestingModule({ providers: [provideRouter(routes), { provide: CONTENT_LOADER, useValue: loader }] });
  const harness = await RouterTestingHarness.create();
  const page = await harness.navigateByUrl(url, PageStub);
  return { url: TestBed.inject(Router).url, data: page.route.snapshot.data };
}

describe('content resolvers (through the router)', () => {
  it('langIndexResolver resolves the index of the route language', async () => {
    const { data } = await navigate('/en');
    expect((data['index'] as LangIndex).lang).toBe('en');
  });

  it('seriesIndexResolver resolves all series', async () => {
    const { data } = await navigate('/he/series');
    expect((data['series'] as SeriesIndex)[0].key).toBe('learning-rust');
  });

  it('entryResolver resolves a translated entry in the route language', async () => {
    const { url, data } = await navigate('/en/posts/rust-borrowing');
    expect(url).toBe('/en/posts/rust-borrowing');
    expect(data['entry']).toMatchObject({ slug: 'rust-borrowing', lang: 'en', type: 'post' });
  });

  it('entryResolver resolves notes from the notes folder', async () => {
    const { data } = await navigate('/he/notes/git-undo-last-commit');
    expect(data['entry']).toMatchObject({ slug: 'git-undo-last-commit', lang: 'he', type: 'note' });
  });

  it('redirects a he-only post requested in en to the he URL', async () => {
    const { url, data } = await navigate('/en/posts/rust-ownership');
    expect(url).toBe('/he/posts/rust-ownership');
    expect((data['entry'] as Entry).lang).toBe('he');
  });

  it('redirects an en-only note requested in he to the en URL', async () => {
    const { url } = await navigate('/he/notes/zsh-history-search');
    expect(url).toBe('/en/notes/zsh-history-search');
  });

  it('redirects an unknown slug to /404', async () => {
    const { url } = await navigate('/he/posts/missing');
    expect(url).toBe('/404');
  });

  it('redirects to /404 when the slug exists with a different type', async () => {
    const { url } = await navigate('/he/notes/rust-ownership');
    expect(url).toBe('/404');
  });
});

describe('entryResolver (direct)', () => {
  const state = {} as RouterStateSnapshot;

  function snapshot(lang: string, slug: string): ActivatedRouteSnapshot {
    const parent = { paramMap: convertToParamMap({ lang }) } as ActivatedRouteSnapshot;
    const leaf = { paramMap: convertToParamMap({ slug }), pathFromRoot: [parent] } as unknown as ActivatedRouteSnapshot;
    leaf.pathFromRoot.push(leaf);
    return leaf;
  }

  async function run(loader: ContentLoader, lang: string, slug: string): Promise<string> {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: CONTENT_LOADER, useValue: loader }] });
    const result = await TestBed.runInInjectionContext(() => entryResolver('post')(snapshot(lang, slug), state));
    expect(result).toBeInstanceOf(RedirectCommand);
    return (result as RedirectCommand).redirectTo.toString();
  }

  it('redirects to /404 when the index cannot be loaded', async () => {
    const failing: ContentLoader = async () => {
      throw new Error('offline');
    };
    expect(await run(failing, 'he', 'rust-ownership')).toBe('/404');
  });

  it('redirects to /404 when the index lists the entry but its file is missing', async () => {
    const noEntries: ContentLoader = (path) =>
      path.endsWith('index.json') ? fixtureContentLoader(path) : Promise.reject(new Error('not found'));
    expect(await run(noEntries, 'he', 'rust-ownership')).toBe('/404');
  });

  it('redirects to /404 when an entry has no available language', async () => {
    const broken: ContentLoader = async (path) => {
      const index = (await fixtureContentLoader(path)) as LangIndex;
      return { ...index, entries: index.entries.map((e) => ({ ...e, availableLangs: [] })) };
    };
    expect(await run(broken, 'en', 'rust-ownership')).toBe('/404');
  });
});
