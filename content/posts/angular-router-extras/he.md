---
title: "תוספות לראוטר של Angular: כותרת עמוד, view transitions, גלילה ואירועי ניווט"
summary: "כותרת עמוד עם title ו-TitleStrategy, ‏withViewTransitions, שחזור גלילה וגלילה לעוגן עם withInMemoryScrolling, ‏withRouterConfig ואירועי הניווט."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 37 }
---

אחרי שהניווט עובד, כמה פרטים קטנים קובעים אם האפליקציה מרגישה כמו אתר: כותרת הלשונית, גלילה שחוזרת למקום אחרי "אחורה", ומעבר חלק בין עמודים. כולם מוגדרים כ-features ב-`provideRouter`.

כל דוגמה נבדקה עם Angular 22.2. את הגלילה וה-view transitions בדקתי גם בדפדפן אמיתי (Chromium), כי הם לא עובדים ב-jsdom.

## כותרת העמוד

‏[`title`](https://angular.dev/guide/routing/define-routes#page-titles) ב-route קובע את `document.title` כשה-route מופעל. הוא יכול להיות מחרוזת או `ResolveFn` ([resolvers](he/posts/angular-guards-resolvers/)). כדי להוסיף לכל כותרת את שם האתר, מחליפים את ה-`TitleStrategy`:

```typescript
import { Service, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ResolveFn, RouterStateSnapshot, TitleStrategy } from '@angular/router';

@Service()
export class LoomTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot) {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} | Loom` : 'Loom');
  }
}

export const postTitle: ResolveFn<string> = (route) => `Post ${route.paramMap.get('slug')}`;
```

‏`buildTitle` מחזיר את ה-`title` של ה-route העמוק ביותר, או `undefined` כשאין. אחרי שרושמים את האסטרטגיה, `/docs` מציג `Docs | Loom`, ו-`/posts/intro` מציג `Post intro | Loom`. ‏`/` בלי `title` מציג `Loom`.

## כל ה-features ב-provideRouter

```typescript
import { ApplicationConfig } from '@angular/core';
import {
  Routes,
  TitleStrategy,
  provideRouter,
  withInMemoryScrolling,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';
import { Docs, Home, Post } from './pages';
import { LoomTitleStrategy, postTitle } from './title';

const routes: Routes = [
  { path: '', component: Home },
  { path: 'docs', component: Docs, title: 'Docs' },
  { path: 'posts/:slug', component: Post, title: postTitle },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
    { provide: TitleStrategy, useExisting: LoomTitleStrategy },
  ],
};
```

- **`withViewTransitions()`** מריץ את החלפת הקומפוננטות בתוך [`document.startViewTransition`](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API), כך שהדפדפן מבצע מעבר חלק, כברירת מחדל דהייה בין הישן לחדש. בדפדפן שלא תומך בזה הניווט רגיל, בלי אנימציה. בבדיקה, כל ניווט קרא ל-`startViewTransition` פעם אחת. לעיצוב המעבר כותבים CSS על `::view-transition-old()` ו-`::view-transition-new()` ב-[סגנונות גלובליים](https://angular.dev/guide/routing/route-transition-animations), לא בסגנון של קומפוננטה. ‏`withViewTransitions` מסומן עדיין כ-developer preview.
- **`scrollPositionRestoration: 'enabled'`**: ניווט קדימה גולל לראש העמוד, ו"אחורה" מחזיר למקום שבו היה המשתמש. בעמוד ארוך, גללתי ל-`y: 500` בבית, עברתי ל-`/docs` וחזרתי, והעמוד חזר ל-`y: 500`. ברירת המחדל, `'disabled'`, משאירה את הגלילה כמו שהיא.
- **`anchorScrolling: 'enabled'`**: קישור עם `fragment="install"` מוביל ל-`/docs#install`, והדף גולל לאלמנט עם `id="install"`. בבדיקה האלמנט הגיע לראש החלון.
- **`onSameUrlNavigation: 'reload'`**: ניווט ל-URL שכבר פתוח מריץ שוב את כל מחזור הניווט, כולל guards ו-resolvers. ברירת המחדל, `'ignore'`, מתעלמת ממנו. זו אחת מהאפשרויות של [`withRouterConfig`](https://angular.dev/guide/routing/customizing-route-behavior#router-configuration-options), לצד `paramsInheritanceStrategy` מהפוסט על פרמטרים.

## אירועי ניווט

הראוטר מפרסם [אירועים](https://angular.dev/guide/routing/lifecycle-and-events) ב-`router.events`. ניווט מוצלח ל-route עם resolver עובר דרך:

```text
NavigationStart, RoutesRecognized, GuardsCheckStart, ChildActivationStart, ActivationStart,
GuardsCheckEnd, ResolveStart, ResolveEnd, ActivationEnd, ChildActivationEnd, NavigationEnd
```

‏כל ניווט מסתיים באחד מ-`NavigationEnd`, ‏`NavigationCancel`, ‏`NavigationError` או `NavigationSkipped`. לרוב לא צריך להאזין לכל האירועים. בשביל אינדיקציית טעינה יש signal, ובשביל לדעת על עמוד שנטען מסננים אירוע אחד:

```typescript
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    @if (navigating()) {
      <p role="status">Loading…</p>
    }
    <router-outlet />
    <footer>Last page: {{ lastUrl()?.urlAfterRedirects }}</footer>
  `,
})
export class App {
  private readonly router = inject(Router);
  protected readonly navigating = computed(() => this.router.currentNavigation() !== null);
  protected readonly lastUrl = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    { initialValue: null },
  );
}
```

‏`router.currentNavigation()` הוא signal שמחזיר את הניווט שרץ כרגע, או `null`. כל עוד resolver רץ מוצג `Loading…`, ובסוף הניווט ל-`/docs` הכותרת התחתונה מציגה `Last page: /docs`.

### בגרסאות קודמות

באפליקציות NgModule אותן אפשרויות עברו ל-`RouterModule.forRoot` כאובייקט:

```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled',
      onSameUrlNavigation: 'reload',
      enableViewTransitions: true,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
```

‏`title` ב-route ו-`TitleStrategy` נוספו בגרסה 14, ו-view transitions בגרסה 17. לפני `title` קבעו את הכותרת ידנית עם שירות `Title` בכל קומפוננטה. את `router.getCurrentNavigation()` החליף `router.currentNavigation()` [מגרסה 20.2](https://github.com/angular/angular/blob/main/CHANGELOG.md), והישן מסומן deprecated.

## טעויות נפוצות של מתחילים

- **לעצב את ה-view transition בסגנון של קומפוננטה.** ה-pseudo-elements `::view-transition-*` שייכים לעמוד כולו, ו-view encapsulation חוסם אותם. הסגנון צריך להיות ב-`styles.css`.
- **לצפות שהגלילה תשוחזר בלי להפעיל אותה.** ברירת המחדל לא מחזירה למקום ולא גוללת לעוגנים.

## מה הלאה

בפוסט הבא: ‏HttpClient. קריאות לשרת, ‏`provideHttpClient` והטיפוסים של התשובה.
