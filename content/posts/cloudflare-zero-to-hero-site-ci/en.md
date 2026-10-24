---
title: "Cloudflare from zero to hero: a static site, your own domain and deploys from GitHub"
summary: "Serve a static site from a Worker with static assets, a 404 page and SPA mode, connect your own domain with custom_domain, and deploy on every push with GitHub Actions and wrangler-action."
date: 2026-10-24
tags: [cloudflare, cloud]
series: { key: devops, order: 32 }
---

A static site is a folder of ready HTML, CSS and JS files, like the output of `npm run build` in Angular, React or Astro. A Worker can serve it straight from Cloudflare's network, without a line of code. Every local example ran with Wrangler 4.152.

## A static site

```text
my-site/
├── wrangler.jsonc
└── public/
    ├── index.html
    ├── 404.html
    └── style.css
```

```jsonc
{
  "name": "my-site",
  "compatibility_date": "2026-10-24",
  "assets": {
    "directory": "./public",
    "not_found_handling": "404-page"
  }
}
```

There's no `main` here: with no code, Wrangler serves the files in `directory` as they are. `npx wrangler dev` shows it locally:

```text
GET /           → 200, index.html
GET /style.css  → 200, Content-Type: text/css; charset=utf-8
GET /missing    → 404, 404.html
```

`not_found_handling` has two useful options:

- `404-page`: a path that doesn't exist gets `404.html`.
- `single-page-application`: a path that doesn't exist gets `index.html` with a 200, and the app's client-side router handles it.

Need an API too? Add a `main` with a Worker as in the earlier posts. Static files are served first, and the Worker only gets requests that matched no file ([docs](https://developers.cloudflare.com/workers/static-assets/)).

## Your own domain

If the domain is already on Cloudflare ([post 2](en/posts/cloudflare-zero-to-hero-dns-ssl/)), add to `wrangler.jsonc`:

```jsonc
"routes": [
  { "pattern": "www.example.com", "custom_domain": true }
]
```

On the next `deploy`, Cloudflare creates the DNS record and the HTTPS certificate itself. There must not already be a `CNAME` record on that name: delete it first ([docs](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)).

## Automatic deploys from GitHub

So far we deployed from our own machine. CI has no browser to sign in with, so GitHub Actions needs an API token ([post 1](en/posts/cloudflare-zero-to-hero/)) and the account ID:

1. **My Profile → API Tokens → Create Token**, pick the **Edit Cloudflare Workers** template and limit it to your account.
2. `npx wrangler whoami` prints the Account ID, and it's also shown in the dashboard.
3. Store both as repository secrets:

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

`gh` prompts for the value without showing it. Never keep the token in code or in a file in the repo. How secrets work in Actions is covered in the [post on secrets and deploys](en/posts/github-actions-zero-to-hero-secrets-deploy/).

Now a workflow in `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

`wrangler-action` installs Wrangler and runs `wrangler deploy` by default ([docs](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)). A site that needs a build gets `actions/setup-node`, `npm ci` and `npm run build` steps before it. From now on every push to `main` uploads a new version, and if something breaks, `wrangler rollback` from [post 4](en/posts/cloudflare-wrangler/) brings back the previous one.
