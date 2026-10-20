# TypeScript series plan (30 posts)

Decisions: he + en, TypeScript 6.0 (the version this repo and Angular 22 use) and 7.0 (native Go compiler,
July 2026, no stable library API until 7.1), assumes basic JavaScript. Every example is checked with
`scripts/check-ts-examples.py` (repo tsc 6.0 + `TSC7="npx -y -p typescript@7.0.2 tsc"`, run with Node 24).
Posts where TypeScript changed get an "In older versions" section (`### In older versions` / `### בגרסאות קודמות`).
Slug prefix `typescript-`, series key `typescript`, tag `typescript`. Comes before the Angular series, which
links here instead of having its own TypeScript post.

Verified baseline (typescriptlang.org, nodejs.org, Oct 2026): TS 6.0 defaults `strict: true`, `module: esnext`,
`target: es2025`, `types: []`, `rootDir` = tsconfig dir; deprecates `target: es5`, `--baseUrl`,
`moduleResolution node`, `--downlevelIteration`; removes `--outFile`, `moduleResolution classic`; deprecated
options are gone in 7.0 (native port, `@typescript/native-preview`, `--stableTypeOrdering` to compare).
Node runs `.ts` by type stripping: default since 22.18 / 23.6, stable since 24.12 / 25.2; no `enum`, runtime
`namespace`, parameter properties or decorators; ignores tsconfig.
Still to verify before the post that uses it: whether Angular 22 still needs `experimentalDecorators` (post 15).

## Level 0: Start
1 typescript-what-is-typescript · 2 typescript-setup (`tsc`, Node type stripping vs `tsx`, `erasableSyntaxOnly`) ·
3 typescript-tsconfig (6.0 defaults vs 5.x)

## Level 1: Basics
4 typescript-basic-types · 5 typescript-any-unknown-never · 6 typescript-functions · 7 typescript-object-types ·
8 typescript-interface-vs-type · 9 typescript-unions-literals · 10 typescript-narrowing ·
11 typescript-null-undefined · 12 typescript-enums

## Level 2: Classes and modules
13 typescript-classes · 14 typescript-modules · 15 typescript-decorators · 16 typescript-assertions-satisfies

## Level 3: Generics and type manipulation
17 typescript-generics · 18 typescript-generics-in-practice · 19 typescript-keyof-typeof ·
20 typescript-utility-types · 21 typescript-conditional-types · 22 typescript-mapped-types

## Level 4: Real projects
23 typescript-async · 24 typescript-runtime-validation (zod, links to python-pydantic) ·
25 typescript-declaration-files · 26 typescript-migrate-from-js · 27 typescript-error-messages ·
28 typescript-monorepo · 29 typescript-testing · 30 typescript-7-native (already released: moving to it)
