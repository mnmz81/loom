---
title: "Deploying Angular to GitHub Pages with GitHub Actions"
summary: "Putting an Angular app on GitHub Pages: baseHref for a subfolder site, 404.html for client-side routing, a workflow that uploads dist/<app>/browser, and angular-cli-ghpages as an alternative."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 72 }
---

GitHub Pages serves static files straight from the repository, for free, and that's enough for an Angular app without a server. A repository site lives at `https://<user>.github.io/<repo>/`, and that subfolder drives the two settings in this post. This blog, [Loom](https://mnmz81.github.io/loom/), is deployed exactly this way.

Every example was checked with Angular 22.2. The action versions are the current ones as of October 2026.

## baseHref

The app doesn't sit at the domain root but at `/my-app/`. The `<base href>` tag in `index.html` tells the browser and the Router where relative URLs start. With the default, `/`, the browser requests `main.js` from the domain root, gets a 404, and the page stays blank.

```bash
ng build --base-href /my-app/
```

```text
<base href="/my-app/">
```

That's the line in `dist/<app>/browser/index.html` after the build. You can also fix the value in `angular.json`, as this blog does, with `"baseHref": "/loom/"` in the `production` configuration, so `ng serve` stays on `/`. The value must end with `/`: with `/my-app` the browser resolves relative URLs from `/`.

## 404 for client-side routing

With [routing](en/posts/angular-routing/), the URL `/my-app/about` doesn't exist as a file. A normal server is [configured to return `index.html`](https://angular.dev/tools/cli/deployment) for any unknown URL, but GitHub Pages has no server settings. What it has is a [custom 404 page](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site). Copy `index.html` to `404.html`, Angular loads on an unknown URL too, and the Router reads the URL and shows the right page.

```bash
curl -sI https://mnmz81.github.io/loom/en/does-not-exist
```

```text
HTTP/2 404
server: GitHub.com
content-type: text/html; charset=utf-8
```

The status code is 404 even when the page renders correctly, and search engines see a 404. A [prerendered](en/posts/angular-ssg/) site avoids this: every route has its own `index.html` that returns 200, and `404.html` only serves URLs that really don't exist. That's how this blog works: a script after the build copies the prerendered 404 page to `404.html`.

## A GitHub Actions workflow

Under **Settings → Pages**, pick **GitHub Actions** as the Source ([docs](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)), and add `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx ng build --base-href /my-app/
      - run: cp dist/my-app/browser/index.html dist/my-app/browser/404.html
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist/my-app/browser

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

- The `build` job builds and uploads only `dist/my-app/browser` as an artifact. `deploy` waits for it (`needs`) and publishes.
- [`deploy-pages`](https://github.com/actions/deploy-pages) needs the `pages: write` and `id-token: write` permissions, and the `github-pages` environment.
- `concurrency` with `cancel-in-progress: false` keeps two deployments from running at once, without cancelling one that already started.
- Since version 4, `upload-pages-artifact` leaves out files that start with a dot. Version 5 adds `include-hidden-files: true` for that.

This blog's workflow has the same shape, with tests running before the build.

## Alternative: angular-cli-ghpages

```bash
ng add angular-cli-ghpages
ng deploy --base-href=/my-app/
```

Per [the README](https://github.com/angular-schule/angular-cli-ghpages), `ng deploy` builds in production mode, pushes the result to the `gh-pages` branch, and creates `404.html` by default. Here the Source in Settings is the branch, not GitHub Actions. It's handy for deploying from your machine; a workflow is handier when you want tests and an automatic deployment on every push.

## Mistakes beginners make

- **Forgetting `baseHref`.** The page loads blank, and the Console shows a 404 for `main-*.js` from the domain root.
- **Uploading `dist/my-app` instead of `dist/my-app/browser`.** `index.html` is inside `browser/`, and GitHub Pages returns 404 at the root.
- **Forgetting `permissions`.** Without `pages: write` and `id-token: write`, the `deploy` job fails.

## What's next

Next: measuring performance with Angular DevTools, and finding components that render too often.
