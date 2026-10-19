---
title: "GitHub from zero to hero: issues, forks and a protected main"
summary: "Part 3 of the GitHub guide: issues and labels, contributing to someone else's project through a fork, branch protection, CODEOWNERS and keeping a repository safe."
date: 2026-10-09
tags: [github, git]
series: { key: devops, order: 9 }
---

[Part 2](en/posts/github-zero-to-hero-pull-requests/) changed the recipe book through a pull request. This part adds the pieces that let other people work on it: issues, forks, rules on `main`, and security.

## Issues

An **issue** is a note about something to do or something broken: a bug, a feature idea, a question. A good one says what you expected, what happened, and how to reproduce it.

- **Labels** (`bug`, `good first issue`) to sort and filter.
- **Assignees** for who's on it, and **milestones** for grouping issues toward a goal.
- **Mentions:** write `@dana` to notify a person, and `#42` to link to issue or PR 42.
- **Templates:** Markdown or form files in `.github/ISSUE_TEMPLATE/` are offered when someone opens an issue, and a `pull_request_template.md` in `.github/` pre-fills PR descriptions.

```bash
gh issue create --title "Soup recipe is missing salt" --body "Step 2 never mentions salt."
gh issue list
```

**Projects** turn issues and PRs into a board or table (To do, In progress, Done), and **Discussions** give a repository a place for open-ended questions that aren't tasks.

## Forks: contributing to someone else's project

With open source you usually can't push to the repository. The answer is a **fork**: your own copy of it, on your account.

![Three boxes. upstream is the original project on GitHub. Your fork is your copy on GitHub, made with a Fork button from upstream. Your computer holds the local clone, cloned from the fork with git clone and pushed back to it with git push. A pull request goes from your fork to upstream, and git fetch upstream brings new upstream commits to your computer.](/images/github-zero-to-hero/fork-workflow.svg)

1. Click **Fork** on the project's page (or `gh repo fork --clone`).
2. Clone your fork, and add the original as a second remote named `upstream`.
3. Make a branch, commit, and push it to your fork (`origin`).
4. Open a PR from your fork's branch to the original repository.

```bash
gh repo fork someone/their-project --clone
cd their-project
git remote -v            # origin = your fork, upstream = the original
git switch -c fix-typo
# edit, commit
git push -u origin fix-typo
gh pr create --fill
```

To keep your fork up to date, use the **Sync fork** button on your fork's page, or from the terminal:

```bash
git fetch upstream
git switch main
git merge upstream/main
git push
```

Read the project's `CONTRIBUTING.md` first and look for `good first issue` labels. Maintainers appreciate small, focused PRs.

## Protecting `main`

Once other people are involved, you want `main` to be hard to break, and nobody, you included, to work on it directly. In **Settings → Branches** (or the newer **Rulesets**) you can protect a branch. Among the options:

- **Require a pull request** with a set number of approvals before merging.
- **Require status checks** (an [Actions workflow](en/posts/github-zero-to-hero-actions/)) to pass.
- **Require conversations to be resolved** before merging.
- **Require linear history**, which means squash or rebase merges only.
- **Block force pushes and deletion** of the branch.
- **Restrict who can push** to it.

A `CODEOWNERS` file (in `.github/`, the root or `docs/`) maps paths to people or teams, and GitHub asks them for review automatically when a PR touches their files:

```plain text
*            @dana
/docs/       @sam
*.yml        @dana @devops-team
```

The last matching line wins. With "require review from code owners", the right person always sees risky files.

## Keeping a repository safe

- **Never commit secrets.** A token that reached a commit is leaked even after you delete it: revoke and replace it first, clean the history second. **Secret scanning** can warn you, and block the push for supported secrets.
- **Dependabot** opens PRs that update outdated or vulnerable dependencies. Turn it on in the security settings, or add a `.github/dependabot.yml`.
- **Code scanning** (CodeQL) looks for common vulnerabilities on each PR.
- Turn on **two-factor authentication**: the most effective single thing you can do.
- Add a `SECURITY.md` that says how to report a vulnerability privately.
