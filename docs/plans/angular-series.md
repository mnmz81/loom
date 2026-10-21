# Angular series plan (83 posts)

Decisions: he + en, Angular 22 (the current version), beginner to expert. Every claim checked against angular.dev.
Every post that teaches an API that changed ends with an "In older versions" section (`### In older versions` /
`### בגרסאות קודמות`) showing the pre-v22 way, so readers of older code and tutorials recognise it.
Slug prefix `angular-`, series key `angular`, tag `angular`. One commit per post or per batch.
TypeScript is its own series (`docs/plans/typescript-series.md`); Angular posts link to it instead of teaching TS.

Verified baseline (angular.dev, Oct 2026): OnPush is the default since v22 (old default renamed `Eager`);
zoneless is the default since v21; v22 needs Node ^22.22.3 / ^24.15.0 / ^26.0.0 and TypeScript 6.0;
majors every ~12 months since v22 (6 before), 12 months active + 12 months LTS.
Verified while writing the posts (22.2.x): `@Service()` (shorthand for `@Injectable({providedIn: 'root'})`, taught in post 29),
`injectAsync` + `onIdle` (public API since 22.0), `@boundary` (developer preview), template spread / arrow functions / `@let`,
`resource` / `rxResource` / `httpResource` stable since 22.0 (options renamed to `params` / `stream` in v20), Signal Forms stable in v22
(`[formField]`; was `[field]` in 21.0), `paramsInheritanceStrategy` default `'always'` in v22, `?.` in templates returns `undefined` in v22.
`chain` is not a top-level import: it is passed to the `params` callback (`params: ({ chain }) => chain(this.user)?.teamId`, post 41).
InfoQ's claim that the v22 update removes `withFetch()` is wrong: the migration adds `withXhr()` where neither is set.

## Version history (source for "In older versions")
v14 `inject()`, typed forms · v15 standalone stable, functional guards/interceptors · v16 signals preview ·
v17 `@if`/`@for`/`@defer`, esbuild default · v18 zoneless experimental, `@let` · v19 standalone default,
`linkedSignal`/`resource` experimental, incremental hydration · v20 signal APIs stable, zoneless stable (20.2),
`animate.enter` · v21 zoneless default, Vitest default, Signal Forms experimental ·
v22 OnPush default, Signal Forms / Aria / `resource` stable, `@Service()`, Fetch default, Webpack deprecated.
(Items not listed under "Verified baseline" are from memory: check each one in its post.)

## Level 0: Before you start
1 angular-what-is-angular · 2 angular-install-ng-new · 3 angular-project-structure

## Level 1: Components and templates
4 angular-first-component · 5 angular-bindings · 6 angular-control-flow · 7 angular-template-expressions ·
8 angular-ng-template · 9 angular-styling · 10 angular-pipes · 11 angular-content-projection

## Level 2: Signals and component communication
12 angular-signals · 13 angular-effect · 14 angular-linked-signal · 15 angular-inputs · 16 angular-outputs-model ·
17 angular-queries · 18 angular-lifecycle · 19 angular-component-communication

## Level 3: Change detection, old vs new
20 angular-change-detection · 21 angular-zone-js · 22 angular-eager-strategy · 23 angular-onpush ·
24 angular-onpush-default-v22 · 25 angular-zoneless · 26 angular-zoneless-migration · 27 angular-reactivity-model

## Level 4: DI and services
28 angular-inject · 29 angular-service-decorator · 30 angular-providers · 31 angular-advanced-di

## Level 5: Routing
32 angular-routing · 33 angular-nested-routes · 34 angular-route-params · 35 angular-lazy-loading ·
36 angular-guards-resolvers · 37 angular-router-extras

## Level 6: Data and HTTP
38 angular-http-client · 39 angular-interceptors · 40 angular-http-errors · 41 angular-resource ·
42 angular-http-resource · 43 angular-rxjs-basics · 44 angular-rxjs-interop

## Level 7: Forms
45 angular-forms-overview · 46 angular-signal-forms · 47 angular-signal-forms-validation ·
48 angular-signal-forms-arrays · 49 angular-reactive-forms · 50 angular-custom-form-controls

## Level 8: Directives and advanced templates
51 angular-attribute-directives · 52 angular-structural-directives · 53 angular-dynamic-components ·
54 angular-defer · 55 angular-animations · 56 angular-error-handling

## Level 9: Quality
57 angular-testing-components · 58 angular-testing-services · 59 angular-testing-signals · 60 angular-e2e ·
61 angular-accessibility-aria · 62 angular-cdk · 63 angular-material · 64 angular-tailwind

## Level 10: Rendering and delivery
65 angular-ssr-hydration · 66 angular-incremental-hydration · 67 angular-ssg · 68 angular-i18n ·
69 angular-pwa · 70 angular-web-workers · 71 angular-build-config · 72 angular-deploy-github-pages

## Level 11: Expert
73 angular-devtools-profiling · 74 angular-bundle-size · 75 angular-security · 76 angular-state-management ·
77 angular-architecture · 78 angular-nx-monorepo · 79 angular-libraries · 80 angular-ng-update ·
81 angular-migrate-standalone · 82 angular-migrate-signals · 83 angular-ai-tooling
