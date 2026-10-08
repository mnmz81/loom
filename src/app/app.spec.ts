import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { CONTENT_LOADER } from './core/content-loader';
import { ThemeService } from './core/theme.service';
import { fixtureContentLoader } from './core/testing/fixture-content-loader';

describe('App shell', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), { provide: CONTENT_LOADER, useValue: fixtureContentLoader }],
    }),
  );

  async function render() {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/en');
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders skip link, header, main landmark and footer in order', async () => {
    const { el } = await render();
    const order = [...el.children].map((c) => c.tagName.toLowerCase());
    expect(order).toEqual(['nb-skip-link', 'nb-site-header', 'main', 'nb-site-footer']);
    expect(el.querySelector('main')?.id).toBe('main');
    expect(el.querySelector('main')?.getAttribute('tabindex')).toBe('-1');
  });

  it('skip link target exists', async () => {
    const { el } = await render();
    expect(el.querySelector('nb-skip-link a')?.textContent?.trim()).toBeTruthy();
    expect(el.querySelector('#main')).not.toBeNull();
  });

  it('passes the theme to the header and toggles it', async () => {
    const { fixture, el } = await render();
    const theme = TestBed.inject(ThemeService);
    theme.set('light');
    await fixture.whenStable();
    const button = el.querySelector<HTMLButtonElement>('.site-header__theme-btn')!;
    expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');
    button.click();
    await fixture.whenStable();
    expect(theme.theme()).toBe('dark');
    expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
    theme.set('light');
  });
});
