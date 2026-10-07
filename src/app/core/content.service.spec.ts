import { TransferState, makeStateKey } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CONTENT_LOADER } from './content-loader';
import type { LangIndex } from './content.models';
import { ContentService } from './content.service';
import { CONTENT_FIXTURES, fixtureContentLoader } from './testing/fixture-content-loader';

function setup() {
  const loader = vi.fn(fixtureContentLoader);
  TestBed.configureTestingModule({ providers: [{ provide: CONTENT_LOADER, useValue: loader }] });
  return { service: TestBed.inject(ContentService), loader };
}

describe('ContentService', () => {
  it('loads the index of a language', async () => {
    const { service, loader } = setup();
    const index = await service.getIndex('en');
    expect(loader).toHaveBeenCalledWith('en/index.json');
    expect(index.lang).toBe('en');
    expect(index).toEqual(CONTENT_FIXTURES['en/index.json']);
  });

  it('loads a post and a note from their plural folders', async () => {
    const { service, loader } = setup();
    const post = await service.getEntry('he', 'post', 'rust-ownership');
    const note = await service.getEntry('en', 'note', 'zsh-history-search');
    expect(loader).toHaveBeenCalledWith('he/posts/rust-ownership.json');
    expect(loader).toHaveBeenCalledWith('en/notes/zsh-history-search.json');
    expect(post.slug).toBe('rust-ownership');
    expect(post.html).toBeTruthy();
    expect(note.type).toBe('note');
  });

  it('loads the series index', async () => {
    const { service, loader } = setup();
    const series = await service.getSeries();
    expect(loader).toHaveBeenCalledWith('series.json');
    expect(series.map((s) => s.key)).toEqual(['learning-rust']);
  });

  it('caches each file in TransferState and loads it once', async () => {
    const { service, loader } = setup();
    await service.getIndex('he');
    await service.getIndex('he');
    await service.getIndex('en');
    expect(loader).toHaveBeenCalledTimes(2);
    const cached = TestBed.inject(TransferState).get(makeStateKey<LangIndex>('content:he/index.json'), null);
    expect(cached?.lang).toBe('he');
  });

  it('serves state transferred from the server without loading', async () => {
    const { service, loader } = setup();
    const transferred = { lang: 'he', generatedAt: 'x', entries: [], tags: [] } satisfies LangIndex;
    TestBed.inject(TransferState).set(makeStateKey<LangIndex>('content:he/index.json'), transferred);
    expect(await service.getIndex('he')).toEqual(transferred);
    expect(loader).not.toHaveBeenCalled();
  });

  it('rejects when the file is missing (entry not translated)', async () => {
    const { service } = setup();
    await expect(service.getEntry('en', 'post', 'rust-ownership')).rejects.toThrow('not found');
  });
});
