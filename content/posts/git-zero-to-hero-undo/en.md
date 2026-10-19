---
title: "Git from zero to hero: undoing mistakes"
summary: "Part 3 of the Git guide: naming commits (HEAD~1, HEAD^2, HEAD@{2}), detached HEAD, and the right undo for each mistake: restore, amend, reset, revert and reflog."
date: 2026-10-09
tags: [git, cli]
series: { key: devops, order: 12 }
---

Every undo in Git names a commit, so this part starts with how to point at one, using the recipe book's history from [part 2](en/posts/git-zero-to-hero-history/).

## Pointing at commits

Anywhere Git wants a commit, you can give it any of these:

| You write | It means |
| --- | --- |
| `9c1d4e2` | a commit by its (short) hash |
| `main`, `pizza` | the commit a branch points at |
| `v1.0` | the commit a tag points at |
| `HEAD` | the commit you're on |
| `HEAD~1` (or `HEAD^`) | one commit before HEAD, its parent |
| `HEAD~3` | three commits back along the chain |
| `HEAD^2` | the second parent of a merge commit |
| `HEAD@{2}` | where HEAD was two moves ago (from the reflog) |

So `git diff HEAD~2 HEAD` compares now with two commits ago, and `git show main~1` shows the commit before the tip of `main`.

**Detached HEAD.** Normally HEAD points at a *branch*. Check out a commit directly, say with `git switch --detach 3f2a1b9`, and HEAD points straight at the commit. It's a fine place to look at old code, but commits you make there belong to no branch and are easy to lose. To keep them, run `git switch -c keep-this`. To leave, `git switch main`.

## Undoing mistakes

The old `git checkout` did most of these jobs, which confused everyone. Since Git 2.23, `git switch` moves between branches and `git restore` handles files. The right tool depends on *where* the mistake is.

**You edited a file and want the last committed version back:**

```bash
git restore pasta.md      # ⚠️ throws away your edits to this file
```

Add `--source=<commit>` to get the file as it was in an older commit.

**You staged the wrong file:**

```bash
git restore --staged todo.md
```

**You made a typo in the last commit message, or forgot a file:**

```bash
git add forgotten.md
git commit --amend        # replaces the last commit
```

**You want to undo the last commit but keep the work.** `git reset` moves the branch label back. Three modes decide what happens to the changes that were in that commit:

![A table with three rows: reset --soft moves main back and keeps the changes staged; reset --mixed moves main back and keeps the changes in the working directory unstaged; reset --hard moves main back and discards the changes.](/images/git-zero-to-hero/reset.svg)

```bash
git reset --soft HEAD~1    # undo the commit, changes stay staged
git reset HEAD~1           # same, changes stay unstaged (--mixed is the default)
git reset --hard HEAD~1    # ⚠️ undo the commit and delete the changes
```

**The commit is already pushed.** Don't rewrite shared history. Add a new commit that cancels the old one:

```bash
git revert 9c1d4e2
```

Rule of thumb: commits only on your computer may be rewritten (`reset`, `amend`, `rebase`); if anyone else might have them, use `revert`.

**You started working on `main` by mistake.** `git switch -c new-branch` creates a branch where you are, and your uncommitted changes come with you.

**You think you lost something.** Almost nothing is lost. `git reflog` lists every place HEAD has been, even after a hard reset, a rebase or deleting a branch:

```bash
git reflog
git switch -c rescue 9c1d4e2    # put a branch on the commit you thought was gone
```
