// PLACEHOLDER (Wave 0) — replaced by the Wave 2 pages agent.
import { Routes } from '@angular/router';
import { langGuard } from './core/i18n/lang.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'he' },
  { path: ':lang', canActivate: [langGuard], children: [] },
];
