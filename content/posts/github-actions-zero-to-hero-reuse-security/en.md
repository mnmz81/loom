---
title: "GitHub Actions from zero to hero: reuse, security and debugging"
summary: "Reusable workflows and composite actions, concurrency groups, the security habits that keep a workflow from becoming a back door, debugging a failed run, and what Actions costs."
date: 2026-10-13
tags: [github, ci-cd]
series: { key: devops, order: 18 }
---

With [the deployment pipeline](en/posts/github-actions-zero-to-hero-secrets-deploy/) running, what's left is keeping many workflows short, safe and fixable.

## Reusing work: reusable workflows and composite actions

When several repositories, or several workflows in one repository, repeat the same jobs, extract them.

A **reusable workflow** is a whole workflow with `on: workflow_call`. Callers use it as a job:

```yaml
# .github/workflows/node-ci.yml (the reusable one)
on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: '24'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: ${{ inputs.node-version }}
          cache: npm
      - run: npm ci && npm test
```

```yaml
# .github/workflows/ci.yml (the caller)
on: [pull_request]

jobs:
  ci:
    uses: ./.github/workflows/node-ci.yml
    with:
      node-version: '24'
```

From another repository, use `owner/repo/.github/workflows/node-ci.yml@v1`. Secrets aren't passed automatically: list them under `secrets:`, or use `secrets: inherit`.

A **composite action** is smaller: a few steps packaged as one step, for use inside a job. Create `action.yml` in a folder, for example `.github/actions/setup/`:

```yaml
name: Setup
description: Install Node and dependencies
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v7
      with:
        node-version: 24
        cache: npm
    - run: npm ci
      shell: bash
```

Then any job uses it with `uses: ./.github/actions/setup` (after `actions/checkout`). Note that `run` steps in a composite action must name their `shell`.

## Concurrency

Push three commits in a row, and three runs start, but usually only the last matters:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

Runs in the same `group` don't overlap: a new run cancels the one in progress for the same branch. For deployments use `cancel-in-progress: false`, so a deploy is never killed halfway and the next waits instead.

## Security habits

A workflow runs code with access to your repository and secrets, so treat it like production code ([security guide](https://docs.github.com/en/actions/reference/security/secure-use)). On top of [least-privilege permissions, OIDC and environments with reviewers](en/posts/github-actions-zero-to-hero-secrets-deploy/):

- **Pin third-party actions to a commit SHA.** A tag like `@v4` can be moved to new code: `uses: some-org/some-action@<40-character-sha> # v4.2.0`. Dependabot can keep the pins current.
- **Never put untrusted input directly in a `run` script.** A PR title or branch name is written by whoever opened the PR. This is a script injection hole:

```yaml
# Dangerous: the title becomes part of the shell script
- run: echo "PR title is ${{ github.event.pull_request.title }}"

# Safe: pass it through an environment variable
- run: echo "PR title is $TITLE"
  env:
    TITLE: ${{ github.event.pull_request.title }}
```

- **Be very careful with `pull_request_target`.** It runs with the base repository's secrets and a write token, even for fork PRs. Never check out and run the PR's code in it.
- **No self-hosted runners on public repositories:** anyone can open a PR that runs code on your machine.
- **Keep actions updated.** Add Dependabot for the `github-actions` ecosystem so bumps arrive as PRs:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

## Debugging toolbox

When a run fails:

1. Open the failed step's log. The error is usually in the last 20 lines. `gh run view <run-id> --log-failed` shows only the failed parts.
2. Check the **annotations** at the top of the run summary. Linters and test tools often report errors there, with file and line.
3. Re-run with more logging: **Re-run jobs → Enable debug logging**, or `gh run rerun <run-id> --debug`. Setting a secret or variable `ACTIONS_STEP_DEBUG` to `true` turns it on for every run.
4. Print what you're unsure about. A step with `env: { EVENT: "${{ toJSON(github.event) }}" }` and `run: echo "$EVENT"` dumps the event payload (through an environment variable, for the same reason as above).
5. Reproduce it locally. The runner is just Linux: run the same commands in a container, or use the community tool [act](https://github.com/nektos/act), which runs workflows in Docker with some differences from the real runners.

The usual suspects: a missing `actions/checkout`, a path relative to the wrong folder, an unavailable secret (fork PRs, or one defined in an environment the job doesn't use), too-tight `permissions` (`Resource not accessible by integration`), a cache key that never changes, and YAML indentation.

## Cost and limits

Standard GitHub-hosted runners are free for public repositories. Private repositories get a monthly allowance of minutes and storage that depends on the plan, with macOS and Windows minutes counting more than Linux. Allowances change, so check [the Actions billing page](https://docs.github.com/en/billing/concepts/product-billing/github-actions). Concurrency groups, `paths` filters, caching and timeouts also keep the bill down.

## Where to go next

To make it stick, add a workflow to a project of yours: tests on every PR, a build artifact, and a deploy job behind an environment.

GitHub's [Actions documentation](https://docs.github.com/en/actions) and [workflow syntax reference](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) are the best next reading. For the repository side (pull requests, branch protection that requires your checks), see [GitHub from zero to hero](en/posts/github-zero-to-hero-collaboration/); to containerize what you build, [Docker from zero to hero](en/posts/docker-zero-to-hero/); to run it at scale, [Kubernetes from zero to hero](en/posts/kubernetes-zero-to-hero/).
