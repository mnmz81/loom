import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { en } from './en';
import { he } from './he';
import { LocaleService } from './locale.service';

describe('LocaleService', () => {
  let service: LocaleService;
  let html: HTMLElement;

  beforeEach(() => {
    service = TestBed.inject(LocaleService);
    html = TestBed.inject(DOCUMENT).documentElement;
  });

  it('defaults to Hebrew, RTL', () => {
    expect(service.lang()).toBe('he');
    expect(service.dir()).toBe('rtl');
    expect(service.otherLang()).toBe('en');
  });

  it('setLang updates the signal and <html lang dir>', () => {
    service.setLang('en');
    expect(service.dir()).toBe('ltr');
    expect(html.getAttribute('lang')).toBe('en');
    expect(html.getAttribute('dir')).toBe('ltr');
    service.setLang('he');
    expect(html.getAttribute('dir')).toBe('rtl');
  });

  it('translates with placeholders', () => {
    service.setLang('en');
    expect(service.t('series.part', { index: 2, total: 5 })).toBe('Part 2 of 5');
    expect(service.t('nav.posts')).toBe('Posts');
    service.setLang('he');
    expect(service.t('nav.posts')).toBe('פוסטים');
  });

  it('keeps unknown placeholders', () => {
    service.setLang('en');
    expect(service.t('entry.readingMinutes')).toBe('{n} min read');
  });

  it('formats dates per language without timezone drift', () => {
    expect(service.formatDate('2026-10-07', 'en')).toBe('October 7, 2026');
    expect(service.formatDate('2026-10-07', 'he')).toContain('2026');
  });

  it('he and en dictionaries have the same keys', () => {
    expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort());
  });
});
