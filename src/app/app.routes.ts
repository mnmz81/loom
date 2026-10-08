import { CanMatchFn, Routes } from '@angular/router';
import { DEFAULT_LANG, LANGS } from './core/content.models';
import { entryResolver, langIndexResolver, seriesIndexResolver } from './core/content.resolvers';
import { langGuard } from './core/i18n/lang.guard';
import { seriesResolver, tagResolver } from './pages/page.resolvers';

/** `:lang` only matches a supported language, so unknown first segments fall through to the 404 route. */
export const langMatch: CanMatchFn = (_route, segments) =>
  (LANGS as readonly string[]).includes(segments[0]?.path ?? '');

const notFound = () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: DEFAULT_LANG },
  { path: '404', loadComponent: notFound },
  {
    path: ':lang',
    canMatch: [langMatch],
    canActivate: [langGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage),
        resolve: { index: langIndexResolver, series: seriesIndexResolver },
      },
      {
        path: 'posts',
        loadComponent: () => import('./pages/entries/entries-page').then((m) => m.EntriesPage),
        data: { type: 'post' },
        resolve: { index: langIndexResolver },
      },
      {
        path: 'notes',
        loadComponent: () => import('./pages/entries/entries-page').then((m) => m.EntriesPage),
        data: { type: 'note' },
        resolve: { index: langIndexResolver },
      },
      {
        path: 'posts/:slug',
        loadComponent: () => import('./pages/entry/entry-page').then((m) => m.EntryPage),
        resolve: { entry: entryResolver('post'), index: langIndexResolver },
      },
      {
        path: 'notes/:slug',
        loadComponent: () => import('./pages/entry/entry-page').then((m) => m.EntryPage),
        resolve: { entry: entryResolver('note'), index: langIndexResolver },
      },
      {
        path: 'series',
        loadComponent: () => import('./pages/series-list/series-list-page').then((m) => m.SeriesListPage),
        resolve: { series: seriesIndexResolver },
      },
      {
        path: 'series/:key',
        loadComponent: () => import('./pages/series/series-page').then((m) => m.SeriesPage),
        resolve: { series: seriesResolver, index: langIndexResolver },
      },
      {
        path: 'tags/:tag',
        loadComponent: () => import('./pages/tag/tag-page').then((m) => m.TagPage),
        resolve: { tagInfo: tagResolver, index: langIndexResolver },
      },
      {
        path: 'search',
        loadComponent: () => import('./pages/search/search-page').then((m) => m.SearchPage),
        resolve: { index: langIndexResolver },
      },
      { path: '**', loadComponent: notFound },
    ],
  },
  { path: '**', loadComponent: notFound },
];
