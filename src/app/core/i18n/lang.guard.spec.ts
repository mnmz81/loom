import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree, convertToParamMap } from '@angular/router';
import { langGuard } from './lang.guard';
import { LocaleService } from './locale.service';

function run(lang: string | null): boolean | UrlTree {
  const route = { paramMap: convertToParamMap(lang ? { lang } : {}) } as ActivatedRouteSnapshot;
  return TestBed.runInInjectionContext(() => langGuard(route, {} as never)) as boolean | UrlTree;
}

describe('langGuard', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { parseUrl: (u: string) => ({ url: u }) } }] }));

  it('accepts a known language, sets it and clears the alternate URL', () => {
    const locale = TestBed.inject(LocaleService);
    locale.alternateUrl.set('/he/x');
    expect(run('en')).toBe(true);
    expect(locale.lang()).toBe('en');
    expect(locale.alternateUrl()).toBeNull();
  });

  it('redirects an unknown language to the default home', () => {
    expect(run('fr')).toEqual({ url: '/he' });
  });
});
