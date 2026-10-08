import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CONTENT_LOADER } from '../../core/content-loader';
import { fixtureContentLoader } from '../../core/testing/fixture-content-loader';
import { NotFoundPage } from './not-found-page';

async function open(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: CONTENT_LOADER, useValue: fixtureContentLoader },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, NotFoundPage);
  await harness.fixture.whenStable();
  return { harness, el: harness.routeNativeElement as HTMLElement };
}

const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute('content');

describe('NotFoundPage', () => {
  it('shows the Hebrew message by default and offers the English page', async () => {
    const { el } = await open('/404');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('הדף לא נמצא');
    expect(el.querySelector('.not-found__home')?.getAttribute('href')).toBe('/he');
    const other = el.querySelector<HTMLElement>('.not-found__other');
    expect(other?.getAttribute('lang')).toBe('en');
    expect(other?.getAttribute('dir')).toBe('ltr');
    expect(other?.querySelector('a')?.getAttribute('href')).toBe('/en');
    expect(other?.textContent).toContain('Page not found');
    expect(TestBed.inject(Title).getTitle()).toBe('הדף לא נמצא · לום');
  });

  it('uses the language of the unknown path and offers Hebrew (en)', async () => {
    const { el } = await open('/en/nothing/here');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Page not found');
    expect(el.querySelector('.not-found__home')?.getAttribute('href')).toBe('/en');
    const other = el.querySelector<HTMLElement>('.not-found__other');
    expect(other?.getAttribute('lang')).toBe('he');
    expect(other?.getAttribute('dir')).toBe('rtl');
  });

  it('is noindex while shown and removes the tag when left', async () => {
    const { harness } = await open('/404');
    expect(robots()).toBe('noindex');
    await harness.navigateByUrl('/he');
    await harness.fixture.whenStable();
    expect(robots()).toBeUndefined();
  });
});
