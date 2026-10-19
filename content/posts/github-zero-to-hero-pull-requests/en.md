---
title: "GitHub from zero to hero: the GitHub flow and pull requests"
summary: "Part 2 of the GitHub guide: the GitHub flow step by step, a good pull request, reviewing with comments and suggestions, and the three ways to merge."
date: 2026-10-09
tags: [github, git]
series: { key: devops, order: 21 }
---

The recipe book is on GitHub since [part 1](en/posts/github-zero-to-hero/). This part changes it the way a team would, without ever breaking `main`.

## The GitHub flow

GitHub recommends a short loop, the **GitHub flow**:

![Six boxes in a row: create a branch, commit and push, open a pull request, review and discuss, merge the pull request, delete the branch. A dashed arrow from review back to commit and push says: changes requested, push more commits.](/images/github-zero-to-hero/github-flow.svg)

1. **Create a branch** from `main` with a short, descriptive name (`add-soup-recipe`). `main` stays untouched.
2. **Commit and push.** Small commits, each a complete, isolated change that can be reverted alone. Pushing regularly also backs up your work.
3. **Open a pull request** to ask for feedback. Unsure it's ready? Open a *draft* pull request.
4. **Review and discuss.** Answer comments by pushing more commits to the same branch; the pull request updates itself.
5. **Merge** once it's approved and the checks are green.
6. **Delete the branch.** The pull request and its history stay; only the label goes.

```bash
git switch -c add-soup-recipe
echo "# Soup" > soup.md
echo "Simmer for 30 minutes." >> soup.md
git add soup.md
git commit -m "Add soup recipe"
git push -u origin add-soup-recipe
```

(With `push.autoSetupRemote true` from the [Git guide](en/posts/git-zero-to-hero/), `-u` isn't needed.) The push output prints a link for opening a pull request, and the repository page shows a yellow **Compare & pull request** banner.

## Pull requests

A pull request (PR) is a conversation about a branch. It shows the diff between your branch and the target, lets people comment on specific lines, and collects the results of automated checks. A good PR has:

- **A clear title** that reads like a commit message: "Add soup recipe".
- **A description** that says *what* changed, *why*, and how to check it, written for a reader with no context. In three months that reader is you.
- **A link to the issue it solves.** Write `Closes #12` (or `Fixes`, `Resolves`) in the description, and merging closes issue 12 automatically. This only works when the PR targets the repository's default branch.
- **One purpose and a small size.** A 30-line PR gets a careful review. A 3,000-line PR gets "looks fine".

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

As the author, answer by pushing more commits, then resolve the conversations. When reviewing, criticize the code, not the person, say what you'd do instead, and do it quickly: a PR waiting for days gets stale. When reviewed, remember the reviewer sees your change for the first time: anything confusing to them is worth fixing, not defending.

To try someone else's PR on your machine:

```bash
gh pr checkout 42      # fetches the branch and switches to it
```

### Merging: three ways

When the PR is approved, the **Merge** button offers up to three methods (a repository owner can turn any of them off):

![The same pull request with commits C, D and E, shown three times. Merge commit keeps C, D and E and adds a merge commit M with two parents. Squash and merge replaces them with one commit S. Rebase and merge copies them onto main as C prime, D prime and E prime with no merge commit.](/images/github-zero-to-hero/merge-methods.svg)

- **Merge commit** keeps every commit of the branch and adds a merge commit. Full history, but a branchy graph.
- **Squash and merge** collapses the whole PR into one commit, so `main` gets one commit per PR.
- **Rebase and merge** replays each commit on top of `main` without a merge commit. A straight line, but the commits get new hashes (like [`git rebase`](en/posts/git-zero-to-hero-rebase/)).

Many teams pick squash: one PR, one commit, one clear message. Use what your team agreed on:

```bash
gh pr merge --squash --delete-branch
```

Then bring your local `main` up to date:

```bash
git switch main
git pull
git branch -d add-soup-recipe
```

**Settings → General** can delete head branches automatically after merge.
