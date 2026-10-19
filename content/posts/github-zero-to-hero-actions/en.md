---
title: "GitHub from zero to hero: Actions, Pages and releases"
summary: "Part 4 of the GitHub guide: a first Actions workflow, secrets and permissions, publishing a site with GitHub Pages, releases with generated notes, Codespaces and Copilot."
date: 2026-10-09
tags: [github, git]
series: { key: devops, order: 10 }
---

The pull requests from [part 2](en/posts/github-zero-to-hero-pull-requests/) need someone to check them, and the recipe book still isn't a website. GitHub can do both.

## Actions: let GitHub run your checks

**GitHub Actions** runs automation in response to things that happen in your repository:

![A push or pull_request event triggers a workflow, a YAML file in .github/workflows. The workflow contains jobs. A test job has steps for checkout, npm ci and npm test. A deploy job that needs test has steps for checkout, build and deploy-pages. Each job runs on a runner.](/images/github-zero-to-hero/actions-anatomy.svg)

- A **workflow** is a YAML file in `.github/workflows/`. A repository can have many.
- An **event** starts it: a push, a pull request, a schedule, or a manual button.
- A workflow holds **jobs**. They run in parallel unless one declares `needs: other-job`.
- Each job runs on a **runner**, a fresh machine (GitHub hosts Linux, macOS and Windows ones).
- A job is a list of **steps**: either a shell command (`run:`) or a reusable **action** (`uses:`) from the [Marketplace](https://github.com/marketplace?type=actions).

A first workflow for our project, saved as `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
```

On every pull request and push to `main` it starts a fresh Ubuntu machine, checks out the code, installs Node 24 and the dependencies, and runs the tests. Open a PR, and a yellow dot turns into a green check or red cross. The **Actions** tab shows each run's logs.

```bash
gh run list --limit 5     # recent runs
gh run watch              # follow a run live
```

- **Let the robot be strict** (tests, lint, type checks) so humans can talk about design.
- **Secrets:** store passwords and tokens in **Settings → Secrets and variables → Actions** and use them as `${{ secrets.MY_TOKEN }}`. Never write them in the YAML.
- **Permissions:** the `permissions:` key limits what the automatic token may do. Start with `contents: read` and add only what a job needs.
- **Fork PRs** don't get your secrets.
- **Pin versions** of actions (`@v5`), so a workflow doesn't change under you.
- Free usage has limits that depend on your plan and on whether the repository is public; check the pricing page before heavy builds.

For matrix builds, caching, environments, OIDC deployments and workflow security, see [GitHub Actions from zero to hero](en/posts/github-actions-zero-to-hero/).

## Pages: publish a website from a repository

**GitHub Pages** serves static files (HTML, CSS, JS) for free at `https://<user>.github.io/<repo>/`. This blog is published that way. There are two publishing sources, chosen in **Settings → Pages**:

- **From a branch:** Pages serves a folder (the root or `/docs`) of a branch you pick. Simplest for hand-written HTML or Jekyll sites.
- **From GitHub Actions:** a workflow builds the site however you like and uploads the result. Best when there's a build step (this blog is an Angular app that is built, tested and pre-rendered first).

The Actions route builds, uploads the output as a Pages artifact, and deploys it. The core of this blog's deploy workflow:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write

steps:
  - uses: actions/checkout@v5
  # ... install and build ...
  - uses: actions/configure-pages@v5
  - uses: actions/upload-pages-artifact@v4
    with:
      path: dist
  - uses: actions/deploy-pages@v4
```

Every merge to `main` republishes the site, so publishing becomes "merge a PR". Two gotchas: a site served from `/<repo>/` needs the right base path in its links, and pushes made by a workflow with the default `GITHUB_TOKEN` don't trigger another Pages build.

## Releases and tags

A **tag** names one commit, and a **release** is a tag with notes and downloadable files, shown on the repository's front page.

```bash
git tag -a v1.0 -m "First release"
git push --tags
gh release create v1.0 --generate-notes
```

`--generate-notes` builds the changelog from merged PRs since the last release, one more reason for good PR titles. Versions like `v1.4.2` usually follow [semantic versioning](https://semver.org): bump the first number for breaking changes, the second for features, the third for fixes. As with commits and PRs, small and frequent beats big and rare.

## Codespaces and Copilot

- **Codespaces** gives you a cloud development environment, in the browser or VS Code, with the repository and its tools set up. Handy for onboarding or a quick fix from a borrowed laptop. Press `.` on any repository page for the lighter, edit-only web editor.
- **GitHub Copilot** is GitHub's AI assistant. It completes code, answers questions about a repository, and can take an issue and open a PR for you to review. Plans and limits change often, so check GitHub's pricing page. Either way, merge only what you've understood.

To make the loop stick, do it once for real: fork a small open-source project, fix a typo in its docs, and open a PR. My [Git cheat sheet](en/posts/git-commands/) covers the Git side. To package an app so it runs the same everywhere (including on Actions runners), see [Docker from zero to hero](en/posts/docker-zero-to-hero/). GitHub's [Docs](https://docs.github.com) and the free courses at [skills.github.com](https://skills.github.com) are good next steps.
