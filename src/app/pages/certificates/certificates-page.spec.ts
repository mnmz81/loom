import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CONTENT_LOADER, type ContentLoader } from '../../core/content-loader';
import { fixtureContentLoader } from '../../core/testing/fixture-content-loader';
import { CertificatesPage } from './certificates-page';

async function open(url: string, loader: ContentLoader = fixtureContentLoader) {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes, withComponentInputBinding()), { provide: CONTENT_LOADER, useValue: loader }],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, CertificatesPage);
  await harness.fixture.whenStable();
  return harness.routeNativeElement as HTMLElement;
}

describe('CertificatesPage', () => {
  it('shows each certificate with picture, issuer, date, tags and verify link (he)', async () => {
    const el = await open('/he/certificates');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('תעודות');
    expect(el.querySelector('.certificates__title')?.textContent?.trim()).toBe('Rust Fundamentals');
    const img = el.querySelector('img');
    expect(img?.getAttribute('src')).toBe('certificates/rust-fundamentals.png');
    expect(img?.getAttribute('alt')).toBe('תעודה: Rust Fundamentals');
    expect(el.querySelector('.certificates__image')?.getAttribute('href')).toBe('certificates/rust-fundamentals.pdf');
    expect(el.querySelector('.certificates__meta')?.textContent).toContain('Udemy');
    expect(el.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-01');
    expect(el.querySelector('.tag-list a')?.getAttribute('href')).toBe('/he/tags/rust');
    const verify = el.querySelector('.certificates__verify');
    expect(verify?.getAttribute('href')).toBe('https://www.udemy.com/certificate/UC-00000000/');
    expect(verify?.textContent?.trim()).toBe('אימות התעודה');
    expect(TestBed.inject(Title).getTitle()).toBe('תעודות · לום');
  });

  it('links the picture itself and omits the verify link when there is no file or url (en)', async () => {
    const bare: ContentLoader = async (path) =>
      path === 'certificates.json'
        ? [{ key: 'x', title: 'X', issuer: 'LinkedIn', date: '2026-01-01', image: '/certificates/x.png', tags: [] }]
        : fixtureContentLoader(path);
    const el = await open('/en/certificates', bare);
    expect(el.querySelector('.certificates__image')?.getAttribute('href')).toBe('certificates/x.png');
    expect(el.querySelector('img')?.getAttribute('alt')).toBe('Certificate: X');
    expect(el.querySelector('.certificates__verify')).toBeNull();
    expect(el.querySelector('.tag-list')).toBeNull();
  });

  it('shows the empty text', async () => {
    const empty: ContentLoader = async (path) => (path === 'certificates.json' ? [] : fixtureContentLoader(path));
    const el = await open('/en/certificates', empty);
    expect(el.querySelector('.certificates__empty')?.textContent?.trim()).toBe('No certificates yet.');
    expect(el.querySelector('.certificates')).toBeNull();
  });
});
