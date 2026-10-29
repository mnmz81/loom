import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CONTENT_LOADER } from '../../core/content-loader';
import { SITE } from '../../core/site.config';
import { fixtureContentLoader } from '../../core/testing/fixture-content-loader';
import { AccessibilityPage } from './accessibility-page';

async function open(url: string) {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), { provide: CONTENT_LOADER, useValue: fixtureContentLoader }],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, AccessibilityPage);
  await harness.fixture.whenStable();
  return harness.routeNativeElement as HTMLElement;
}

describe('AccessibilityPage', () => {
  it('shows the Hebrew statement with the coordinator contact (he)', async () => {
    const el = await open('/he/accessibility');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('הצהרת נגישות');
    expect(el.querySelector('a[href^="mailto:"]')?.getAttribute('href')).toBe(`mailto:${SITE.accessibility.email}`);
    expect(el.querySelectorAll('h2').length).toBe(3);
    expect(el.textContent).toContain('תוך 14 יום');
    expect(TestBed.inject(Title).getTitle()).toContain('הצהרת נגישות');
  });

  it('shows the English statement (en)', async () => {
    const el = await open('/en/accessibility');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Accessibility statement');
    expect(el.textContent).toContain('within 14 days');
    expect(el.querySelector('time')?.getAttribute('datetime')).toBe(SITE.accessibility.updated);
  });

  it('is excluded from the search index', async () => {
    const el = await open('/en/accessibility');
    expect(el.hasAttribute('data-pagefind-ignore') || el.closest('[data-pagefind-ignore]') !== null).toBe(true);
  });
});
