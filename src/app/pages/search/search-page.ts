import { Location, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EntryType, LangIndex } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';
import { pageCount, pageText } from '../page-text';
import { allLangPaths } from '../seo-helpers';
import { type SearchFilters, type SearchHit, SearchService, SearchUnavailableError } from './search.service';

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';

const DEBOUNCE_MS = 200;

/** `/:lang/search` — Pagefind search with type and tag filters. Only searches in the browser. */
@Component({
  selector: 'nb-search-page',
  imports: [RouterLink],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-pagefind-ignore': '' },
})
export class SearchPage {
  readonly index = input.required<LangIndex>();
  /** Initial query from `?q=` (router input binding). */
  readonly q = input<string | undefined>(undefined);

  protected readonly locale = inject(LocaleService);
  private readonly search = inject(SearchService);
  private readonly location = inject(Location);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly query = signal('');
  protected readonly type = signal<EntryType | ''>('');
  protected readonly tag = signal('');
  protected readonly status = signal<SearchStatus>('idle');
  protected readonly hits = signal<SearchHit[]>([]);
  protected readonly total = signal(0);

  protected readonly tagLabels = computed(() => Object.fromEntries(this.index().tags.map((t) => [t.tag, t.label])));
  protected readonly typeOptions = computed<{ value: EntryType; label: string }[]>(() => [
    { value: 'post', label: this.locale.t('type.post') },
    { value: 'note', label: this.locale.t('type.note') },
  ]);

  /** Text for the polite live region: loading, result count, "no results" or an error. */
  protected readonly liveMessage = computed(() => {
    const lang = this.locale.lang();
    switch (this.status()) {
      case 'loading':
        return pageText(lang, 'search.loading');
      case 'unavailable':
        return this.locale.t('search.unavailable');
      case 'error':
        return pageText(lang, 'search.error');
      case 'ready':
        return this.total() === 0
          ? this.locale.t('search.noResults', { query: this.query().trim() })
          : pageCount(lang, this.total(), 'search.resultsOne', 'search.resultsOther');
      default:
        return '';
    }
  });
  protected readonly hint = computed(() => pageText(this.locale.lang(), 'search.hint'));
  protected text(key: Parameters<typeof pageText>[1]): string {
    return pageText(this.locale.lang(), key);
  }
  protected typeLabel(type: EntryType | null): string {
    return type ? this.locale.t(`type.${type}`) : '';
  }

  private timer: ReturnType<typeof setTimeout> | undefined;
  /** Incremented per run; a response from an older run is dropped. */
  private run = 0;

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const lang = this.locale.lang();
      seo.set({
        lang,
        title: this.locale.t('search.title'),
        description: this.locale.t('search.placeholder'),
        path: PATHS.search(lang),
        alternates: allLangPaths(PATHS.search),
      });
    });

    effect(() => {
      const initial = this.q();
      untracked(() => {
        if (this.isBrowser && initial && !this.query()) {
          this.query.set(initial);
          this.schedule(0);
        }
      });
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.syncUrl();
    this.schedule(DEBOUNCE_MS);
  }

  protected onType(event: Event): void {
    this.type.set((event.target as HTMLSelectElement).value as EntryType | '');
    this.schedule(0);
  }

  protected onTag(event: Event): void {
    this.tag.set((event.target as HTMLSelectElement).value);
    this.schedule(0);
  }

  private schedule(delay: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.execute(), delay);
  }

  /** Keeps `?q=` in the address bar (shareable, survives reload) without a router navigation. */
  private syncUrl(): void {
    const q = this.query().trim();
    this.location.replaceState(this.location.path().split('?')[0], q ? `q=${encodeURIComponent(q)}` : '');
  }

  private async execute(): Promise<void> {
    const term = this.query().trim();
    const filters: SearchFilters = { type: this.type(), tag: this.tag() };
    const id = ++this.run;
    if (!term && !filters.type && !filters.tag) {
      this.hits.set([]);
      this.total.set(0);
      this.status.set('idle');
      return;
    }
    this.status.set('loading');
    try {
      const result = await this.search.search(term, filters);
      if (id !== this.run) return;
      this.hits.set(result.hits);
      this.total.set(result.total);
      this.status.set('ready');
    } catch (error) {
      if (id !== this.run) return;
      this.hits.set([]);
      this.total.set(0);
      this.status.set(error instanceof SearchUnavailableError ? 'unavailable' : 'error');
    }
  }
}
