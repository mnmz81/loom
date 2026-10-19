---
title: "GitHub Actions from zero to hero: jobs, expressions, matrix and caching"
summary: "Growing a workflow: job options, jobs that wait for each other, expressions and contexts, passing values between steps and jobs, matrix builds, caches and artifacts."
date: 2026-10-13
tags: [github, ci-cd]
series: { key: devops, order: 16 }
---

[The first part](en/posts/github-actions-zero-to-hero/) ran a single `test` job on every push and pull request. A real pipeline has several jobs, conditions and files that move between them.

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

- `timeout-minutes` stops a stuck job. Set it everywhere: the default is 360 minutes, which a hung test happily uses up.
- `defaults.run.working-directory` runs every `run` step in a subfolder, handy in a monorepo.
- `env` at the job level is visible to every step (it can also be set per workflow or step).
- `name` on a step is what the log shows instead of the command.
- `run: |` is a multi-line string. Each line runs in the same shell; on Linux that is Bash, stopping at the first failing command.

Every job starts on a clean machine, so files from one job don't exist in the next unless passed along as an artifact (below). GitHub-hosted runners come with many tools preinstalled (Git, Docker, Node, Python...); the [runner images repository](https://github.com/actions/runner-images) lists them.

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

`build` starts only after both `lint` and `test` succeed; if either fails, it is skipped. That's a pipeline: checks in parallel, then build, then deploy.

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

By default a step runs only if every earlier step succeeded. Status functions change that: `failure()` runs only after a failure, `always()` runs no matter what, `cancelled()` runs if the run was cancelled. Helpers include `contains()`, `startsWith()`, `format()`, `toJSON()` and `hashFiles()` ([expressions reference](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions)).

## Passing data between steps and jobs

A step can't set a shell variable for the next step, because each runs in its own process. Instead, steps write to special files ([workflow commands](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands)):

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
- `$GITHUB_STEP_SUMMARY`: Markdown shown on the run's summary page, great for test results.

GitHub also sets variables like `GITHUB_SHA`, `GITHUB_REF_NAME` and `GITHUB_REPOSITORY` in every job.

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

By default, when one combination fails GitHub cancels the others (`fail-fast: true`); `false` lets all finish, so you see the full picture. `include` adds combinations, `exclude` removes some, and `max-parallel` limits how many run at once.

## Caching and artifacts

Both store files, and they solve different problems:

![Left: run 41 saves a cache keyed by a hash of package-lock.json, and run 42 restores it, so npm ci is fast. Right: a build job uploads dist/ as an artifact stored with the run, a deploy job in the same run downloads it, and people can download it from the run page.](/images/github-actions-zero-to-hero/cache-vs-artifacts.svg)

A **cache** is an optimization: it makes the *next* run faster. The easiest way is the `cache` option of the setup actions (`cache: npm` in the first workflow). For anything else, use [`actions/cache`](https://github.com/actions/cache) directly:

```yaml
- uses: actions/cache@v6
  with:
    path: ~/.cache/pip
    key: pip-${{ runner.os }}-${{ hashFiles('requirements.txt') }}
    restore-keys: |
      pip-${{ runner.os }}-
```

The `key` changes whenever `requirements.txt` does, so a new dependency list gets a new cache; `restore-keys` falls back to the newest cache with the prefix. A cache can be evicted any time, so the workflow must work without it.

An **artifact** is an output of the run: a build, a test report, a log. A job uploads it, and a later job in the run, or a person on the run page, downloads it:

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
