---
title: "GitHub Actions from zero to hero: secrets, permissions and deployments"
summary: "Secrets and variables, the GITHUB_TOKEN and its permissions, environments with required reviewers, deploying to a cloud with OIDC instead of stored keys, and a pipeline that pushes a Docker image."
date: 2026-10-13
tags: [github, ci-cd]
series: { key: devops, order: 17 }
---

[The jobs part](en/posts/github-actions-zero-to-hero-jobs/) built and tested the code. Publishing and deploying it needs credentials, and this part keeps them out of the workflow file.

## Secrets and variables

Never write a password, token or key in a workflow file. Store it in **Settings → Secrets and variables → Actions**, or from the terminal:

```bash
gh secret set NPM_TOKEN              # prompts for the value
gh variable set APP_URL --body "https://staging.example.com"
```

Use them through contexts:

```yaml
steps:
  - run: npm publish
    env:
      NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  - run: curl --fail "${{ vars.APP_URL }}/health"
```

**Secrets** are encrypted and masked in logs. **Variables** are for non-sensitive settings such as URLs and feature flags, shown in plain text. Both can be defined for a repository, an environment, or a whole organization.

Two rules. Secrets aren't passed to the runner when a workflow is triggered from a fork, so a stranger's PR can't read them. And if you compute something sensitive in a step, hide it with `echo "::add-mask::$VALUE"` before it reaches the log.

## Permissions and the GITHUB_TOKEN

At the start of every job, GitHub creates a `GITHUB_TOKEN`, valid only for that repository until the job ends. Actions such as `actions/checkout` use it automatically; pass it explicitly as `${{ secrets.GITHUB_TOKEN }}`, for example to `gh`:

```yaml
permissions:
  contents: read

jobs:
  label:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - run: gh pr edit "$PR" --add-label "needs-review" --repo "$GITHUB_REPOSITORY"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR: ${{ github.event.pull_request.number }}
```

The `permissions` key sets what the token may do. The [security guide](https://docs.github.com/en/actions/reference/security/secure-use) says to grant the minimum: read-only at the top of the workflow, write only on the jobs that need it. Common ones: `contents` (code and releases), `pull-requests`, `issues`, `packages` (container images), `pages`, `id-token` (OIDC, below). For fork PRs the token is read-only whatever you ask.

## Environments and deployments

An **environment** (Settings → Environments) represents a deployment target such as `staging` or `production`. It can hold its own secrets and variables, and protection rules such as **required reviewers**: the job waits until someone approves it.

```yaml
jobs:
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - run: ./deploy.sh
        env:
          API_KEY: ${{ secrets.PRODUCTION_API_KEY }}
```

When the run reaches this job, it pauses with a **Review deployments** button. `PRODUCTION_API_KEY` exists only in the `production` environment, so no other job can read it, and the `url` shows on the run and in the deployments list. Protection rules on private repositories depend on your plan ([environments docs](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)).

## Deploying without stored keys: OIDC

The old way to deploy to a cloud is an access key saved as a secret. It lives forever, works from anywhere, and is one leak from disaster. **OIDC** (OpenID Connect) replaces it with credentials created per run that expire on their own.

![The workflow job, with permissions id-token: write, requests a token from GitHub's OIDC provider and gets back a signed token naming the repository, branch and workflow. It exchanges the token with the cloud, whose trust rule allows only this repository and branch, and receives temporary credentials that expire in about an hour. No long-lived key is stored anywhere.](/images/github-actions-zero-to-hero/oidc.svg)

You set up a trust rule in the cloud once ("tokens from repository `me/app`, branch `main`, may assume this role"). The workflow then asks for a token:

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-deploy
          aws-region: eu-central-1
      - run: aws s3 sync dist/ s3://my-bucket/
```

AWS, Azure, Google Cloud and many other services support this; prefer it over stored keys ([OIDC docs](https://docs.github.com/en/actions/concepts/security/openid-connect)).

## A real pipeline: build and push a Docker image

On every push to `main`, build the image from [the Docker series](en/posts/docker-zero-to-hero-dockerfile/) and push it to the GitHub Container Registry (`ghcr.io`), ready for [Kubernetes](en/posts/kubernetes-zero-to-hero/) or any other host:

```yaml
name: Docker image

on:
  push:
    branches: [main]
    tags: ['v*']

permissions:
  contents: read
  packages: write

jobs:
  image:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7

      - uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - id: meta
        uses: docker/metadata-action@v6
        with:
          images: ghcr.io/${{ github.repository }}

      - uses: docker/setup-buildx-action@v4

      - uses: docker/build-push-action@v7
        with:
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- `packages: write` lets the `GITHUB_TOKEN` push to `ghcr.io`. No extra secret needed.
- `docker/metadata-action` turns the Git event into image tags: the branch name for a push to `main`, the version for a tag like `v1.2.0`.
- `cache-from` and `cache-to` with `type=gha` store Docker's layer cache in the Actions cache, so unchanged layers aren't rebuilt.
