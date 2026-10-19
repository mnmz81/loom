---
title: "GitHub Actions from zero to hero: your first workflow and events"
summary: "What GitHub Actions is, the parts of a workflow, a first CI workflow for a Node project, reading runs with gh, and the events that start a workflow: push, pull_request, manual and scheduled."
date: 2026-10-13
updated: 2026-10-19
tags: [github, ci-cd]
series: { key: devops, order: 15 }
---

Every project has chores that should happen on every change: run the tests, check the formatting, build, publish, deploy. Doing them by hand works until someone forgets. **GitHub Actions** is GitHub's built-in automation: you describe the chores in a YAML file in the repository, and GitHub runs them on its own machines whenever something happens. [GitHub from zero to hero](en/posts/github-zero-to-hero-actions/) introduced Actions in one post; this series of four posts goes all the way.

Every key, command and action version was checked against the [GitHub Actions documentation](https://docs.github.com/en/actions) and the actions' release pages in October 2026. Versions move: check each action's page for the current major.

## What GitHub Actions is

GitHub Actions is a **CI/CD** platform. **Continuous integration** (CI) means every change is built and tested automatically, so problems show up within minutes, on the pull request, before anything is merged. **Continuous delivery/deployment** (CD) means the tested result is released or deployed automatically too.

Actions isn't limited to CI/CD. A workflow can label new issues, close stale ones, publish a release when you push a tag, or run a report every Monday. Anything scriptable and triggered by a repository event fits.

### The parts of a workflow

![An event such as push, pull_request, schedule or workflow_dispatch starts a workflow file in .github/workflows. The workflow contains two jobs, test and build, each running on its own ubuntu-latest runner. Each job is a list of steps: uses lines run actions such as actions/checkout, and run lines run shell commands such as npm ci.](/images/github-actions-zero-to-hero/workflow-anatomy.svg)

- A **workflow** is a YAML file in `.github/workflows/`. A repository can have as many as it needs.
- An **event** starts it: a push, a pull request, a schedule, a button, and dozens more.
- A workflow has one or more **jobs**. Jobs run in parallel unless one declares `needs`.
- Each job runs on a **runner**: a fresh virtual machine that GitHub creates for the job and throws away afterwards.
- A job is a list of **steps**. A step either runs a shell command (`run:`) or uses an **action** (`uses:`), a reusable piece someone packaged, such as `actions/checkout`.

## Your first workflow

Take a Node project with a `package.json`, a `package-lock.json` and an `npm test` script. Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
```

- `name` is what you see in the **Actions** tab.
- `on` lists the events: every pull request, and pushes to `main`.
- `permissions` limits what the automatic token can do. Read-only is the right start ([permissions](en/posts/github-actions-zero-to-hero-secrets-deploy/) has the rest).
- `jobs.test` is one job, with the ID `test`.
- `runs-on: ubuntu-latest` picks a GitHub-hosted Linux runner. `windows-latest` and `macos-latest` exist too.
- `actions/checkout` clones your repository into the runner. Without it, the runner is an empty machine.
- `actions/setup-node` installs Node 24, and `cache: npm` caches the npm download folder between runs.
- The two `run` steps are plain shell commands.

Commit and push. The **Actions** tab shows the run with a live log for each step. On a pull request the result appears as a check: a yellow dot while it runs, then a green check or red cross.

### Reading a run from the terminal

The [`gh` CLI](https://cli.github.com/) does the same from the terminal:

```bash
gh run list --limit 5          # recent runs and their status
gh run watch                   # follow a run live
gh run view <run-id> --log-failed   # only the logs of the failed steps
gh run rerun <run-id> --failed      # run the failed jobs again
```

## Events: when a workflow runs

The `on` key decides when a workflow starts. The [events reference](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) lists them all. The ones you'll use most:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'package*.json'
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]
        default: staging
  schedule:
    - cron: '30 5 * * 1-5'
      timezone: 'Asia/Jerusalem'
```

- **`push`** with `branches` runs only for those branches. `paths` narrows it further: here, only when files under `src/` or the package files change. `branches-ignore` and `paths-ignore` do the opposite. Pushing a tag can trigger it too, with `tags: ['v*']`.
- **`pull_request`** runs when a PR is opened, updated with new commits, or reopened. `branches` filters by the PR's *target* branch.
- **`workflow_dispatch`** adds a **Run workflow** button to the Actions tab, with optional inputs (up to 25). From the terminal: `gh workflow run ci.yml -f environment=production`.
- **`schedule`** uses cron syntax. Minutes, hours, day of month, month, day of week: `30 5 * * 1-5` is 05:30 Monday to Friday. Schedules run in UTC unless you add a `timezone`.

Schedules surprise people. Scheduled runs use the latest commit on the default branch, the shortest interval is 5 minutes, runs can be delayed under high load, so don't rely on exact minutes, and in public repositories scheduled workflows are disabled after 60 days without repository activity.

Other useful events: `release` (published), `workflow_call` (another workflow calls this one, see [reusable workflows](en/posts/github-actions-zero-to-hero-reuse-security/)), `workflow_run` (after another workflow finishes), and `issues` or `issue_comment` for repository automation.
