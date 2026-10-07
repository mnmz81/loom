import { Injectable, TransferState, inject, makeStateKey } from '@angular/core';
import { CONTENT_LOADER } from './content-loader';
import { type Entry, type EntryType, type Lang, type LangIndex, type SeriesIndex, TYPE_SEGMENT } from './content.models';

/**
 * Reads the generated content JSON (paths per content.models.ts). Every file is cached in TransferState,
 * so data loaded during prerender is serialized into the page and not fetched again on hydration.
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly load = inject(CONTENT_LOADER);
  private readonly state = inject(TransferState);

  /** `<lang>/index.json` — every published entry once (fallback entries have `lang !== index.lang`). */
  getIndex(lang: Lang): Promise<LangIndex> {
    return this.get<LangIndex>(`${lang}/index.json`);
  }

  /** `<lang>/<type>s/<slug>.json` — rejects when the entry does not exist in `lang`. */
  getEntry(lang: Lang, type: EntryType, slug: string): Promise<Entry> {
    return this.get<Entry>(`${lang}/${TYPE_SEGMENT[type]}/${slug}.json`);
  }

  /** `series.json` — all series, sorted by key. */
  getSeries(): Promise<SeriesIndex> {
    return this.get<SeriesIndex>('series.json');
  }

  private async get<T>(path: string): Promise<T> {
    const key = makeStateKey<T>(`content:${path}`);
    const cached = this.state.get(key, null);
    if (cached !== null) return cached;
    const data = (await this.load(path)) as T;
    this.state.set(key, data);
    return data;
  }
}
