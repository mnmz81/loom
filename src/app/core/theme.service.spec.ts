import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ThemeService } from './theme.service';

function stubSystemDark(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }));
}

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses the stored theme first', () => {
    localStorage.setItem('theme', 'dark');
    stubSystemDark(false);
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });

  it('ignores invalid stored values and falls back to the system preference', () => {
    localStorage.setItem('theme', 'purple');
    stubSystemDark(true);
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });

  it('defaults to light', () => {
    stubSystemDark(false);
    expect(TestBed.inject(ThemeService).theme()).toBe('light');
  });

  it('toggle switches theme, sets data-theme and persists', () => {
    stubSystemDark(false);
    const service = TestBed.inject(ThemeService);
    service.toggle();
    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    service.toggle();
    expect(service.theme()).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('survives blocked storage', () => {
    stubSystemDark(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
    expect(() => service.set('light')).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('on the server defaults to light and never touches storage', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
    service.set('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(setItem).not.toHaveBeenCalled();
  });
});
