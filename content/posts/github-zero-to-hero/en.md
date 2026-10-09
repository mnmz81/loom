---
title: "GitHub from zero to hero"
summary: "A hands-on guide to GitHub with diagrams: repositories, SSH and the gh CLI, pull requests and reviews, issues, forks, Actions, Pages, branch protection and the habits that keep a team calm."
date: 2026-10-09
tags: [github, git, tutorial]
---

Git saves your project's history on your computer. GitHub is where that history goes to be shared, reviewed, tested and published. This guide continues the recipe book from [Git from zero to hero](en/posts/git-zero-to-hero/): we put it online, change it through a pull request, let a robot test it, and finally publish it as a website.

You don't need to know Git perfectly, but you should be comfortable with `git add`, `git commit` and branches. If those feel new, read that guide first and come back.

## What GitHub is (and what it adds to Git)

**Git** is the version control tool. It runs on your computer and needs no internet. **GitHub** hosts Git repositories in the cloud and adds tools around them for planning, reviewing, testing and deploying.

![On the left, your computer with a local repository holding commits A, B and C. On the right, GitHub with a remote repository holding the same commits. git push uploads from the computer to GitHub, and git fetch or git pull downloads. Below, GitHub adds issues, pull requests, Actions, Pages, projects and releases.](/images/github-zero-to-hero/git-vs-github.svg)

The repository itself (the commits) is plain Git. Everything else is GitHub's layer on top:

- **Issues** to track tasks, bugs and ideas.
- **Pull requests** to propose a change and have it reviewed before it lands.
- **Actions** to run tests and deployments automatically.
- **Pages** to host a static website straight from a repository.
- **Projects**, **Releases**, **Discussions** and a security toolbox around all of that.

GitHub isn't the only host: GitLab and Bitbucket do the same job with different names. The Git part works identically with all of them.

## Get started

### Create an account and a repository

Sign up at [github.com](https://github.com), then use **New repository** (the **+** menu at the top right). You'll choose:

- **Name:** `recipes`.
- **Visibility:** *public* (anyone can read it) or *private* (only people you invite). You can change it later.
- **Add a README:** yes. A **README** is a Markdown file shown on the repository's front page, and it's the first thing anyone reads.
- **.gitignore and license:** optional templates. A `.gitignore` keeps junk out of the repo. A license says what others may do with your code; without one, nobody else is formally allowed to reuse it.

### Connect your computer: SSH or HTTPS

To push, GitHub has to know it's you. GitHub no longer accepts your account password for Git operations over HTTPS. You have three good options:

1. **GitHub CLI (`gh`)** is the easiest. Install it from [cli.github.com](https://cli.github.com) (or `brew install gh`), then:

   ```bash
   gh auth login
   gh auth status
   ```

   It walks you through signing in with the browser and stores the credentials for Git.
2. **SSH key**, which I prefer because you set it up once and forget it:

   ```bash
   ssh-keygen -t ed25519 -C "dana@example.com"
   ```

   Press Enter to accept the default location, and choose a passphrase. This makes two files: a private key (`~/.ssh/id_ed25519`, never share it) and a public key (`~/.ssh/id_ed25519.pub`). Copy the contents of the public one, and in GitHub open **Settings → SSH and GPG keys → New SSH key** and paste it. Then test:

   ```bash
   ssh -T git@github.com
   ```

   ```plain text
   Hi dana! You've successfully authenticated, but GitHub does not provide shell access.
   ```

   That message is the success message. Repository URLs then look like `git@github.com:dana/recipes.git`.
3. **HTTPS with a personal access token**, which works anywhere but means managing a token. A credential helper (which `gh auth login` configures) keeps this painless.

### Put your project on GitHub

Two paths, depending on where the project starts.

**It exists on GitHub already.** Clone it:

```bash
git clone git@github.com:dana/recipes.git
cd recipes
```

**It exists only on your computer** (like our recipe book). Create an empty repository on GitHub without a README, then connect and push:

```bash
git remote add origin git@github.com:dana/recipes.git
git push -u origin main
```

The CLI does both steps in one go, from inside your project folder:

```bash
gh repo create recipes --public --source=. --push
```

Refresh the repository page and your files and full history are there.

## The GitHub flow

Teams need a routine that keeps `main` working while many people change things. GitHub's own recommendation is a short loop, called the **GitHub flow**:

![Six boxes in a row: create a branch, commit and push, open a pull request, review and discuss, merge the pull request, delete the branch. A dashed arrow from review back to commit and push says: changes requested, push more commits.](/images/github-zero-to-hero/github-flow.svg)

1. **Create a branch** from `main` with a short, descriptive name (`add-soup-recipe`). `main` stays untouched.
2. **Commit and push.** Small commits, each one a complete, isolated change, so any of them can be reverted alone. Push regularly: it backs up your work and lets others see it.
3. **Open a pull request** to ask for feedback. Unsure it's ready? Open a *draft* pull request.
4. **Review and discuss.** Answer comments by pushing more commits to the same branch. The pull request updates itself.
5. **Merge** once it's approved and the checks are green.
6. **Delete the branch.** The pull request and its history stay; only the label goes.

Let's walk through it for real.

```bash
git switch -c add-soup-recipe
echo "# Soup" > soup.md
echo "Simmer for 30 minutes." >> soup.md
git add soup.md
git commit -m "Add soup recipe"
git push -u origin add-soup-recipe
```

(With `push.autoSetupRemote true` from the Git guide, the `-u` isn't needed.) The push output prints a link for opening a pull request. GitHub also shows a yellow **Compare & pull request** banner on the repository page for a recently pushed branch.

## Pull requests

A pull request (PR) is a conversation about a branch. It shows the diff between your branch and the target, lets people comment on specific lines, and collects the results of automated checks.

A good PR has:

- **A clear title** that reads like a commit message: "Add soup recipe".
- **A description** that says *what* changed and *why*, and how to check it.
- **A link to the issue it solves.** Write `Closes #12` (or `Fixes`, `Resolves`) in the description, and merging closes issue 12 automatically. This only works when the PR targets the repository's default branch.
- **A small size.** A 30-line PR gets a careful review. A 3,000-line PR gets "looks fine".

From the terminal:

```bash
gh pr create --fill              # title and body from your commits
gh pr create --draft             # open as a draft, not ready for review
gh pr view --web                 # open it in the browser
gh pr status                     # PRs that involve you
```

### Reviewing

Reviewers open the **Files changed** tab and can:

- Click the `+` next to a line to **comment** on exactly that line.
- Write a **suggestion**: a comment containing a proposed replacement that the author applies with one click.
- Finish with one of three verdicts: **Comment**, **Approve**, or **Request changes**.

As the author, you answer by pushing more commits, then mark conversations as resolved. When you're reviewing someone else, criticize the code, not the person, and say what you'd do instead. When you're reviewed, remember the reviewer is looking at your change for the first time, so anything confusing to them is worth fixing, not defending.

To try someone else's PR on your machine:

```bash
gh pr checkout 42      # fetches the branch and switches to it
```

### Merging: three ways

When the PR is approved, the **Merge** button offers up to three methods (a repository owner can turn any of them off):

![The same pull request with commits C, D and E, shown three times. Merge commit keeps C, D and E and adds a merge commit M with two parents. Squash and merge replaces them with one commit S. Rebase and merge copies them onto main as C prime, D prime and E prime with no merge commit.](/images/github-zero-to-hero/merge-methods.svg)

- **Merge commit** keeps every commit of the branch and adds a merge commit. Full history, but a branchy graph.
- **Squash and merge** collapses the whole PR into one commit. The history of `main` stays short, with one commit per PR. The branch's intermediate commits aren't kept on `main`.
- **Rebase and merge** replays each commit on top of `main` without a merge commit. A straight line, but the commits get new hashes (the same effect as the `git rebase` from the Git guide).

Many teams pick squash: one PR, one commit, one clear message. Use whichever your team agreed on. From the CLI:

```bash
gh pr merge --squash --delete-branch
```

Afterward, bring your local `main` up to date:

```bash
git switch main
git pull
git branch -d add-soup-recipe
```

In the repository's **Settings → General** there's an option to delete head branches automatically after merge, which saves the cleanup.

## Issues

An **issue** is a note about something to do or something broken. Open one for a bug, a feature idea, or a question. A good issue says what you expected, what happened instead, and how to reproduce it.

Useful pieces:

- **Labels** (`bug`, `good first issue`) to sort and filter.
- **Assignees** for who's on it, and **milestones** for grouping issues toward a goal.
- **Mentions:** write `@dana` to notify a person, and `#42` to link to issue or PR 42.
- **Closing keywords:** a PR that says `Closes #42` links to the issue and closes it on merge.
- **Templates:** put Markdown or form files in `.github/ISSUE_TEMPLATE/` and GitHub offers them when someone opens an issue. A `pull_request_template.md` in `.github/` pre-fills PR descriptions the same way.

```bash
gh issue create --title "Soup recipe is missing salt" --body "Step 2 never mentions salt."
gh issue list
```

**Projects** turn issues and PRs into a board or table (To do, In progress, Done), and **Discussions** give a repository a place for open-ended questions that aren't tasks.

## Forks: contributing to someone else's project

You can't push to a repository you don't have write access to, which is the normal situation with open source. The answer is a **fork**: your own copy of the repository, on your account.

![Three boxes. upstream is the original project on GitHub. Your fork is your copy on GitHub, made with a Fork button from upstream. Your computer holds the local clone, cloned from the fork with git clone and pushed back to it with git push. A pull request goes from your fork to upstream, and git fetch upstream brings new upstream commits to your computer.](/images/github-zero-to-hero/fork-workflow.svg)

The routine:

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

Before contributing, read the project's `CONTRIBUTING.md` and look for issues labeled `good first issue`. Maintainers appreciate small, focused PRs that follow their rules.

## Actions: let GitHub run your checks

**GitHub Actions** runs automation in response to things that happen in your repository. Its building blocks:

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

Read it top to bottom: *on every pull request, and on pushes to `main`, start a fresh Ubuntu machine, check out the code, install Node 24, install dependencies and run the tests.* Open a PR, and a yellow dot turns into a green check or a red cross next to it. The **Actions** tab shows each run's logs.

```bash
gh run list --limit 5     # recent runs
gh run watch              # follow a run live
```

Things worth knowing:

- **Secrets:** store passwords and tokens in **Settings → Secrets and variables → Actions** and use them as `${{ secrets.MY_TOKEN }}`. Never write them in the YAML. GitHub hides secret values in logs, but you shouldn't test that.
- **Permissions:** the `permissions:` key limits what the automatic token may do. Start with `contents: read` and add only what a job needs.
- **Fork PRs** don't get your secrets, so a stranger's PR can't read them.
- **Pin versions** of actions (`@v5`), so a workflow doesn't change under you.
- Free usage has limits that depend on your plan and on whether the repository is public. Check the current pricing page before relying on heavy builds.

## Pages: publish a website from a repository

**GitHub Pages** serves static files (HTML, CSS, JS) for free at `https://<user>.github.io/<repo>/`. This blog is published that way.

There are two publishing sources, chosen in **Settings → Pages**:

- **From a branch:** Pages serves a folder (the root or `/docs`) of a branch you pick. Simplest for hand-written HTML or Jekyll sites.
- **From GitHub Actions:** a workflow builds the site however you like and uploads the result. Best when there's a build step (this blog is an Angular app that is built, tested and pre-rendered first).

The Actions route needs a workflow that builds, uploads the output as a Pages artifact, and deploys it. The core of this blog's deploy workflow:

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

Every merge to `main` rebuilds and republishes the site, so publishing becomes "merge a PR". Two gotchas: if the site is served from `/<repo>/` rather than a custom domain, your links need the right base path, and pushes made by a workflow with the default `GITHUB_TOKEN` don't trigger another Pages build.

## Protecting `main`

Once other people are involved, you want `main` to be hard to break. In **Settings → Branches** (or the newer **Rulesets**) you can protect a branch. Among the options:

- **Require a pull request** with a set number of approvals before merging.
- **Require status checks** (your Actions workflow) to pass.
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

The last matching line wins. Combined with "require review from code owners", it makes sure the right person always looks at risky files.

## Releases and tags

A **tag** names one commit, and a **release** is a tag with notes and downloadable files, shown on the repository's front page.

```bash
git tag -a v1.0 -m "First release"
git push --tags
gh release create v1.0 --generate-notes
```

`--generate-notes` builds the changelog from the merged PRs since the last release, which is one more reason to give PRs good titles. Versions like `v1.4.2` usually follow [semantic versioning](https://semver.org): bump the first number for breaking changes, the second for new features, the third for fixes.

## Keeping a repository safe

- **Never commit secrets.** If a token reaches a commit, treat it as leaked even after you delete it: revoke it and make a new one first, and clean the history second. GitHub's **secret scanning** can warn you, and on supported secrets block the push.
- **Dependabot** opens PRs that update outdated or vulnerable dependencies. Turn it on in the repository's security settings, or add a `.github/dependabot.yml` for regular version updates.
- **Code scanning** (CodeQL) looks for common vulnerabilities in your code on each PR.
- Turn on **two-factor authentication** for your account. It's the most effective single thing you can do.
- Add a `SECURITY.md` that says how to report a vulnerability privately.

## Codespaces and Copilot

Two optional extras you'll hear about:

- **Codespaces** gives you a development environment in the cloud, opened in the browser or VS Code, with the repository and its tools already set up. Handy for onboarding or a quick fix from a borrowed laptop. Press `.` on any repository page for the lighter, edit-only web editor.
- **GitHub Copilot** is GitHub's AI assistant. It completes code, answers questions about a repository, and can take on tasks from an issue and open a PR for you to review. Plans and limits change often, so check GitHub's pricing page rather than trusting a blog post (including this one). Whoever uses it, the review rule stays the same: you merge only what you've understood.

## The `gh` cheat sheet

The browser is fine, but these cover a day's work from the terminal:

| I want to... | Command |
|---|---|
| Sign in | `gh auth login` |
| Create a repo from this folder and push | `gh repo create <name> --public --source=. --push` |
| Fork a repo and clone it | `gh repo fork <owner>/<repo> --clone` |
| Open a PR | `gh pr create --fill` (add `--draft` if not ready) |
| See PRs that involve me | `gh pr status` |
| Try a PR locally | `gh pr checkout <number>` |
| Merge a PR and delete its branch | `gh pr merge --squash --delete-branch` |
| Open an issue | `gh issue create --title "..." --body "..."` |
| Watch the latest CI run | `gh run watch` |
| Open the repo in the browser | `gh browse` |

`gh <command> --help` lists every flag.

## Habits that keep a team calm

- **One branch, one purpose, one PR.** Mixed changes are hard to review and hard to revert.
- **Never work directly on `main`.** Protect it, so you can't.
- **Write the PR description for a reader who has no context.** It will be you in three months.
- **Review quickly.** A PR waiting for days gets stale and conflicts pile up. Pull often from `main`.
- **Let the robot be strict** (tests, lint, type checks) so humans can talk about design.
- **Small and frequent beats big and rare**, for commits, PRs and releases.
- **Don't force-push to shared branches.** If you rebased your own PR branch, `--force-with-lease` is the safe form.

## Glossary

- **Repository (repo):** a project and its history, hosted on GitHub.
- **Remote / origin:** the hosted copy; `origin` is the default nickname.
- **Clone:** download a repository with its full history.
- **Fork:** your own GitHub copy of someone else's repository.
- **Upstream:** the original repository you forked from.
- **Pull request (PR):** a proposal to merge one branch into another, with discussion and checks.
- **Review:** comments and a verdict (approve, request changes) on a PR.
- **Issue:** a tracked task, bug or idea.
- **Draft PR:** a PR that signals "not ready to merge".
- **Merge methods:** merge commit, squash and merge, rebase and merge.
- **Branch protection / ruleset:** rules a branch must satisfy before changes land.
- **CODEOWNERS:** a file mapping paths to the people who must review them.
- **Workflow:** an Actions YAML file made of jobs and steps.
- **Runner:** the machine that runs a job.
- **Secret:** an encrypted value (a token, a password) available to workflows.
- **Pages:** free static site hosting from a repository.
- **Release:** a tag plus notes and files.

## Where to go next

You now know the loop: branch, commit, push, pull request, review, merge, with a robot checking your work and a website that rebuilds itself. The best way to make it stick is to do it once for real: fork a small open-source project, fix a typo in its docs, and open a PR. For the Git side of everything here, see [Git from zero to hero](en/posts/git-zero-to-hero/) and my [Git cheat sheet](en/posts/git-commands/). GitHub's own [Docs](https://docs.github.com) and the free interactive courses at [skills.github.com](https://skills.github.com) are good next steps.
