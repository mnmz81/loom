---
title: "GitHub CLI: pull requests, issues and CI from the terminal"
summary: "Install gh, sign in, then clone, create a pull request, check CI, manage issues and call the API without opening the browser. Plus aliases and extensions."
date: 2026-10-19
tags: [github, dev-tools, cli]
series: { key: mac-dev-setup, order: 3 }
---

`gh` is GitHub's official command-line tool. It does what you click in the browser, from the terminal: repositories, pull requests, issues, Actions runs. Checked with gh 2.93 against the [gh manual](https://cli.github.com/manual/).

## Install and sign in

```bash
brew install gh
gh auth login
gh auth status
```

`gh auth login` asks for the host, the Git protocol (HTTPS or SSH) and how to authenticate, and stores the token in the system keychain. `gh auth status` shows the account and the protocol. For a longer walk through authentication see [GitHub from zero to hero](en/posts/github-zero-to-hero/).

## Repositories

```bash
gh repo clone OWNER/REPO
gh repo create my-app --private --clone
gh browse
```

`gh repo create` with no arguments is interactive. With a name and `--public`, `--private` or `--internal` it runs without questions, and `--clone` also clones it. `gh browse` opens the repository page in the browser.

## Pull requests

```bash
gh pr create --fill
gh pr list
gh pr checks
gh pr checkout 42
gh pr merge --squash
```

`gh pr create --fill` takes the title and body from your commits. `gh pr checks` shows the CI status of one pull request, and `gh pr checkout` fetches a pull request into a local branch so you can test it. Review flows live under `gh pr review`, `gh pr comment` and `gh pr diff`.

## Issues and Actions runs

```bash
gh issue create --title "Login fails on Safari"
gh issue list --label bug
gh run list
gh run watch
```

`gh run watch` follows a workflow run until it finishes. This is how you wait for CI without refreshing a page.

## Any API endpoint

`gh api` makes an authenticated request to the GitHub API, so there is no token handling in your scripts:

```bash
gh api repos/cli/cli --jq .stargazers_count
```

`--jq` filters the JSON response. Anything the web UI can do and `gh` has no command for, `gh api` can.

## Aliases and extensions

```bash
gh alias set prs 'pr list --author @me'
gh prs
gh extension install OWNER/gh-NAME
```

An alias expands to a full `gh` command. An extension is a repository named `gh-<name>` that adds a new `gh <name>` command. Read an extension's code before installing it: it runs with your credentials.

Next: [uv](en/posts/uv-tools/).
