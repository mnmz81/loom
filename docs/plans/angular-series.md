# Angular series plan (84 posts)

Decisions: he + en, Angular 22 (the current version), beginner to expert. Every claim checked against angular.dev.
Every post that teaches an API that changed ends with an "In older versions" section (`### In older versions` /
`### בגרסאות קודמות`) showing the pre-v22 way, so readers of older code and tutorials recognise it.
Slug prefix `angular-`, series key `angular`, tag `angular`. One commit per post or per batch.

Verified baseline (angular.dev, Oct 2026): OnPush is the default since v22 (old default renamed `Eager`);
zoneless is the default since v21; v22 needs Node ^22.22.3 / ^24.15.0 / ^26.0.0 and TypeScript 6.0;
majors every ~12 months since v22 (6 before), 12 months active + 12 months LTS.
Still to verify before the post that uses them: `@Service()`, `injectAsync`, `chain()`, the v22 template
additions (InfoQ only, the official v22 blog post blocks fetching) and `@boundary` (announced for Q3 2026).

## Version history (source for "In older versions")
v14 `inject()`, typed forms · v15 standalone stable, functional guards/interceptors · v16 signals preview ·
v17 `@if`/`@for`/`@defer`, esbuild default · v18 zoneless experimental, `@let` · v19 standalone default,
`linkedSignal`/`resource` experimental, incremental hydration · v20 signal APIs stable, zoneless stable (20.2),
`animate.enter` · v21 zoneless default, Vitest default, Signal Forms experimental ·
v22 OnPush default, Signal Forms / Aria / `resource` stable, `@Service()`, Fetch default, Webpack deprecated.
(Items not listed under "Verified baseline" are from memory: check each one in its post.)

## Level 0: Before you start
1 angular-what-is-angular · 2 angular-typescript-for-angular (may become a link to a TypeScript series) ·
3 angular-install-ng-new · 4 angular-project-structure

## Level 1: Components and templates
5 angular-first-component · 6 angular-bindings · 7 angular-control-flow · 8 angular-template-expressions ·
9 angular-ng-template · 10 angular-styling · 11 angular-pipes · 12 angular-content-projection

## Level 2: Signals and component communication
13 angular-signals · 14 angular-effect · 15 angular-linked-signal · 16 angular-inputs · 17 angular-outputs-model ·
18 angular-queries · 19 angular-lifecycle · 20 angular-component-communication

## Level 3: Change detection, old vs new
21 angular-change-detection · 22 angular-zone-js · 23 angular-eager-strategy · 24 angular-onpush ·
25 angular-onpush-default-v22 · 26 angular-zoneless · 27 angular-zoneless-migration · 28 angular-reactivity-model

## Level 4: DI and services
29 angular-inject · 30 angular-service-decorator · 31 angular-providers · 32 angular-advanced-di

## Level 5: Routing
33 angular-routing · 34 angular-nested-routes · 35 angular-route-params · 36 angular-lazy-loading ·
37 angular-guards-resolvers · 38 angular-router-extras

## Level 6: Data and HTTP
39 angular-http-client · 40 angular-interceptors · 41 angular-http-errors · 42 angular-resource ·
43 angular-http-resource · 44 angular-rxjs-basics · 45 angular-rxjs-interop

## Level 7: Forms
46 angular-forms-overview · 47 angular-signal-forms · 48 angular-signal-forms-validation ·
49 angular-signal-forms-arrays · 50 angular-reactive-forms · 51 angular-custom-form-controls

## Level 8: Directives and advanced templates
52 angular-attribute-directives · 53 angular-structural-directives · 54 angular-dynamic-components ·
55 angular-defer · 56 angular-animations · 57 angular-error-handling

## Level 9: Quality
58 angular-testing-components · 59 angular-testing-services · 60 angular-testing-signals · 61 angular-e2e ·
62 angular-accessibility-aria · 63 angular-cdk · 64 angular-material · 65 angular-tailwind

## Level 10: Rendering and delivery
66 angular-ssr-hydration · 67 angular-incremental-hydration · 68 angular-ssg · 69 angular-i18n ·
70 angular-pwa · 71 angular-web-workers · 72 angular-build-config · 73 angular-deploy-github-pages

## Level 11: Expert
74 angular-devtools-profiling · 75 angular-bundle-size · 76 angular-security · 77 angular-state-management ·
78 angular-architecture · 79 angular-nx-monorepo · 80 angular-libraries · 81 angular-ng-update ·
82 angular-migrate-standalone · 83 angular-migrate-signals · 84 angular-ai-tooling
