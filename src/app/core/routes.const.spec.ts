import { PATHS, swapLang } from './routes.const';

describe('PATHS', () => {
  it('builds entry URLs with the plural type segment', () => {
    expect(PATHS.entry('he', 'post', 'rust-ownership')).toBe('/he/posts/rust-ownership');
    expect(PATHS.entry('en', 'note', 'git-undo')).toBe('/en/notes/git-undo');
  });
});

describe('swapLang', () => {
  it('swaps the language prefix', () => {
    expect(swapLang('/he/posts/x', 'en')).toBe('/en/posts/x');
    expect(swapLang('/en', 'he')).toBe('/he');
  });

  it('drops query and hash', () => {
    expect(swapLang('/he/search?q=git#top', 'en')).toBe('/en/search');
  });

  it('maps unprefixed URLs to the language home', () => {
    expect(swapLang('/', 'en')).toBe('/en');
    expect(swapLang('/404', 'he')).toBe('/he');
    expect(swapLang('/hello', 'en')).toBe('/en');
  });
});
