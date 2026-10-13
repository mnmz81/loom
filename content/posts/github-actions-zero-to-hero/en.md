---
title: "GitHub Actions from zero to hero"
summary: "A hands-on guide to GitHub Actions with diagrams: workflows, events, jobs, expressions, outputs, matrix builds, caching, artifacts, secrets, environments, OIDC, Docker images and security."
date: 2026-10-13
tags: [github, ci-cd, tutorial]
---

Every project has chores that should happen on every change: run the tests, check the formatting, build, publish a package, deploy. Doing them by hand works until the day someone forgets. **GitHub Actions** is GitHub's built-in automation: you describe the chores in a YAML file in the repository, and GitHub runs them on its own machines whenever something happens.

[GitHub from zero to hero](en/posts/github-zero-to-hero/) introduced Actions in one section. This guide goes all the way: events, jobs, expressions, matrix builds, caching, secrets, deployments without stored keys, building a Docker image, and the security habits that keep a workflow from becoming a back door.

Every key, command and action version was checked against the [GitHub Actions documentation](https://docs.github.com/en/actions) and the actions' own release pages in October 2026. Action versions move: check each action's page for the current major version.

## What GitHub Actions is

GitHub Actions is a **CI/CD** platform. **Continuous integration** (CI) means every change is built and tested automatically, so problems show up within minutes, on the pull request, before anything is merged. **Continuous delivery/deployment** (CD) means the tested result is released or deployed automatically too.

Actions isn't limited to CI/CD. A workflow can label new issues, close stale ones, publish a release when you push a tag, or run a report every Monday morning. Anything that can be scripted and triggered by an event in a repository fits.

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

Line by line:

- `name` is what you see in the **Actions** tab.
- `on` lists the events: every pull request, and pushes to `main`.
- `permissions` limits what the automatic token can do. Read-only is the right start (more below).
- `jobs.test` is one job, with the ID `test`.
- `runs-on: ubuntu-latest` picks a GitHub-hosted Linux runner. `windows-latest` and `macos-latest` exist too.
- `actions/checkout` clones your repository into the runner. Without it, the runner is an empty machine.
- `actions/setup-node` installs Node 24, and `cache: npm` caches the npm download folder between runs.
- The two `run` steps are plain shell commands.

Commit and push. Open the **Actions** tab, and the run is there with a live log for each step. On a pull request, the result shows up as a check next to the commit: a yellow dot while it runs, then a green check or a red cross.

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

Some facts about schedules from the docs, because they surprise people. Scheduled runs use "the latest commit on the default branch". The shortest interval is every 5 minutes. Runs "can be delayed during periods of high loads", so don't rely on exact minutes. And in public repositories, scheduled workflows are disabled automatically after 60 days without activity in the repository.

Other useful events: `release` (a release was published), `workflow_call` (another workflow calls this one, covered below), `workflow_run` (after another workflow finishes), and `issues` or `issue_comment` for repository automation.

## Jobs, steps and runners

A job with a few more options:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    defaults:
      run:
        working-directory: app
    env:
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v7
      - name: Install
        run: npm ci
      - name: Lint and test
        run: |
          npm run lint
          npm test
```

- `timeout-minutes` stops a stuck job. Set it on everything: the default is 360 minutes, which a hung test happily uses up.
- `defaults.run.working-directory` runs every `run` step in a subfolder, handy in a monorepo.
- `env` at the job level is visible to every step. It can also be set per workflow or per step.
- `name` on a step is what the log shows. Without it, the log shows the command.
- `run: |` is YAML for a multi-line string. Each line runs in the same shell, and on Linux the default shell is Bash with "stop at the first failing command" turned on.

Every job starts on a clean machine. Files from one job don't exist in the next, unless you pass them along as an artifact (below). GitHub-hosted runners come with many tools preinstalled (Git, Docker, Node, Python and more). The [runner images repository](https://github.com/actions/runner-images) lists them.

### Jobs that depend on each other

Jobs run in parallel by default. `needs` makes a job wait:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: npm ci && npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: npm ci && npm test

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: npm ci && npm run build
```

`build` starts only after both `lint` and `test` succeed. If either fails, `build` is skipped. This is how a pipeline is built: checks in parallel, then build, then deploy.

![lint and three test jobs from a matrix run in parallel. build needs all of them. deploy-staging needs build. deploy-prod needs deploy-staging and uses the production environment, which waits for approval.](/images/github-actions-zero-to-hero/job-graph.svg)

## Expressions and contexts

Anything inside `${{ }}` is an **expression**, evaluated by GitHub before the step runs. Expressions read **contexts**, objects full of information about the run:

| Context | What it holds | Example |
|---|---|---|
| `github` | The event and the repository | `github.ref_name`, `github.sha`, `github.actor` |
| `env` | Environment variables you set | `env.NODE_ENV` |
| `vars` | Configuration variables from the settings | `vars.APP_URL` |
| `secrets` | Secrets from the settings | `secrets.NPM_TOKEN` |
| `matrix` | The current matrix values | `matrix.node` |
| `steps` | Outputs of earlier steps in the job | `steps.version.outputs.tag` |
| `needs` | Outputs and results of jobs this job needs | `needs.build.outputs.image` |
| `runner` | The machine | `runner.os` |
| `inputs` | `workflow_dispatch` or `workflow_call` inputs | `inputs.environment` |

The most common use is `if`, which decides whether a job or step runs:

```yaml
steps:
  - name: Deploy
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    run: ./deploy.sh

  - name: Upload test report
    if: failure()
    uses: actions/upload-artifact@v7
    with:
      name: test-report
      path: reports/
```

By default a step runs only if every step before it succeeded. The status functions change that: `failure()` runs only after a failure, `always()` runs no matter what, and `cancelled()` runs if the run was cancelled. There are also helpers such as `contains()`, `startsWith()`, `format()`, `toJSON()` and `hashFiles()`. See the [expressions reference](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions).

## Passing data between steps and jobs

A step can't set a normal shell variable for the next step, because each step runs in its own process. Instead, steps write to special files. The [workflow commands reference](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands) defines them:

```yaml
jobs:
  version:
    runs-on: ubuntu-latest
    outputs:
      tag: ${{ steps.v.outputs.tag }}
    steps:
      - id: v
        run: echo "tag=build-$(date +%Y%m%d)-${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"
      - run: echo "LOG_LEVEL=debug" >> "$GITHUB_ENV"
      - run: echo "Log level is $LOG_LEVEL"
      - run: echo "### Built ${{ steps.v.outputs.tag }}" >> "$GITHUB_STEP_SUMMARY"

  use:
    needs: version
    runs-on: ubuntu-latest
    steps:
      - run: echo "The tag is ${{ needs.version.outputs.tag }}"
```

- `$GITHUB_OUTPUT`: a step with an `id` writes `name=value`, and later steps read `steps.<id>.outputs.<name>`.
- `$GITHUB_ENV`: sets an environment variable for the *following* steps of the job.
- Job `outputs`: expose a step output to other jobs, which read it through `needs`.
- `$GITHUB_STEP_SUMMARY`: Markdown that appears on the run's summary page. Great for test results or a link to a preview.

GitHub also sets many variables in every job, such as `GITHUB_SHA`, `GITHUB_REF_NAME` and `GITHUB_REPOSITORY`. The snippet above uses `GITHUB_SHA`.

## Matrix builds

A **matrix** runs the same job with different values. To test a library on two operating systems and three Node versions:

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [22, 24, 26]
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm test
```

![A job with a matrix of two operating systems and three Node versions expands into six jobs, one per combination, running in parallel.](/images/github-actions-zero-to-hero/matrix.svg)

Two times three is six jobs, all running in parallel. By default, when one combination fails, GitHub cancels the others (`fail-fast: true`). Setting it to `false` lets every combination finish, so you see the full picture. `include` adds extra combinations, `exclude` removes some, and `max-parallel` limits how many run at once.

## Caching and artifacts

Both store files, and they solve different problems:

![Left: run 41 saves a cache keyed by a hash of package-lock.json, and run 42 restores it, so npm ci is fast. Right: a build job uploads dist/ as an artifact stored with the run, a deploy job in the same run downloads it, and people can download it from the run page.](/images/github-actions-zero-to-hero/cache-vs-artifacts.svg)

A **cache** makes the *next* run faster. The easiest way is the `cache` option of the setup actions, as above (`cache: npm`). For anything else, use [`actions/cache`](https://github.com/actions/cache) directly:

```yaml
- uses: actions/cache@v6
  with:
    path: ~/.cache/pip
    key: pip-${{ runner.os }}-${{ hashFiles('requirements.txt') }}
    restore-keys: |
      pip-${{ runner.os }}-
```

The `key` changes whenever `requirements.txt` changes, so a new dependency list gets a new cache. `restore-keys` falls back to the newest cache that starts with the prefix. A cache can be evicted at any time, so the workflow must still work without it.

An **artifact** is a *result* of the run: a build, a test report, a log. A job uploads it, and a later job in the same run, or a person on the run page, downloads it:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v7
        with:
          name: site
          path: dist/
          retention-days: 7

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: site
          path: dist/
      - run: ls dist/
```

The rule of thumb: a cache is an optimization, an artifact is an output.

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

**Secrets** are encrypted and GitHub masks their values in logs. **Variables** are for non-sensitive settings such as URLs and feature flags, and are shown in plain text. Both can be defined for a repository, an environment, or a whole organization.

Two rules from the docs. Secrets "are not passed to the runner when a workflow is triggered from a forked repository", so a stranger's PR can't read them. And if a value isn't a secret but you compute something sensitive in a step, hide it with `echo "::add-mask::$VALUE"` before it can reach the log.

## Permissions and the GITHUB_TOKEN

At the start of every job, GitHub creates a token called `GITHUB_TOKEN`, valid only for that repository and only until the job ends. Actions such as `actions/checkout` use it automatically. You can pass it explicitly as `${{ secrets.GITHUB_TOKEN }}`, for example to `gh` commands:

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

The `permissions` key sets what the token may do. The [security guide](https://docs.github.com/en/actions/reference/security/secure-use) says to grant "the minimum required permissions": set read-only at the top of the workflow, and add write permissions only on the jobs that need them. Common ones: `contents` (code and releases), `pull-requests`, `issues`, `packages` (container images), `pages`, `id-token` (OIDC, below). For pull requests from forks, the token is read-only no matter what you ask for.

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

When the run reaches this job, it pauses with a **Review deployments** button. The secret `PRODUCTION_API_KEY` exists only in the `production` environment, so no other job can read it. The `url` shows up on the run and in the repository's deployments list. Protection rules on private repositories depend on your plan. Check [the environments docs](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) for yours.

## Deploying without stored keys: OIDC

The old way to deploy to a cloud is to create an access key and save it as a secret. That key lives forever, works from anywhere, and is one leak away from disaster. **OIDC** (OpenID Connect) replaces it with credentials that are created per run and expire on their own.

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

AWS, Azure and Google Cloud all support this, and so do many other services. If your cloud supports OIDC, prefer it over stored keys. See [the OIDC docs](https://docs.github.com/en/actions/concepts/security/openid-connect).

## A real pipeline: build and push a Docker image

Putting it together: on every push to `main`, build the image from [Docker from zero to hero](en/posts/docker-zero-to-hero/) and push it to the GitHub Container Registry (`ghcr.io`), ready for [Kubernetes](en/posts/kubernetes-zero-to-hero/) or any other host:

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

A **composite action** is smaller: a few steps packaged as one step. Create `action.yml` in a folder, for example `.github/actions/setup/`:

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

Rule of thumb: reuse whole jobs with a reusable workflow, and reuse a few steps inside a job with a composite action.

## Concurrency and timeouts

Push three commits in a row, and three runs start. Usually only the last one matters:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

Runs in the same `group` don't overlap: a new run cancels the one in progress for the same branch. For deployments, use `cancel-in-progress: false`, so a deploy is never killed halfway; the next one waits instead. Add `timeout-minutes` to every job, as shown earlier.

## Security habits

A workflow runs code with access to your repository and secrets, so it deserves the same care as production code. The [security guide](https://docs.github.com/en/actions/reference/security/secure-use) covers it in detail. The essentials:

- **Least privilege.** `permissions: contents: read` at the top, more only where needed.
- **Pin third-party actions to a commit SHA.** A tag like `@v4` can be moved to point at new code. The docs advise to "pin references to actions to a commit SHA", for example `uses: some-org/some-action@<40-character-sha> # v4.2.0`. Dependabot can keep the pins up to date.
- **Never put untrusted input directly in a `run` script.** A PR title or branch name is written by whoever opened the PR. This is a script injection hole:

```yaml
# Dangerous: the title becomes part of the shell script
- run: echo "PR title is ${{ github.event.pull_request.title }}"

# Safe: pass it through an environment variable
- run: echo "PR title is $TITLE"
  env:
    TITLE: ${{ github.event.pull_request.title }}
```

- **Be very careful with `pull_request_target`.** It runs with the base repository's secrets and a write token, even for PRs from forks. The docs warn that "running untrusted code on the `pull_request_target` trigger may lead to security vulnerabilities". Never check out and run the PR's code in it.
- **No self-hosted runners on public repositories.** The docs say they "should almost never be used for public repositories", because anyone can open a PR that runs code on your machine.
- **Prefer OIDC to long-lived cloud keys**, and environments with reviewers for production.
- **Keep actions updated.** Add Dependabot for the `github-actions` ecosystem so version bumps arrive as PRs:

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
4. Print what you're unsure about. A step with `env: { EVENT: "${{ toJSON(github.event) }}" }` and `run: echo "$EVENT"` dumps the whole event payload, passed through an environment variable for the same reason as above.
5. Reproduce it locally. The runner is just Linux: run the same commands in a container. The community tool [act](https://github.com/nektos/act) runs workflows locally in Docker, with some differences from the real runners.

The usual suspects: a missing `actions/checkout`, a path relative to the wrong folder, a secret that isn't available (fork PRs, or a secret defined in an environment the job doesn't use), a `permissions` block that's too tight (`Resource not accessible by integration`), a cache key that never changes, and YAML indentation.

## Cost and limits

GitHub-hosted runners are free for public repositories on standard runners. Private repositories get a monthly allowance of minutes and storage that depends on the plan, with macOS and Windows minutes counting more than Linux ones. Prices and allowances change, so check [the Actions billing page](https://docs.github.com/en/billing/concepts/product-billing/github-actions) instead of trusting a number from a blog post. Concurrency groups, `paths` filters, caching and timeouts are also how you keep the bill down.

## The cheat sheet

| I want to... | How |
|---|---|
| Run on PRs and pushes to main | `on: { pull_request: {}, push: { branches: [main] } }` |
| Run only when some files change | `paths: ['src/**']` under `push` or `pull_request` |
| Add a manual button | `on: workflow_dispatch` (then `gh workflow run <file>`) |
| Run on a schedule | `schedule: [{ cron: '0 6 * * 1' }]` |
| Make a job wait for another | `needs: [lint, test]` |
| Run a step only on main | `if: github.ref == 'refs/heads/main'` |
| Run a step even after a failure | `if: always()` or `if: failure()` |
| Pass a value to later steps | `echo "name=value" >> "$GITHUB_OUTPUT"` |
| Test several versions | `strategy.matrix` |
| Cache npm downloads | `actions/setup-node` with `cache: npm` |
| Hand files to another job | `actions/upload-artifact` + `actions/download-artifact` |
| Store a secret | `gh secret set NAME` |
| Limit the token | `permissions: contents: read` |
| Require approval for a deploy | `environment: production` + required reviewers |
| Cancel outdated runs | `concurrency` + `cancel-in-progress: true` |
| See failed logs | `gh run view <id> --log-failed` |

## Glossary

- **Workflow:** a YAML file in `.github/workflows/` that defines automation.
- **Event / trigger:** what starts a workflow (`push`, `pull_request`, `schedule`...).
- **Job:** a group of steps that runs on one runner.
- **Step:** one command (`run`) or one action (`uses`) in a job.
- **Action:** a reusable step, from a repository or the Marketplace.
- **Runner:** the machine that runs a job; GitHub-hosted or self-hosted.
- **Expression / context:** `${{ }}` syntax, and the objects it reads (`github`, `secrets`, `matrix`...).
- **Matrix:** running one job with many combinations of values.
- **Cache:** files saved between runs to speed them up.
- **Artifact:** files produced by a run, shared between jobs or downloaded.
- **Secret / variable:** an encrypted value / a plain configuration value.
- **GITHUB_TOKEN:** the automatic, short-lived token of each job.
- **Environment:** a deployment target with its own secrets and protection rules.
- **OIDC:** short-lived cloud credentials instead of stored keys.
- **Reusable workflow:** a workflow called as a job by other workflows.
- **Composite action:** several steps packaged as one action.
- **Concurrency group:** runs that must not overlap.
- **CI/CD:** building and testing every change, and releasing it automatically.

## Where to go next

You've got the whole toolkit: events that start workflows, jobs that run in parallel or in order, expressions and outputs that connect them, matrices, caches and artifacts, secrets kept in the right place, deployments that need approval and no stored keys, and the habits that keep it all safe. To make it stick, add a workflow to a project of yours: tests on every PR, a build artifact, and a deploy job behind an environment.

GitHub's [Actions documentation](https://docs.github.com/en/actions) and the [workflow syntax reference](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) are the best next reading. For the repository side (pull requests, branch protection that requires your checks), see [GitHub from zero to hero](en/posts/github-zero-to-hero/). To containerize what you build, see [Docker from zero to hero](en/posts/docker-zero-to-hero/), and to run it at scale, [Kubernetes from zero to hero](en/posts/kubernetes-zero-to-hero/).
